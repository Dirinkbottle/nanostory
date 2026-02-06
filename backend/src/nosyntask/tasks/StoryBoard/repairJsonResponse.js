/**
 * JSON 修复处理器
 * 当 AI 返回的 JSON 不完整时，尝试让 AI 修复完整
 * 
 * input:  { incompleteJson, originalPrompt, modelName }
 * output: { repairedJson, success }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');

async function handleRepairJsonResponse(inputParams, onProgress) {
  const { incompleteJson, originalPrompt, modelName } = inputParams;
  const selectedModel = modelName || 'DeepSeek Chat';

  console.log('[RepairJson] 开始修复不完整的 JSON...');
  console.log('[RepairJson] 不完整内容长度:', incompleteJson.length);

  if (onProgress) onProgress(10);

  // 构建修复提示词
  const repairPrompt = `你是一个 JSON 修复专家。用户之前请求生成分镜数据，但 AI 返回的 JSON 被截断了，不完整。

原始请求：
${originalPrompt}

不完整的 JSON 响应：
${incompleteJson}

请你完成这个 JSON 数组。要求：
1. 保持已有的分镜内容不变
2. 如果 JSON 被截断在某个对象中间，请补全该对象
3. 确保 JSON 数组正确闭合（以 ] 结尾）
4. 不要添加额外的分镜，只修复截断的部分
5. 直接返回完整的 JSON 数组，不要有任何其他文字说明

返回格式示例：
[
  {
    "order": 1,
    "shotType": "远景",
    "description": "...",
    "duration": 5,
    "location": "...",
    "characters": ["..."],
    "emotion": "..."
  },
  ...
]`;

  if (onProgress) onProgress(30);

  // 调用 AI 修复
  console.log('[RepairJson] 调用 AI 模型修复...');
  const result = await handleBaseTextModelCall({
    prompt: repairPrompt,
    modelName: selectedModel,
    maxTokens: 8000,
    temperature: 0.3
  }, (progress) => {
    if (onProgress) onProgress(30 + progress * 0.6); // 30% -> 90%
  });

  if (onProgress) onProgress(90);

  // 提取修复后的内容
  let repairedContent = result.content || result;
  if (typeof repairedContent !== 'string') {
    console.error('[RepairJson] AI 返回的不是字符串:', repairedContent);
    throw new Error('AI 修复失败：返回内容格式错误');
  }

  console.log('[RepairJson] AI 修复响应长度:', repairedContent.length);

  // 清理响应内容
  repairedContent = repairedContent.trim();
  
  // 移除可能的 markdown 代码块标记
  if (repairedContent.startsWith('```json')) {
    repairedContent = repairedContent.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
  } else if (repairedContent.startsWith('```')) {
    repairedContent = repairedContent.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  repairedContent = repairedContent.trim();

  // 验证修复后的 JSON
  let repairedJson;
  try {
    repairedJson = JSON.parse(repairedContent);
    
    if (!Array.isArray(repairedJson)) {
      throw new Error('修复后的内容不是数组');
    }
    
    if (repairedJson.length === 0) {
      throw new Error('修复后的数组为空');
    }

    console.log('[RepairJson] ✅ JSON 修复成功，共', repairedJson.length, '个分镜');
    
    if (onProgress) onProgress(100);

    return {
      repairedJson,
      success: true,
      count: repairedJson.length
    };

  } catch (parseError) {
    console.error('[RepairJson] ❌ 修复后的 JSON 仍然无法解析:', parseError);
    console.error('[RepairJson] 修复后的内容:', repairedContent.substring(0, 500));
    
    return {
      repairedJson: null,
      success: false,
      error: parseError.message
    };
  }
}

module.exports = handleRepairJsonResponse;
