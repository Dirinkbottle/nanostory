/**
 * 场景图片生成任务
 * 根据场景信息生成场景图片
 * 
 * input: {
 *   sceneId: number,
 *   sceneName: string,
 *   description: string,
 *   environment: string,
 *   lighting: string,
 *   mood: string,
 *   style: string,
 *   modelName: string,
 *   width: number,
 *   height: number
 * }
 * 
 * output: {
 *   imageUrl: string,
 *   sceneId: number
 * }
 */

const { getImageModels, getTextModels } = require('../../../aiModelService');
const handleImageGeneration = require('../base/imageGeneration');
const handleBaseTextModelCall = require('../base/baseTextModelCall');

/**
 * 使用 AI 生成场景图片提示词
 */
async function generateScenePrompt(sceneName, description, environment, lighting, mood, style, textModel) {
  console.log('[SceneImageGen] 使用 AI 生成场景图片提示词...');

  const fullPrompt = `你是一个专业的图片生成提示词专家。你的任务是根据场景信息生成高质量的场景图片生成提示词（用于 Stable Diffusion、Midjourney 等 AI 绘图工具）。

要求：
1. 提示词必须用英文输出
2. 使用逗号分隔的关键词格式
3. 包含：场景环境、光照效果、氛围、构图、画质描述
4. 避免使用否定词（如 no, without 等）
5. 简洁明确，突出场景特征
6. 长度控制在 100-150 个单词
7. 重点描述环境细节、光影效果、氛围营造

示例格式：
scene description, environment details, lighting conditions, mood and atmosphere, composition, art style, high quality, detailed, cinematic

---

请为以下场景生成图片提示词：

场景名称：${sceneName || '未命名场景'}
场景描述：${description || '无'}
环境描述：${environment || '无'}
光照描述：${lighting || '无'}
氛围描述：${mood || '无'}
风格要求：${style || '写实风格'}

请直接输出英文提示词，不要包含任何解释或其他内容。`;

  // 调用基础文本模型
  const response = await handleBaseTextModelCall({
    prompt: fullPrompt,
    modelName: textModel,
    maxTokens: 500,
    temperature: 0.7
  });

  console.log('[SceneImageGen] baseTextModelCall 响应:', JSON.stringify(response).substring(0, 500));

  // 提取生成的提示词
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
    throw new Error(`错误：调用了图片生成模型而非文本模型。响应: ${JSON.stringify(response).substring(0, 200)}`);
  }
  
  if (!prompt) {
    console.error('[SceneImageGen] 无法提取提示词，完整响应:', JSON.stringify(response));
    throw new Error(`AI 响应中没有内容。响应类型: ${typeof response}, 响应: ${JSON.stringify(response).substring(0, 200)}`);
  }

  // 清理提示词
  prompt = prompt.trim();
  
  // 移除可能的引号包裹
  if ((prompt.startsWith('"') && prompt.endsWith('"')) || 
      (prompt.startsWith("'") && prompt.endsWith("'"))) {
    prompt = prompt.slice(1, -1);
  }
  
  // 移除换行符
  prompt = prompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  console.log('[SceneImageGen] 生成的提示词:', prompt.substring(0, 200));
  
  return prompt;
}

/**
 * 场景图片生成主处理器
 */
async function handleSceneImageGeneration(inputParams, onProgress) {
  const { 
    sceneId, 
    sceneName, 
    description, 
    environment, 
    lighting, 
    mood, 
    style, 
    modelName,
    width = 1024,
    height = 576
  } = inputParams;

  console.log('[SceneImageGen] 开始生成场景图片:', {
    sceneId,
    sceneName,
    style,
    modelName,
    dimensions: `${width}x${height}`
  });

  // 参数验证
  if (!sceneId) {
    throw new Error('缺少必要参数：sceneId');
  }

  if (!sceneName && !description && !environment) {
    throw new Error('场景信息不足：至少需要提供场景名称、描述或环境描述之一');
  }

  if (onProgress) onProgress(5);

  // 获取可用的文本模型和图片模型
  const textModels = await getTextModels();
  const imageModels = await getImageModels();

  console.log('[SceneImageGen] 可用文本模型:', textModels.map(m => m.name));
  console.log('[SceneImageGen] 可用图片模型:', imageModels.map(m => m.name));

  // 选择模型
  const textModel = modelName && textModels.find(m => m.name === modelName) 
    ? modelName 
    : (textModels[0]?.name || 'DeepSeek Chat');

  const imageModel = modelName && imageModels.find(m => m.name === modelName)
    ? modelName
    : (imageModels[0]?.name || 'FLUX.1 [schnell]');

  console.log('[SceneImageGen] 使用文本模型:', textModel);
  console.log('[SceneImageGen] 使用图片模型:', imageModel);

  if (onProgress) onProgress(10);

  // 步骤1：生成场景图片提示词
  console.log('[SceneImageGen] 生成场景图片提示词...');
  const scenePrompt = await generateScenePrompt(
    sceneName,
    description,
    environment,
    lighting,
    mood,
    style,
    textModel
  );

  if (onProgress) onProgress(30);

  // 步骤2：生成场景图片
  console.log('[SceneImageGen] 生成场景图片...');
  const imageResult = await handleImageGeneration({
    prompt: scenePrompt,
    modelName: imageModel,
    width,
    height
  }, (progress) => {
    if (onProgress) onProgress(30 + progress * 0.6); // 30% -> 90%
  });

  const imageUrl = imageResult.image_url;
  console.log('[SceneImageGen] ✅ 场景图片生成完成');
  console.log('[SceneImageGen] DEBUG - 场景图片结果:', {
    prompt: scenePrompt.substring(0, 150) + '...',
    imageUrl,
    imageModel,
    dimensions: `${width}x${height}`
  });

  if (onProgress) onProgress(90);

  // 步骤3：保存图片 URL 到数据库
  if (sceneId && imageUrl) {
    const { execute } = require('../../../dbHelper');
    await execute(
      `UPDATE scenes 
       SET image_url = ?, 
           generation_prompt = ?, 
           generation_status = 'completed', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [imageUrl, scenePrompt, sceneId]
    );
    console.log('[SceneImageGen] ✅ 场景图片已保存到数据库');
  }

  if (onProgress) onProgress(100);

  return {
    imageUrl,
    sceneId,
    prompt: scenePrompt,
    imageModel,
    textModel
  };
}

module.exports = handleSceneImageGeneration;
