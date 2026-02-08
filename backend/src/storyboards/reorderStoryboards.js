/**
 * PATCH /api/storyboards/reorder
 * 批量更新分镜顺序（仅修改 idx，不影响其他字段）
 * 
 * body: { scriptId: number, order: [{ id: number, idx: number }] }
 */

const { queryOne, execute } = require('../dbHelper');

async function reorderStoryboards(req, res) {
  const userId = req.user.id;
  const { scriptId, order } = req.body || {};

  if (!scriptId || !Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ message: '缺少 scriptId 或 order 数组' });
  }

  try {
    // 权限校验：确认该剧本属于当前用户
    const script = await queryOne(
      'SELECT id FROM scripts WHERE id = ? AND user_id = ?',
      [scriptId, userId]
    );
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权限' });
    }

    // 逐条更新 idx
    for (const item of order) {
      if (item.id != null && item.idx != null) {
        await execute(
          'UPDATE storyboards SET idx = ? WHERE id = ? AND script_id = ?',
          [item.idx, item.id, scriptId]
        );
      }
    }

    console.log(`[ReorderStoryboards] 更新了 ${order.length} 个分镜的顺序`);
    res.json({ message: '排序已保存', count: order.length });
  } catch (err) {
    console.error('[ReorderStoryboards] 保存排序失败:', err);
    res.status(500).json({ message: '保存排序失败' });
  }
}

module.exports = reorderStoryboards;
