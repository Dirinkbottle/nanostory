/**
 * 基础文本模型调用任务
 * 统一处理不同文本模型的参数格式差异
 * 
 * 输入参数:
 * @param {string} params.prompt - 统一的提示词字段
 * @param {string} params.textModel - 文本模型名称（统一字段名）
 * @param {number} params.maxTokens - 最大 token 数（可选，默认 500）
 * @param {number} params.temperature - 温度参数（可选，默认 0.7）
 * 
 * 输出:
 * @returns {Object} AI 模型的原始响应结果
 */

const { callAIModel } = require('../../../aiModelService');

async function handleBaseTextModelCall(params, onProgress) {
  const {
    prompt,
    textModel: _textModel,
    modelName: _legacyModelName,
    maxTokens = 500,
    temperature = 0.7
  } = params;

  const modelName = _textModel || _legacyModelName;

  if (!prompt) {
    throw new Error('prompt 参数是必需的');
  }

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }

  console.log('[BaseTextModelCall] 开始调用文本模型:', {
    modelName,
    promptLength: prompt.length,
    maxTokens,
    temperature
  });

  if (onProgress) onProgress(10);

  if (onProgress) onProgress(20);

  try {
    // 构建请求参数，同时支持 prompt 和 message 字段
    // 不同的模型可能使用不同的字段名
    const requestParams = {
      messages: [
        { role: 'user', content: prompt }
      ],
      maxTokens,
      temperature,
      // 同时传递 prompt 和 message 字段以适配不同模型
      prompt: prompt,
      message: prompt
    };

    console.log('[BaseTextModelCall] 调用 AI 模型...');
    console.log('[BaseTextModelCall] 提示词预览:', prompt.substring(0, 200) + '...');

    if (onProgress) onProgress(40);

    // 调用 AI 模型服务
    const response = await callAIModel(modelName, requestParams);

    if (onProgress) onProgress(90);

    console.log('[BaseTextModelCall] ✅ 模型调用成功');
    console.log('[BaseTextModelCall] 响应类型:', typeof response);
    console.log('[BaseTextModelCall] 响应预览:', JSON.stringify(response).substring(0, 300));

    if (onProgress) onProgress(100);

    // 返回原始响应，由调用方自行处理
    return response;

  } catch (error) {
    console.error('[BaseTextModelCall] 模型调用失败:', error);
    throw new Error(`文本模型调用失败: ${error.message}`);
  }
}

module.exports = handleBaseTextModelCall;
