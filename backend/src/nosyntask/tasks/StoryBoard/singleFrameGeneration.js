/**
 * 分镜单帧生成处理器（无动作镜头，仅生成首帧）
 * 
 * 流程：
 * 1. 查询分镜数据，获取角色列表和场景名称
 * 2. 查询角色正面图 URL + 场景图 URL，拼接为 imageUrls 参考数组
 *    （多角色镜头阻止）
 * 3. 如果有上一镜头尾帧（prevEndFrameUrl），加入参考图列表以保持连续性
 * 4. 调用文本模型，根据镜头描述 + 上一镜头上下文生成帧提示词
 * 5. 以 imageUrls + 提示词 调用图片模型生成单帧，保存到数据库
 * 
 * input:  { storyboardId, description, imageModel, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene }
 * output: { firstFrameUrl, promptUsed, model }
 */

const { execute, queryOne, queryAll } = require('../../../dbHelper');
const { downloadAndStore } = require('../../../utils/fileStorage');
const baseTextModelCall = require('../base/baseTextModelCall');
const imageGeneration = require('../base/imageGeneration');
const { requireVisualStyle } = require('../../../utils/getProjectStyle');
const { generateUpdatedSceneImage, queryActiveSceneUrl } = require('./sceneRefUtils');

/**
 * 从分镜数据中收集参考图 URL 数组（角色正面图 + 场景图）
 */
