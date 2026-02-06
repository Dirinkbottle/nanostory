const { queryOne, execute } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /:scriptId - 手动保存/更新分镜
module.exports = (router) => {
  router.post('/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);
    const { items } = req.body || {};

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: '分镜数据格式错误' });
    }

    try {
      // 验证剧本权限
      const script = await queryOne(
        'SELECT project_id FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在或无权访问' });
      }

      const projectId = script.project_id;

      // 删除旧分镜
      await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);

      // 保存新分镜
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await execute(
          `INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json, image_ref, video_url, generation_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            scriptId,
            i,
            item.prompt_template || item.description || '',
            JSON.stringify(item.variables || {}),
            item.image_ref || item.imageUrl || null,
            item.video_url || item.videoUrl || null,
            item.generation_status || null
          ]
        );
      }

      res.json({
        message: '分镜保存成功',
        count: items.length
      });
    } catch (error) {
      console.error('[Save Storyboards]', error);
      res.status(500).json({ message: '保存分镜失败' });
    }
  });
};
