/**
 * 角色提取处理器
 * input:  { scriptContent, scenes, projectId, textModel }
 * output: { characters: [{ name, appearance, personality, description }] }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const db = require('../../../db');
const { stripThinkTags, extractCodeBlock, extractJSON, stripInvisible, safeParseJSON } = require('../../../utils/washBody');

async function handleCharacterExtraction(inputParams, onProgress) {
  const { scenes, scriptContent, textModel: modelName, projectId, scriptId, userId } = inputParams;

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }
  
  console.log('[CharacterExtraction] 参数:', { projectId, scriptId, userId, scenesCount: scenes?.length });

  if (onProgress) onProgress(10);

  // 构建提示词：优先使用分镜数据，其次使用剧本内容
  let contentForAnalysis = '';
  if (scenes && scenes.length > 0) {
    // 从分镜中提取角色信息
    contentForAnalysis = `分镜数据（共 ${scenes.length} 个镜头）：\n\n`;
    scenes.forEach((scene, idx) => {
      contentForAnalysis += `镜头 ${idx + 1}:\n`;
      contentForAnalysis += `- 描述: ${scene.description || scene.prompt_template}\n`;
      if (scene.characters && scene.characters.length > 0) {
        contentForAnalysis += `- 出现角色: ${scene.characters.join(', ')}\n`;
      }
      if (scene.dialogue) {
        contentForAnalysis += `- 对白: ${scene.dialogue}\n`;
      }
      contentForAnalysis += '\n';
    });
  } else if (scriptContent) {
    contentForAnalysis = `剧本内容：\n${scriptContent}`;
  } else {
    throw new Error('必须提供 scriptContent 或 scenes 参数');
  }

  const fullPrompt = `你是一个专业的剧本分析助手。你的任务是从剧本或分镜中提取角色信息。

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹
- 不要输出缺少引号的值
- 确保 JSON 格式完整
- 只输出 JSON 数组，不要添加其他说明文字

---

请从以下内容中提取所有角色信息，分析每个角色的外貌、性格和简介。

${contentForAnalysis}

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹
- 确保 JSON 格式完整，以 ] 结尾
- 只输出 JSON 数组，不要添加其他说明文字

请严格按以下 JSON 格式返回：
[
  {
    "name": "角色名",
    "appearance": "外貌描述（年龄、身材、穿着、特征等）",
    "personality": "性格描述（性格特点、行为习惯等）",
    "description": "角色简介（背景、身份、在故事中的作用等）"
  }
]`;

  if (onProgress) onProgress(30);

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel: modelName,
    temperature: 0.3
  }, onProgress);

  if (onProgress) onProgress(70);

  // 解析 AI 返回的 JSON
  let characters = [];
  try {
    console.log('[CharacterExtraction] 响应长度:', result.content.length, '字符');

    // 1. 统一清洗
    let jsonStr = stripThinkTags(result.content);
    jsonStr = extractCodeBlock(jsonStr);
    jsonStr = stripInvisible(jsonStr).trim();

    // 2. 尝试解析
    let parsed = safeParseJSON(jsonStr);

    // 3. 如果整体失败，提取 JSON 片段再试
    if (parsed === null) {
      const extracted = extractJSON(jsonStr);
      if (extracted) parsed = safeParseJSON(extracted);
    }

    if (parsed === null) {
      throw new Error('JSON 解析失败');
    }

    // 确保返回数组
    characters = Array.isArray(parsed) ? parsed : (parsed.characters || [parsed]);
    console.log('[CharacterExtraction] 成功解析，共', characters.length, '个角色');

  } catch (parseError) {
    console.error('[CharacterExtraction] 解析角色 JSON 失败:', parseError);
    console.error('[CharacterExtraction] 完整响应内容:', result.content);
    throw new Error('角色解析失败，AI 返回的内容无法解析为 JSON: ' + parseError.message);
  }

  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error('AI 未返回有效的角色数据');
  }

  if (onProgress) onProgress(80);

  // 保存角色到数据库（更新所有字段，包括名字）
  if (projectId && userId) {
    console.log('[CharacterExtraction] 保存', characters.length, '个角色到项目', projectId, '集数', scriptId);
    
    const { queryOne, execute } = require('../../../dbHelper');
    
    for (const character of characters) {
      try {
        // 检查角色是否已存在（同一项目下的同名角色）
        const existing = await queryOne(
          'SELECT id FROM characters WHERE project_id = ? AND name = ? AND user_id = ?',
          [projectId, character.name, userId]
        );
        
        if (existing) {
          // 更新现有角色（包括名字，更新所有 AI 提取的字段）
          await execute(
            `UPDATE characters 
             SET name = ?, appearance = ?, personality = ?, description = ?, script_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              character.name,
              character.appearance || '',
              character.personality || '',
              character.description || '',
              scriptId || null,
              existing.id
            ]
          );
          console.log('[CharacterExtraction] 更新角色:', character.name, '(所有字段)');
        } else {
          // 插入新角色（包含所有详细信息）
          await execute(
            `INSERT INTO characters (user_id, project_id, script_id, name, appearance, personality, description, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'ai_extracted')`,
            [
              userId,
              projectId,
              scriptId || null,
              character.name,
              character.appearance || '',
              character.personality || '',
              character.description || ''
            ]
          );
          console.log('[CharacterExtraction] 新增角色:', character.name, '(包含详细信息)');
        }
      } catch (dbError) {
        console.error('[CharacterExtraction] 保存角色失败:', character.name, dbError);
      }
    }
  } else {
    console.warn('[CharacterExtraction] 缺少 projectId 或 userId，跳过数据库保存');
  }

  if (onProgress) onProgress(100);

  return {
    characters,
    count: characters.length,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown'
  };
}

module.exports = handleCharacterExtraction;
