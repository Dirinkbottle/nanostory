/**
 * 场景提取处理器
 * 从分镜中提取场景信息并保存到数据库
 * input:  { scenes, scriptContent, projectId, scriptId, userId, textModel }
 * output: { scenes: [{ name, description, environment, lighting, mood }] }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');

async function handleSceneExtraction(inputParams, onProgress) {
  const { scenes, scriptContent, textModel, modelName: _legacy, projectId, scriptId, userId } = inputParams;
  const modelName = textModel || _legacy;

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }
  
  console.log('[SceneExtraction] 参数:', { projectId, scriptId, userId, scenesCount: scenes?.length });

  if (onProgress) onProgress(10);

  // 构建提示词：从分镜中提取场景信息
  let contentForAnalysis = '';
  if (scenes && scenes.length > 0) {
    contentForAnalysis = `分镜数据（共 ${scenes.length} 个镜头）：\n\n`;
    scenes.forEach((scene, idx) => {
      contentForAnalysis += `镜头 ${idx + 1}:\n`;
      contentForAnalysis += `- 描述: ${scene.description || scene.prompt_template}\n`;
      if (scene.location) {
        contentForAnalysis += `- 地点: ${scene.location}\n`;
      }
      if (scene.emotion) {
        contentForAnalysis += `- 氛围: ${scene.emotion}\n`;
      }
      contentForAnalysis += '\n';
    });
  } else if (scriptContent) {
    contentForAnalysis = `剧本内容：\n${scriptContent}`;
  } else {
    throw new Error('必须提供 scriptContent 或 scenes 参数');
  }

  const fullPrompt = `你是一个专业的场景分析助手。你的任务是从分镜或剧本中提取所有不同的场景信息。

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹
- 不要输出缺少引号的值
- 确保 JSON 格式完整
- 只输出 JSON 数组，不要添加其他说明文字

---

请从以下内容中提取所有不同的场景信息。注意：
1. 合并相同或相似的场景（如"办公室"和"办公室内部"应该合并）
2. 为每个场景提供详细的环境描述、光照描述和氛围描述
3. 场景名称要简洁明确

${contentForAnalysis}

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹
- 确保 JSON 格式完整，以 ] 结尾
- 只输出 JSON 数组，不要添加其他说明文字

请严格按以下 JSON 格式返回：
[
  {
    "name": "场景名称（如：废弃仓库、城市街道等）",
    "description": "场景整体描述",
    "environment": "环境描述（建筑结构、空间布局、物品摆设等）",
    "lighting": "光照描述（光线来源、明暗对比、色调等）",
    "mood": "氛围描述（紧张、温馨、诡异等）"
  }
]`;

  if (onProgress) onProgress(30);

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel: modelName,
    maxTokens: 4096,
    temperature: 0.3
  }, onProgress);

  if (onProgress) onProgress(70);

  // 解析 AI 返回的 JSON
  let extractedScenes = [];
  try {
    let jsonStr = result.content;
    
    console.log('[SceneExtraction] 响应长度:', jsonStr.length, '字符');
    console.log('[SceneExtraction] 原始响应 (前200字符):', jsonStr.substring(0, 200));
    
    // 1. 移除 <think> 标签
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // 2. 处理 markdown 代码块
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[SceneExtraction] 提取代码块后长度:', jsonStr.length, '字符');
    }
    
    // 3. 移除前导/尾随空白
    jsonStr = jsonStr.trim();
    
    // 4. 先尝试直接解析
    let needsFix = false;
    try {
      extractedScenes = JSON.parse(jsonStr);
    } catch (e) {
      needsFix = true;
      console.log('[SceneExtraction] JSON 解析失败，尝试修复格式错误...');
    }
    
    // 5. 如果失败，尝试修复格式错误
    if (needsFix) {
      const lines = jsonStr.split('\n');
      const fixedLines = lines.map(line => {
        return line.replace(
          /"(\w+)":\s*([^"\d\[\{tfn][^,\}]*?)([,\}])/g,
          (match, key, value, end) => {
            const trimmedValue = value.trim();
            if (trimmedValue !== 'true' && 
                trimmedValue !== 'false' && 
                trimmedValue !== 'null') {
              console.log('[SceneExtraction] 修复字段:', key);
              return `"${key}": "${trimmedValue}"${end}`;
            }
            return match;
          }
        );
      });
      jsonStr = fixedLines.join('\n');
      console.log('[SceneExtraction] 格式修复完成，重新尝试解析...');
      
      extractedScenes = JSON.parse(jsonStr);
    }
    
    console.log('[SceneExtraction] 成功解析，共', extractedScenes.length, '个场景');
    
    // 确保返回数组
    if (!Array.isArray(extractedScenes)) {
      extractedScenes = extractedScenes.scenes || [extractedScenes];
    }
    
  } catch (parseError) {
    console.error('[SceneExtraction] 解析场景 JSON 失败:', parseError);
    console.error('[SceneExtraction] 完整响应内容:', result.content);
    throw new Error('场景解析失败，AI 返回的内容无法解析为 JSON: ' + parseError.message);
  }

  if (!Array.isArray(extractedScenes) || extractedScenes.length === 0) {
    console.warn('[SceneExtraction] AI 未返回有效的场景数据，返回空数组');
    extractedScenes = [];
  }

  if (onProgress) onProgress(80);

  // 保存场景到数据库
  if (projectId && userId && extractedScenes.length > 0) {
    console.log('[SceneExtraction] 保存', extractedScenes.length, '个场景到项目', projectId);
    
    const { queryOne, execute } = require('../../../dbHelper');
    
    for (const scene of extractedScenes) {
      try {
        // 检查场景是否已存在（同一项目下的同名场景）
        const existing = await queryOne(
          'SELECT id FROM scenes WHERE project_id = ? AND name = ? AND user_id = ?',
          [projectId, scene.name, userId]
        );
        
        if (existing) {
          // 更新现有场景
          await execute(
            `UPDATE scenes 
             SET description = ?, environment = ?, lighting = ?, mood = ?, script_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              scene.description || '',
              scene.environment || '',
              scene.lighting || '',
              scene.mood || '',
              scriptId || null,
              existing.id
            ]
          );
          console.log('[SceneExtraction] 更新场景:', scene.name);
        } else {
          // 插入新场景
          await execute(
            `INSERT INTO scenes (user_id, project_id, script_id, name, description, environment, lighting, mood, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai_extracted')`,
            [
              userId,
              projectId,
              scriptId || null,
              scene.name,
              scene.description || '',
              scene.environment || '',
              scene.lighting || '',
              scene.mood || ''
            ]
          );
          console.log('[SceneExtraction] 新增场景:', scene.name);
        }
      } catch (dbError) {
        console.error('[SceneExtraction] 保存场景失败:', scene.name, dbError);
      }
    }
  } else {
    console.warn('[SceneExtraction] 缺少 projectId 或 userId，或没有场景数据，跳过数据库保存');
  }

  if (onProgress) onProgress(100);

  return {
    scenes: extractedScenes,
    count: extractedScenes.length,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown'
  };
}

module.exports = handleSceneExtraction;
