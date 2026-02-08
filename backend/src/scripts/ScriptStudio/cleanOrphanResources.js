/**
 * POST /api/scripts/clean-orphans
 * 批量删除孤立角色和场景（由前端确认后调用）
 * 
 * body: { characterIds: number[], sceneIds: number[] }
 */

const { queryOne, execute } = require('../../dbHelper');

async function cleanOrphanResources(req, res) {
  const userId = req.user.id;
  const { characterIds = [], sceneIds = [] } = req.body || {};

  try {
    let deletedCharacters = 0;
    let deletedScenes = 0;

    // 删除角色（逐个验证归属）
    for (const id of characterIds) {
      const char = await queryOne(
        'SELECT id FROM characters WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      if (char) {
        await execute('DELETE FROM characters WHERE id = ?', [id]);
        deletedCharacters++;
      }
    }

    // 删除场景（逐个验证归属）
    for (const id of sceneIds) {
      const scene = await queryOne(
        'SELECT id FROM scenes WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      if (scene) {
        await execute('DELETE FROM scenes WHERE id = ?', [id]);
        deletedScenes++;
      }
    }

    console.log(`[CleanOrphans] 已删除 ${deletedCharacters} 个角色, ${deletedScenes} 个场景`);
    res.json({ deletedCharacters, deletedScenes });
  } catch (err) {
    console.error('[CleanOrphans] 清理失败:', err);
    res.status(500).json({ message: '清理失败: ' + err.message });
  }
}

module.exports = cleanOrphanResources;
