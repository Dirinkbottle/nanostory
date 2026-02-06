const { queryOne, queryAll, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');
const { callAIModel } = require('../../aiModelService');

// POST /extract-from-storyboard - 从分镜中提取角色、场景、道具资源
module.exports = (router) => {
  router.post('/extract-from-storyboard', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { projectId, scriptId, storyboardId, scenes } = req.body;

    if (!projectId || !scenes || scenes.length === 0) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    try {
      const scenesText = scenes.map((scene, idx) => {
        return `镜头 ${idx + 1}:\n${scene.description || scene.prompt_template}\n`;
      }).join('\n');

      const prompt = `请从以下分镜描述中提取所有角色、场景位置和道具信息。

${scenesText}

请严格按以下 JSON 格式返回（不要包含其他文字）：
{
  "characters": [
    {
      "name": "角色名",
      "appearance": "外貌描述",
      "personality": "性格描述",
      "description": "角色简介"
    }
  ],
  "locations": ["场景1", "场景2"],
  "props": ["道具1", "道具2"]
}`;

      const result = await callAIModel('DeepSeek Chat', {
        messages: [
          { role: 'system', content: '你是一个专业的剧本分析助手。请只返回 JSON，不要包含任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 2000,
        temperature: 0.3
      });

      let extracted;
      try {
        const jsonStr = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        extracted = JSON.parse(jsonStr);
      } catch (e) {
        console.warn('[Extract Resources] JSON 解析失败，返回原始内容');
        extracted = { characters: [], locations: [], props: [] };
      }

      // 保存角色到数据库
      if (extracted.characters && extracted.characters.length > 0) {
        for (const char of extracted.characters) {
          try {
            const existing = await queryOne(
              'SELECT id FROM characters WHERE project_id = ? AND name = ? AND user_id = ?',
              [projectId, char.name, userId]
            );

            if (!existing) {
              await execute(
                `INSERT INTO characters (user_id, project_id, script_id, name, appearance, personality, description, source)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'ai_extracted')`,
                [userId, projectId, scriptId || null, char.name, char.appearance || '', char.personality || '', char.description || '']
              );
            }
          } catch (dbError) {
            console.error('[Extract Resources] 保存角色失败:', char.name, dbError);
          }
        }
      }

      res.json({
        message: '资源提取成功',
        characters: extracted.characters || [],
        locations: extracted.locations || [],
        props: extracted.props || [],
        tokens: result.tokens || 0
      });
    } catch (error) {
      console.error('[Extract Resources]', error);
      res.status(500).json({ message: '提取资源失败: ' + error.message });
    }
  });
};
