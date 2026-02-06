/**
 * 角色三视图生成任务
 * 生成角色的正面、侧面、背面三视图
 * 
 * input: {
 *   characterId: number,
 *   characterName: string,
 *   appearance: string,
 *   personality: string,
 *   description: string,
 *   style: string,
 *   modelName: string
 * }
 * 
 * output: {
 *   frontViewUrl: string,
 *   sideViewUrl: string,
 *   backViewUrl: string,
 *   imageUrl: string (same as frontViewUrl)
 * }
 */

const { getImageModels, getTextModels } = require('../../../aiModelService');
const handleImageGeneration = require('../base/imageGeneration');
const handleBaseTextModelCall = require('../base/baseTextModelCall');

/**
 * 使用 AI 生成视图提示词
 */
async function generateViewPrompt(view, characterName, appearance, personality, description, style, textModel) {
  const viewDescriptions = {
    front: '正面视图，角色面向镜头，全身或半身像',
    side: '侧面视图，角色侧身90度，展示侧面轮廓',
    back: '背面视图，角色背对镜头，展示背部细节'
  };

  const viewDesc = viewDescriptions[view] || viewDescriptions.front;

  console.log(`[CharacterViews] 使用 AI 生成${viewDesc}提示词...`);

  // 构建完整的提示词
  const fullPrompt = `你是一个专业的图片生成提示词专家。你的任务是根据角色信息生成高质量的图片生成提示词（用于 Stable Diffusion、Midjourney 等 AI 绘图工具）。

要求：
1. 提示词必须用英文输出
2. 使用逗号分隔的关键词格式
3. 包含：角色特征、视角、风格、画质描述
4. 避免使用否定词（如 no, without 等）
5. 简洁明确，突出重点特征
6. 长度控制在 100-150 个单词

示例格式：
character name, detailed appearance, specific pose, art style, high quality, detailed, professional lighting

---

请为以下角色生成${viewDesc}的图片提示词：

角色名称：${characterName || '未命名角色'}
外貌特征：${appearance || '无'}
性格特点：${personality || '无'}
详细描述：${description || '无'}
风格要求：${style || '动漫风格'}
视图类型：${viewDesc}

请直接输出英文提示词，不要包含任何解释或其他内容。`;

  // 调用基础文本模型
  const response = await handleBaseTextModelCall({
    prompt: fullPrompt,
    modelName: textModel,
    maxTokens: 500,
    temperature: 0.7
  });

  console.log(`[CharacterViews] baseTextModelCall 响应:`, JSON.stringify(response).substring(0, 500));

  // 提取生成的提示词
  // 注意：response 可能是 { content: "..." } 或直接是字符串
  let prompt = '';
  
  if (typeof response === 'string') {
    prompt = response;
  } else if (response && response.content) {
    prompt = response.content;
  } else if (response && response.text) {
    prompt = response.text;
  } else if (response && response.message) {
    prompt = response.message;
  } else if (response && response.taskId) {
    // 如果返回的是 taskId，说明调用了错误的模型（图片模型而非文本模型）
    throw new Error(`错误：调用了图片生成模型而非文本模型。请检查模型配置。响应: ${JSON.stringify(response).substring(0, 200)}`);
  }
  
  if (!prompt) {
    console.error(`[CharacterViews] 无法提取提示词，完整响应:`, JSON.stringify(response));
    throw new Error(`AI 响应中没有内容。响应类型: ${typeof response}, 响应: ${JSON.stringify(response).substring(0, 200)}`);
  }

  // 清理提示词
  prompt = String(prompt)
    .replace(/^["']|["']$/g, '') // 移除首尾引号
    .replace(/\n+/g, ', ') // 将换行替换为逗号
    .replace(/,\s*,/g, ',') // 移除重复逗号
    .trim();

  console.log(`[CharacterViews] ✅ ${viewDesc}提示词生成完成:`, prompt.substring(0, 100) + '...');

  return prompt;
}

/**
 * 主处理函数
 */
async function handleCharacterViewsGeneration(inputParams, onProgress) {
  const {
    characterId,
    characterName,
    appearance = '',
    personality = '',
    description = '',
    style = '动漫风格',
    modelName,
    width = 512,
    height = 768
  } = inputParams;

  console.log('[CharacterViews] 开始生成三视图:', {
    characterId,
    characterName,
    modelName,
    style
  });

  // 选择可用的图片生成模型
  let imageModel = modelName;
  if (!imageModel) {
    const models = await getImageModels();
    if (!models || models.length === 0) {
      throw new Error('没有可用的图片生成模型');
    }
    imageModel = models[0].name;
  }

  // 选择可用的文本模型（用于生成提示词）
  let textModel = null;
  const textModels = await getTextModels();
  if (textModels && textModels.length > 0) {
    textModel = textModels[0].name;
  }

  console.log('[CharacterViews] 使用的模型:', {
    imageModel,
    textModel
  });

  if (onProgress) onProgress(5);

  // 生成正面视图
  console.log('[CharacterViews] 生成正面视图...');
  const frontPrompt = await generateViewPrompt('front', characterName, appearance, personality, description, style, textModel);
  const frontResult = await handleImageGeneration({
    prompt: frontPrompt,
    modelName: imageModel,
    width,
    height
  }, (progress) => {
    if (onProgress) onProgress(5 + progress * 0.2); // 5% -> 25%
  });
  const frontViewUrl = frontResult.image_url;
  console.log('[CharacterViews] ✅ 正面视图生成完成');
  console.log('[CharacterViews] DEBUG - 正面视图结果:', {
    prompt: frontPrompt.substring(0, 150) + '...',
    imageUrl: frontViewUrl,
    imageModel,
    textModel,
    dimensions: `${width}x${height}`
  });

  // 立即保存正面视图到数据库
  if (characterId && frontViewUrl) {
    const { execute } = require('../../../dbHelper');
    await execute(
      'UPDATE characters SET front_view_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [frontViewUrl, characterId]
    );
    console.log('[CharacterViews] ✅ 正面视图已保存到数据库');
  }

  if (onProgress) onProgress(30);

  // 生成侧面视图
  console.log('[CharacterViews] 生成侧面视图...');
  const sidePrompt = await generateViewPrompt('side', characterName, appearance, personality, description, style, textModel);
  const sideResult = await handleImageGeneration({
    prompt: sidePrompt,
    modelName: imageModel,
    width,
    height
  }, (progress) => {
    if (onProgress) onProgress(30 + progress * 0.25); // 30% -> 55%
  });
  const sideViewUrl = sideResult.image_url;
  console.log('[CharacterViews] ✅ 侧面视图生成完成');
  console.log('[CharacterViews] DEBUG - 侧面视图结果:', {
    prompt: sidePrompt.substring(0, 150) + '...',
    imageUrl: sideViewUrl,
    imageModel,
    dimensions: `${width}x${height}`
  });

  // 立即保存侧面视图到数据库
  if (characterId && sideViewUrl) {
    const { execute } = require('../../../dbHelper');
    await execute(
      'UPDATE characters SET side_view_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sideViewUrl, characterId]
    );
    console.log('[CharacterViews] ✅ 侧面视图已保存到数据库');
  }

  if (onProgress) onProgress(60);

  // 生成背面视图
  console.log('[CharacterViews] 生成背面视图...');
  const backPrompt = await generateViewPrompt('back', characterName, appearance, personality, description, style, textModel);
  const backResult = await handleImageGeneration({
    prompt: backPrompt,
    modelName: imageModel,
    width,
    height
  }, (progress) => {
    if (onProgress) onProgress(60 + progress * 0.25); // 60% -> 85%
  });
  const backViewUrl = backResult.image_url;
  console.log('[CharacterViews] ✅ 背面视图生成完成');
  console.log('[CharacterViews] DEBUG - 背面视图结果:', {
    prompt: backPrompt.substring(0, 150) + '...',
    imageUrl: backViewUrl,
    imageModel,
    dimensions: `${width}x${height}`
  });

  // 立即保存背面视图到数据库
  if (characterId && backViewUrl) {
    const { execute } = require('../../../dbHelper');
    await execute(
      'UPDATE characters SET back_view_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [backViewUrl, characterId]
    );
    console.log('[CharacterViews] ✅ 背面视图已保存到数据库');
  }

  if (onProgress) onProgress(90);

  // 将正面视图同时保存为主图片 (image_url)，并标记生成完成
  if (characterId && frontViewUrl) {
    const { execute } = require('../../../dbHelper');
    await execute(
      `UPDATE characters 
       SET image_url = ?, generation_status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [frontViewUrl, characterId]
    );
    console.log('[CharacterViews] ✅ 正面视图已保存为主图片 (image_url)');
  }

  if (onProgress) onProgress(95);

  if (onProgress) onProgress(100);

  const finalResult = {
    frontViewUrl,
    sideViewUrl,
    backViewUrl,
    imageUrl: frontViewUrl, // 主图片使用正面视图
    imageModel,
    textModel
  };

  console.log('[CharacterViews] ✅ 三视图生成完成');
  console.log('[CharacterViews] DEBUG - 最终输出:', JSON.stringify(finalResult, null, 2));

  return finalResult;
}

module.exports = handleCharacterViewsGeneration;
