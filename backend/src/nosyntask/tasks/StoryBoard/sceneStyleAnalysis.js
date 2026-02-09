/**
 * 场景风格关联分析处理器
 * 分析目标场景与同项目其他场景的关联性，找出风格参考图
 * 
 * input:  { sceneName, description, environment, allScenes, textModel }
 * output: { referenceImageUrl, styleDescription, relatedScenes }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');

async function handleSceneStyleAnalysis(inputParams, onProgress) {
  const { sceneName, description, environment, allScenes, textModel } = inputParams;

  if (!textModel) {
    throw new Error('textModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  // 找出已有图片的场景
  const scenesWithImage = (allScenes || []).filter(s => s.hasImage && s.imageUrl && s.name !== sceneName);

  // 如果没有任何已有图片的场景，直接跳过分析
  if (scenesWithImage.length === 0) {
    console.log('[SceneStyleAnalysis] 没有已有图片的场景可参考，跳过分析');
    if (onProgress) onProgress(100);
    return {
      referenceImageUrl: null,
      styleDescription: null,
      relatedScenes: []
    };
  }

  // 构建场景列表文本
  const sceneListText = (allScenes || []).map(s => {
    const hasImg = s.hasImage ? '✅已有图片' : '❌无图片';
    return `[场景名称: ${s.name} | 描述: ${s.description || '无'} | 环境: ${s.environment || '无'} | ${hasImg}]`;
  }).join('\n');

  const fullPrompt = `你是一个专业的场景分析助手。你的任务是分析目标场景与其他场景的关联性。

目标场景：
- 名称：${sceneName}
- 描述：${description || '无'}
- 环境：${environment || '无'}

同项目所有场景列表：
${sceneListText}

请分析目标场景"${sceneName}"与哪些场景最相关（如同一建筑的内外、同一地点的不同区域等）。

**重要：必须输出严格的 JSON 格式！**

请严格按以下 JSON 格式返回：
{
  "relatedScenes": ["相关场景名称1", "相关场景名称2"],
  "reason": "关联原因简述",
  "styleDescription": "基于关联场景，描述目标场景应保持的视觉风格一致性要点（如建筑风格、色调、时代感等），用英文输出，50-80词"
}

注意：
1. relatedScenes 只填写与目标场景有明确空间/环境关联的场景名称
2. 如果没有关联场景，relatedScenes 填空数组 []
3. styleDescription 必须用英文，用于图片生成提示词`;

  if (onProgress) onProgress(30);

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel,
    maxTokens: 500,
    temperature: 0.3
  });

  if (onProgress) onProgress(70);

  // 解析结果
  let analysis = { relatedScenes: [], reason: '', styleDescription: '' };
  try {
    const { washForJSON } = require('../../../utils/washBody');
    const parsed = washForJSON(result.content);
    if (parsed) {
      analysis = parsed;
    }
  } catch (e) {
    console.warn('[SceneStyleAnalysis] 解析失败，使用默认值:', e.message);
  }

  console.log('[SceneStyleAnalysis] 分析结果:', {
    sceneName,
    relatedScenes: analysis.relatedScenes,
    reason: analysis.reason,
    hasStyleDesc: !!analysis.styleDescription
  });

  // 从关联场景中找参考图（优先取第一个有图的关联场景）
  let referenceImageUrl = null;
  const relatedNames = analysis.relatedScenes || [];
  for (const name of relatedNames) {
    const matched = scenesWithImage.find(s => s.name === name);
    if (matched) {
      referenceImageUrl = matched.imageUrl;
      console.log('[SceneStyleAnalysis] 找到参考图:', name, '->', referenceImageUrl);
      break;
    }
  }

  if (onProgress) onProgress(100);

  return {
    referenceImageUrl,
    styleDescription: analysis.styleDescription || null,
    relatedScenes: analysis.relatedScenes || []
  };
}

module.exports = handleSceneStyleAnalysis;
