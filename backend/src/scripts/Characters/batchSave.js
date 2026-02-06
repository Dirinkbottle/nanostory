const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /batch-save - 批量保存角色（动态更新提供的字段）
module.exports = (router) => {
  router.post('/batch-save', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { projectId, scriptId, characters } = req.body;

    if (!projectId || !Array.isArray(characters)) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    try {
      let savedCount = 0;
      let updatedCount = 0;

      for (const char of characters) {
        // 支持字符串（只有名字）或对象（包含详细信息）
        const charData = typeof char === 'string' ? { name: char } : char;
        
        if (!charData.name) continue;

        // 检查角色是否已存在
        const existing = await queryOne(
          'SELECT id FROM characters WHERE project_id = ? AND name = ? AND user_id = ?',
          [projectId, charData.name, userId]
        );

        if (existing) {
          // 角色已存在，动态更新提供的字段
          const updateFields = [];
          const updateValues = [];
          
          if (scriptId !== undefined) {
            updateFields.push('script_id = ?');
            updateValues.push(scriptId);
          }
          if (charData.appearance !== undefined) {
            updateFields.push('appearance = ?');
            updateValues.push(charData.appearance);
          }
          if (charData.personality !== undefined) {
            updateFields.push('personality = ?');
            updateValues.push(charData.personality);
          }
          if (charData.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(charData.description);
          }
          
          if (updateFields.length > 0) {
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(existing.id);
            
            await execute(
              `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`,
              updateValues
            );
            updatedCount++;
          }
        } else {
          // 新角色，插入数据库
          await execute(
            `INSERT INTO characters (user_id, project_id, script_id, name, appearance, personality, description, source) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'storyboard')`,
            [
              userId, 
              projectId, 
              scriptId || null, 
              charData.name,
              charData.appearance || '',
              charData.personality || '',
              charData.description || ''
            ]
          );
          savedCount++;
        }
      }

      console.log(`[Batch Save] projectId=${projectId}, scriptId=${scriptId}, saved=${savedCount}, updated=${updatedCount}`);

      res.json({ 
        message: '角色保存成功',
        savedCount,
        updatedCount,
        totalCount: characters.length
      });
    } catch (error) {
      console.error('[Batch Save Characters]', error);
      res.status(500).json({ message: '批量保存角色失败' });
    }
  });
};
