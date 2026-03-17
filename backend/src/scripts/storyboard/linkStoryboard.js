/**
 * 单分镜独立关联路由
 * 
 * POST /link-storyboard/:storyboardId - 关联单个分镜的所有资源
 * POST /link-storyboard/:storyboardId/characters - 仅关联角色
 * POST /link-storyboard/:storyboardId/scenes - 仅关联场景
 * POST /link-storyboards - 批量并发关联多个分镜
 */

const { authMiddleware } = require('../../middleware');
const { queryOne } = require('../../dbHelper');
const {
  linkCharactersForStoryboard,
  linkScenesForStoryboard,
  linkSingleStoryboard,
  linkStoryboardsParallel
} = require('../../resourceLinks');

module.exports = (router) => {
  /**
   * 关联单个分镜的所有资源（角色+场景）
   */
  router.post('/link-storyboard/:storyboardId', authMiddleware, async (req, res) => {
    try {
      const { storyboardId } = req.params;
      const { projectId, clearExisting = true } = req.body;

      if (!storyboardId) {
        return res.status(400).json({ message: '缺少 storyboardId' });
      }

      // 如果没有传 projectId，从分镜中获取
      let finalProjectId = projectId;
      if (!finalProjectId) {
        const sb = await queryOne('SELECT project_id FROM storyboards WHERE id = ?', [storyboardId]);
        if (!sb) {
          return res.status(404).json({ message: '分镜不存在' });
        }
        finalProjectId = sb.project_id;
      }

      const result = await linkSingleStoryboard(storyboardId, finalProjectId, { clearExisting });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[LinkStoryboard] 关联失败:', error);
      res.status(500).json({ message: error.message || '关联失败' });
    }
  });

  /**
   * 仅关联单个分镜的角色
   */
  router.post('/link-storyboard/:storyboardId/characters', authMiddleware, async (req, res) => {
    try {
      const { storyboardId } = req.params;
      const { projectId, clearExisting = true } = req.body;

      if (!storyboardId) {
        return res.status(400).json({ message: '缺少 storyboardId' });
      }

      let finalProjectId = projectId;
      if (!finalProjectId) {
        const sb = await queryOne('SELECT project_id FROM storyboards WHERE id = ?', [storyboardId]);
        if (!sb) {
          return res.status(404).json({ message: '分镜不存在' });
        }
        finalProjectId = sb.project_id;
      }

      const result = await linkCharactersForStoryboard(storyboardId, finalProjectId, { clearExisting });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[LinkStoryboardCharacters] 关联失败:', error);
      res.status(500).json({ message: error.message || '角色关联失败' });
    }
  });

  /**
   * 仅关联单个分镜的场景
   */
  router.post('/link-storyboard/:storyboardId/scenes', authMiddleware, async (req, res) => {
    try {
      const { storyboardId } = req.params;
      const { projectId, clearExisting = true } = req.body;

      if (!storyboardId) {
        return res.status(400).json({ message: '缺少 storyboardId' });
      }

      let finalProjectId = projectId;
      if (!finalProjectId) {
        const sb = await queryOne('SELECT project_id FROM storyboards WHERE id = ?', [storyboardId]);
        if (!sb) {
          return res.status(404).json({ message: '分镜不存在' });
        }
        finalProjectId = sb.project_id;
      }

      const result = await linkScenesForStoryboard(storyboardId, finalProjectId, { clearExisting });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[LinkStoryboardScenes] 关联失败:', error);
      res.status(500).json({ message: error.message || '场景关联失败' });
    }
  });

  /**
   * 批量并发关联多个分镜
   */
  router.post('/link-storyboards', authMiddleware, async (req, res) => {
    try {
      const { storyboardIds, projectId, maxConcurrency = 10, clearExisting = true } = req.body;

      if (!storyboardIds || !Array.isArray(storyboardIds) || storyboardIds.length === 0) {
        return res.status(400).json({ message: '缺少 storyboardIds 数组' });
      }
      if (!projectId) {
        return res.status(400).json({ message: '缺少 projectId' });
      }

      console.log(`[LinkStoryboards] 批量关联 ${storyboardIds.length} 个分镜，并发数=${maxConcurrency}`);

      const result = await linkStoryboardsParallel(storyboardIds, projectId, {
        maxConcurrency,
        clearExisting
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[LinkStoryboards] 批量关联失败:', error);
      res.status(500).json({ message: error.message || '批量关联失败' });
    }
  });
};
