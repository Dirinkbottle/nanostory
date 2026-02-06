/**
 * 角色提取处理器
 * input:  { scriptContent, modelName }
 * output: { characters: [{ name, appearance, personality }] }
 */

const { callAIModel } = require('../../aiModelService');

async function handleCharacterExtraction(inputParams, onProgress) {
  const { scriptContent, modelName } = inputParams;
  const selectedModel = modelName || 'DeepSeek Chat';

  const prompt = `请从以下剧本中提取所有角色信息，返回 JSON 数组。

剧本内容：
${scriptContent}

请严格按以下 JSON 格式返回（不要包含其他文字）：
[
  {
    "name": "角色名",
    "appearance": "外貌描述",
    "personality": "性格描述",
    "description": "角色简介"
  }
]`;

  if (onProgress) onProgress(30);

  const result = await callAIModel(selectedModel, {
    messages: [
      { role: 'system', content: '你是一个专业的剧本分析助手。请只返回 JSON，不要包含任何其他文字。' },
      { role: 'user', content: prompt }
    ],
    maxTokens: 2000,
    temperature: 0.3
  });

  if (onProgress) onProgress(90);

  // 尝试解析 JSON
  let characters = [];
  try {
    const jsonStr = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    characters = JSON.parse(jsonStr);
    if (!Array.isArray(characters)) {
      characters = characters.characters || [characters];
    }
  } catch (e) {
    console.warn('[CharacterExtraction] JSON 解析失败，返回原始内容');
    characters = [{ name: '解析失败', description: result.content }];
  }

  return {
    characters,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown'
  };
}

module.exports = handleCharacterExtraction;
