/**
 * 剧本生成处理器
 * input:  { title, description, style, length, modelName }
 * output: { content, tokens, provider }
 */

const { callAIModel } = require('../../aiModelService');

async function handleScriptGeneration(inputParams, onProgress) {
  const { title, description, style, length, modelName } = inputParams;
  const selectedModel = modelName || 'DeepSeek Chat';

  const prompt = `请根据以下信息创作一个${length || '短篇'}的${style || '电影感'}风格视频剧本：
标题：${title || '未命名'}
描述：${description || ''}

要求：
1. 分成多个场景，每个场景独立完整
2. 每个场景包含画面描述和对白
3. 适合视频化呈现`;

  if (onProgress) onProgress(30);

  const result = await callAIModel(selectedModel, {
    messages: [
      { role: 'system', content: '你是一个专业的视频剧本创作助手' },
      { role: 'user', content: prompt }
    ],
    maxTokens: 4000,
    temperature: 0.7
  });

  if (onProgress) onProgress(90);

  return {
    content: result.content,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown',
    modelName: selectedModel
  };
}

module.exports = handleScriptGeneration;