async function collectReferenceImages(storyboard, variables) {
  const storyboardId = storyboard.id;
  const characterNames = variables.characters || [];
  const location = variables.location || '';
  const shotType = variables.shotType || '';
  const imageUrls = [];

  function assertNonEmptyString(value, fieldName, entityLabel) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${entityLabel}字段不完整: ${fieldName} 不能为空`);
    }
  }

  // 校验：多角色镜头阻止
  if (characterNames.length > 1) {
    throw new Error(`当前仅支持单角色镜头，该镜头包含 ${characterNames.length} 个角色: ${characterNames.join('、')}。请拆分镜头或手动处理。`);
  }

  if (!location || String(location).trim() === '') {
    throw new Error('该镜头未指定场景：帧生成要求必须提供场景 location');
  }

  // 通过关联表查询角色（含三视图 URL）
  let characterName = null;
  let characterInfo = null;
  if (characterNames.length === 1) {
    characterName = characterNames[0];
    const linkedChar = await queryOne(
      `SELECT c.name, c.description, c.appearance, c.personality,
              c.image_url, c.front_view_url, c.side_view_url, c.back_view_url
       FROM storyboard_characters sc
       JOIN characters c ON sc.character_id = c.id
       WHERE sc.storyboard_id = ? AND c.name = ?`,
      [storyboardId, characterName]
    );
    if (!linkedChar) {
      throw new Error(`角色「${characterName}」未与该分镜建立关联。请先运行智能分镜生成以建立资源关联。`);
    }
    assertNonEmptyString(linkedChar.description, 'description', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.appearance, 'appearance', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.personality, 'personality', `角色「${characterName}」`);
    assertNonEmptyString(linkedChar.image_url, 'image_url', `角色「${characterName}」`);

    characterInfo = {
      name: linkedChar.name,
      appearance: linkedChar.appearance,
      description: linkedChar.description,
      personality: linkedChar.personality
    };

    imageUrls.push(linkedChar.image_url);
    console.log(`[SingleFrameGen] 关联角色「${characterName}」正面图:`, linkedChar.image_url);

    // 根据镜头类型智能加入额外视图参考图
    const shotLower = shotType.toLowerCase();
    if (linkedChar.side_view_url && (shotLower.includes('侧') || shotLower.includes('side'))) {
      imageUrls.push(linkedChar.side_view_url);
      console.log(`[SingleFrameGen] 侧面镜头，加入侧面视图参考:`, linkedChar.side_view_url);
    }
    if (linkedChar.back_view_url && (shotLower.includes('背') || shotLower.includes('back') || shotLower.includes('rear'))) {
      imageUrls.push(linkedChar.back_view_url);
      console.log(`[SingleFrameGen] 背面镜头，加入背面视图参考:`, linkedChar.back_view_url);
    }
  }

  // 通过关联表查询场景
  const linkedScene = await queryOne(
    `SELECT s.name, s.description, s.environment, s.lighting, s.mood, s.image_url
     FROM storyboard_scenes ss
     JOIN scenes s ON ss.scene_id = s.id
     WHERE ss.storyboard_id = ? AND s.name = ?`,
    [storyboardId, location]
  );
  if (!linkedScene) {
    throw new Error(`场景「${location}」未与该分镜建立关联。请先运行智能分镜生成以建立资源关联。`);
  }
  assertNonEmptyString(linkedScene.description, 'description', `场景「${location}」`);
  assertNonEmptyString(linkedScene.environment, 'environment', `场景「${location}」`);
  assertNonEmptyString(linkedScene.lighting, 'lighting', `场景「${location}」`);
  assertNonEmptyString(linkedScene.mood, 'mood', `场景「${location}」`);
  assertNonEmptyString(linkedScene.image_url, 'image_url', `场景「${location}」`);
  imageUrls.push(linkedScene.image_url);
  console.log(`[SingleFrameGen] 关联场景「${location}」图片:`, linkedScene.image_url);

  const sceneInfo = {
    name: linkedScene.name,
    description: linkedScene.description,
    environment: linkedScene.environment,
    lighting: linkedScene.lighting,
    mood: linkedScene.mood
  };

  return { imageUrls, characterName, characterInfo, location, sceneInfo };
}

async function handleSingleFrameGeneration(inputParams, onProgress) {
  const { storyboardId, description, imageModel: modelName, textModel, width, height, prevEndFrameUrl, prevDescription, isFirstScene, sceneState: inputSceneState, environmentChange: inputEnvironmentChange, activeSceneUrl } = inputParams;

  if (!storyboardId) {
    throw new Error('缺少必要参数: storyboardId');
  }

  if (!modelName) {
    throw new Error('imageModel 参数是必需的');
  }

  console.log('[SingleFrameGen] 开始生成单帧，storyboardId:', storyboardId);
  if (onProgress) onProgress(5);

  // 1. 查询分镜数据
  const storyboard = await queryOne(
    'SELECT * FROM storyboards WHERE id = ?',
    [storyboardId]
  );
  if (!storyboard) {
    throw new Error(`分镜 ${storyboardId} 不存在`);
  }

  // 项目视觉风格（必填，未设置则报错）
  const visualStyle = await requireVisualStyle(storyboard.project_id);

  let variables = {};
  try {
    variables = typeof storyboard.variables_json === 'string'
      ? JSON.parse(storyboard.variables_json || '{}')
      : (storyboard.variables_json || {});
  } catch (e) {
    variables = {};
  }

  const desc = description || storyboard.prompt_template || '';

  // 2. 收集参考图（角色正面图 + 场景图）
  if (onProgress) onProgress(10);
  const { imageUrls, characterName, characterInfo, location, sceneInfo } = await collectReferenceImages(storyboard, variables);

  // 场景状态（优先用调用方传入，否则从 variables_json 读取）
  const sceneState = inputSceneState || variables.scene_state || 'normal';
  const environmentChange = inputEnvironmentChange || variables.environment_change || 'none';

  // 动态参考图决策：弹出原始场景图，根据 sceneState 决定是否/如何加回
  const originalSceneUrl = imageUrls.pop(); // 最后一个是场景图

  switch (sceneState) {
    case 'modified':
      console.log(`[SingleFrameGen] 场景状态: modified，不传原始场景图，依赖提示词描述变化: ${environmentChange}`);
      break;
    case 'inherit': {
      let resolvedActiveUrl = activeSceneUrl;
      if (!resolvedActiveUrl) {
        resolvedActiveUrl = await queryActiveSceneUrl(storyboard.script_id, storyboard.idx, variables.location || location);
      }
      if (resolvedActiveUrl) {
        imageUrls.push(resolvedActiveUrl);
        console.log(`[SingleFrameGen] 场景状态: inherit，使用滚动更新场景图: ${resolvedActiveUrl}`);
      } else {
        imageUrls.push(originalSceneUrl);
        console.log('[SingleFrameGen] 场景状态: inherit，无滚动图，fallback 原始场景图');
      }
      break;
    }
    default:
      imageUrls.push(originalSceneUrl);
      break;
  }

  // 2.5 自动查询上一镜头的尾帧（如果调用方没有传入）
  let resolvedPrevEndFrameUrl = prevEndFrameUrl || null;
  let resolvedPrevDescription = prevDescription || null;
  let resolvedPrevEndState = null;
  let resolvedIsFirstScene = isFirstScene;

  if (resolvedIsFirstScene === undefined || resolvedIsFirstScene === null) {
    const scriptId = storyboard.script_id;
    const currentIdx = storyboard.idx;
    if (scriptId != null && currentIdx != null && currentIdx > 0) {
      resolvedIsFirstScene = false;
    } else {
      resolvedIsFirstScene = true;
    }
  }

  if (!resolvedIsFirstScene && !resolvedPrevEndFrameUrl) {
    const scriptId = storyboard.script_id;
    const currentIdx = storyboard.idx;
    if (scriptId != null && currentIdx != null) {
      const prevSb = await queryOne(
        'SELECT id, prompt_template, variables_json, first_frame_url, last_frame_url FROM storyboards WHERE script_id = ? AND idx = ?',
        [scriptId, currentIdx - 1]
      );
      if (prevSb) {
        let prevVars = {};
        try {
          prevVars = typeof prevSb.variables_json === 'string'
            ? JSON.parse(prevSb.variables_json || '{}')
            : (prevSb.variables_json || {});
        } catch (e) { prevVars = {}; }
        const prevHasAction = prevVars.hasAction || false;
        resolvedPrevEndFrameUrl = (prevHasAction && prevSb.last_frame_url)
          ? prevSb.last_frame_url
          : (prevSb.first_frame_url || null);
        resolvedPrevDescription = prevSb.prompt_template || null;
        resolvedPrevEndState = prevVars.endState || null;
        console.log('[SingleFrameGen] 自动查询到上一镜头尾帧:', resolvedPrevEndFrameUrl);
        if (resolvedPrevEndState) console.log('[SingleFrameGen] 上一镜头 endState:', resolvedPrevEndState);
      }
    }
  }

  if (!resolvedIsFirstScene) {
    if (resolvedPrevEndFrameUrl) {
      imageUrls.unshift(resolvedPrevEndFrameUrl);
      console.log('[SingleFrameGen] 加入上一镜头尾帧作为参考:', resolvedPrevEndFrameUrl);
    } else {
      throw new Error('非首镜头缺少上一镜头的尾帧参考图（上一镜头未生成帧图片），无法保证镜头连续性。请先确保上一镜头已生成帧图片。');
    }
  }
  console.log('[SingleFrameGen] 参考图数组:', imageUrls);

  // 3. 生成帧提示词
  if (onProgress) onProgress(20);
  let promptUsed = desc;

  if (textModel) {
    console.log('[SingleFrameGen] 使用文本模型生成帧提示词...');

    // 角色信息：有角色时提供详细外貌，无角色时明确排除
    let charBlock;
    let charConstraint;
    if (characterInfo) {
      charBlock = `【角色信息】
角色名称: ${characterInfo.name}
外貌特征: ${characterInfo.appearance}
角色描述: ${characterInfo.description}
（已提供角色参考图，角色的发型、发色、瞳色、服装款式和颜色、体型比例、配饰必须与参考图一致。但角色的姿势、位置、朝向、表情以文字描述和上一帧尾帧为准，不要从角色立绘中复制姿态。）`;
      charConstraint = `- 角色外貌、服装、发型必须与参考图完全一致，不得自行创造角色形象
- 严禁出现参考图中不存在的额外人物
- 角色身体结构必须正常：头部在肩膀上方，四肢正常连接，禁止畸变`;
    } else {
      charBlock = '【无角色镜头】这个镜头没有任何角色参与';
      charConstraint = `- 画面中绝对不能出现任何人物、人影或人形轮廓
- 仅描述场景环境、自然元素、物体`;
    }

    // 场景信息
    // 场景约束根据 sceneState 动态调整
    let sceneConstraint = '（已提供场景参考图，画面场景必须与参考图一致）';
    if (sceneState === 'modified') {
      sceneConstraint = `（⚠️ 本镜头环境正在发生变化：${environmentChange || 'unknown change'}。不要参考原始场景图的物品状态，以上一帧尾帧为基准，在此基础上呈现上述变化）`;
    } else if (sceneState === 'inherit') {
      sceneConstraint = `（已提供更新后的场景参考图，场景已发生过变化：${environmentChange || ''}。画面必须保持这些变化，不要恢复到原始状态）`;
    }
    const sceneBlock = sceneInfo
      ? `【场景信息】
场景名称: ${sceneInfo.name}
场景描述: ${sceneInfo.description}
环境: ${sceneInfo.environment}
光照: ${sceneInfo.lighting}
氛围: ${sceneInfo.mood}
${sceneConstraint}`
      : '';

    const shotInfo = variables.shotType ? `镜头类型: ${variables.shotType}` : '';
    const emotionInfo = variables.emotion ? `情绪/氛围: ${variables.emotion}` : '';
    const styleInfo = visualStyle ? `视觉风格: ${visualStyle}` : '';
    const prevEndStateBlock = resolvedPrevEndState
      ? `【上一镜头结束状态 - 必须衔接】\n${resolvedPrevEndState}\n（当前画面的角色姿势、位置、朝向必须与上述状态完全一致，不得出现任何跳变）`
      : '';
    const prevContext = resolvedPrevDescription
      ? `上一个镜头描述：${resolvedPrevDescription}\n注意：当前画面需要自然衔接上一个镜头的结束状态，保持角色、场景、光线的连续性。`
      : '';
    const dialogueBlock = variables.dialogue ? `【角色对白】"${variables.dialogue}"（请根据对白内容调整角色的面部表情和嘴型状态）` : '';
    const extraInfo = [charBlock, sceneBlock, shotInfo, emotionInfo, styleInfo, prevEndStateBlock, dialogueBlock, charConstraint, prevContext].filter(Boolean).join('\n');

    const promptGenerationResult = await baseTextModelCall({
      prompt: `你是一个专业的图片生成提示词专家。

请根据以下分镜描述，生成一个适合图片生成的详细提示词：

分镜描述：${desc}
${extraInfo}

要求：
1. 提示词要详细描述画面内容、构图、光线、氛围
2. 【细节保留】角色的每一个外貌细节都必须原样写入提示词：发色、发型、瞳色、服装款式、服装颜色、配饰等，不得省略或概括。例如"黑色双马尾、红色水手服、蓝色百褶裙"必须逐项写出，不能简化为"a girl in school uniform"
3. 【细节保留】场景的每一个环境细节都必须原样写入提示词：建筑结构、物品摆设、光源方向、色调等，不得省略
4. 镜头类型决定构图（如特写聚焦面部，远景展示全貌）
5. 如果有上一镜头信息，确保画面与上一镜头自然衔接
6. 如果有视觉风格要求，提示词必须体现该风格特征
7. 严格遵守角色约束：有角色时与参考图一致，无角色时绝对不能出现人物
8. 只输出英文提示词，不要其他解释

提示词：`,
      textModel,
      maxTokens: 500,
      temperature: 0.7
    });

    promptUsed = promptGenerationResult.content || desc;
    console.log('[SingleFrameGen] 生成的提示词:', promptUsed.substring(0, 100) + '...');
  } else {
    const prevHint = resolvedPrevDescription ? `，承接上一镜头「${resolvedPrevDescription}」的结束状态` : '';
    promptUsed = `${desc}${prevHint}`;
    console.log('[SingleFrameGen] 无文本模型，使用拼接提示词');
  }

  // 4. 生成首帧图片
  if (onProgress) onProgress(50);
  console.log('[SingleFrameGen] 生成首帧图片...');

  const imageResult = await imageGeneration({
    prompt: promptUsed,
    imageModel: modelName,
    width: width || 1024,
    height: height || 576,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined
  });

  const firstFrameUrl = imageResult.image_url;
  console.log('[SingleFrameGen] 首帧生成完成:', firstFrameUrl);

  // 持久化首帧到 MinIO
  const persistedUrl = await downloadAndStore(
    firstFrameUrl,
    `images/frames/${storyboardId}/first_frame`,
    { fallbackExt: '.png' }
  );

  // 保存到数据库
  if (onProgress) onProgress(90);
  console.log('[SingleFrameGen] 保存首帧到数据库...');

  await execute(
    'UPDATE storyboards SET first_frame_url = ? WHERE id = ?',
    [persistedUrl, storyboardId]
  );

  // modified 镜头：自动生成更新版空镜场景图并存入 DB（供后续 inherit 镜头使用）
  if (sceneState === 'modified' && (variables.location || location)) {
    try {
      await generateUpdatedSceneImage({
        storyboardId,
        location: variables.location || location,
        environmentChange,
        imageModel: modelName,
        textModel,
        width, height
      });
    } catch (e) {
      console.warn('[SingleFrameGen] 更新版场景图生成失败，不影响帧生成结果:', e.message);
    }
  }

  if (onProgress) onProgress(100);
  console.log('[SingleFrameGen] 单帧生成完成');

  return {
    firstFrameUrl: persistedUrl,
    promptUsed,
    model: imageResult.model || modelName
  };
}

module.exports = handleSingleFrameGeneration;
