/**
 * 修复分镜与资源的关联
 * POST /api/storyboards/fix-links
 * Body: { scriptId }
 */

const { linkAllForScript } = require('../../resourceLinks');
const { queryOne } = require('../../dbHelper');

module.exports = async function fixLinks(req, res) {
  try {
    const { scriptId } = req.body;
    
    if (!scriptId) {
      return res.status(400).json({ error: '缺少 scriptId' });
    }

    // 获取脚本信息以取得 projectId
    const script = await queryOne('SELECT project_id FROM scripts WHERE id = ?', [scriptId]);
    if (!script) {
      return res.status(404).json({ error: '剧本不存在' });
    }

    const projectId = script.project_id;

    // 重新建立关联
    const result = await linkAllForScript(scriptId, projectId);

    res.json({
      success: true,
      message: '资源关联修复完成',
      result
    });

  } catch (error) {
    console.error('[fixLinks] 修复关联失败:', error);
    res.status(500).json({ error: error.message });
  }
};
