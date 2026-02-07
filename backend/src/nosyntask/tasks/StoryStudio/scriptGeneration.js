/**
 * 剧本生成处理器（支持连续剧集）
 * input:  { title, description, style, length, textModel, projectId, episodeNumber }
 * output: { content, tokens, provider, episodeNumber }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const { queryAll } = require('../../../dbHelper');

async function handleScriptGeneration(inputParams, onProgress) {
  const { title, description, style, length, textModel, modelName: _legacy, projectId, episodeNumber } = inputParams;
  const modelName = textModel || _legacy;

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }
  const targetEpisode = episodeNumber || 1;

  if (onProgress) onProgress(10);

  // 获取之前所有集的剧本作为上下文（如果是连续剧集）
  let previousEpisodesContext = '';
  if (projectId && targetEpisode > 1) {
    const previousScripts = await queryAll(
      `SELECT episode_number, title, content FROM scripts 
       WHERE project_id = ? AND episode_number < ? AND status = 'completed'
       ORDER BY episode_number ASC`,
      [projectId, targetEpisode]
    );
    
    if (previousScripts.length > 0) {
      previousEpisodesContext = '\n\n【前情回顾 - 请基于以下已有剧情继续创作，保持人物、情节、风格的连贯性】\n';
      previousScripts.forEach(script => {
        previousEpisodesContext += `\n--- 第${script.episode_number}集：${script.title} ---\n${script.content}\n`;
      });
      previousEpisodesContext += '\n【前情回顾结束】\n';
    }
  }

  if (onProgress) onProgress(20);

  // 构建用户提示词
  let userPrompt;
  if (targetEpisode === 1) {
    userPrompt = `请根据以下信息创作一个${length || '短篇'}的${style || '电影感'}风格视频剧本（第1集）：
标题：${title || '未命名'}
故事概述：${description || ''}

要求：
1. 分成多个场景，每个场景独立完整
2. 每个场景包含画面描述和对白
3. 适合视频化呈现
4. 作为第1集，需要做好人物和世界观的铺垫`;
  } else {
    userPrompt = `请根据以下信息继续创作视频剧本的第${targetEpisode}集：
本集标题：${title || `第${targetEpisode}集`}
${previousEpisodesContext}
${description ? `\n【用户期望的故事走向】\n${description}\n（请参考此走向发展剧情，但必须与前面的剧情保持连贯）\n` : ''}
要求：
1. 【重要】必须延续前面集数的人物设定、剧情发展和叙事风格
2. ${description ? '参考用户提供的故事走向建议，但要确保剧情逻辑自洽' : '根据前集剧情自然发展故事'}
3. 分成多个场景，每个场景独立完整
4. 每个场景包含画面描述和对白
5. 适合视频化呈现
6. 这是第${targetEpisode}集，需要承接前集剧情并推进故事发展
7. 保持角色性格和说话风格的一致性`;
  }

  if (onProgress) onProgress(30);

  const fullPrompt = `你是一个专业的视频剧本创作助手，擅长创作连续剧本，能够保持多集之间的剧情连贯性和角色一致性。

---

${userPrompt}`;

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel: modelName,
    maxTokens: 8000,
    temperature: 0.7
  }, onProgress);

  if (onProgress) onProgress(90);

  return {
    content: result.content,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown',
    modelName,
    episodeNumber: targetEpisode
  };
}

module.exports = handleScriptGeneration;
