/**
 * GET /api/storyboards/:scriptId
 * 获取指定剧本的所有分镜
 */

const { queryOne, queryAll } = require('../dbHelper');

async function getStoryboards(req, res) {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: 'Invalid script id' });
  }

  try {
    const script = await queryOne('SELECT id FROM scripts WHERE id = ? AND user_id = ? LIMIT 1', [scriptId, userId]);
    if (!script) {
      return res.status(404).json({ message: 'Script not found or access denied' });
    }

    try {
      const storyboards = await queryAll(
        'SELECT * FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
        [scriptId]
      );

      console.log('[Get Storyboards] scriptId:', scriptId, '查询到', storyboards.length, '条分镜');
      
      // 解析 variables_json
      const result = storyboards.map((sb, index) => {
        let variables = {};
        
        if (sb.variables_json) {
          // variables_json 可能是字符串或已经是对象
          if (typeof sb.variables_json === 'string') {
            variables = JSON.parse(sb.variables_json);
          } else {
            variables = sb.variables_json;
          }
        }
        
        // Debug: 输出第一条的详细信息
        if (index === 0) {
          console.log('[Get Storyboards] 第一条原始 variables_json:', sb.variables_json);
          console.log('[Get Storyboards] 第一条解析后 variables:', variables);
          console.log('[Get Storyboards] 第一条 characters:', variables.characters);
        }
        
        return {
          ...sb,
          variables
        };
      });

      res.json(result);
    } catch (error) {
      console.error('[Get Storyboards]', error);
      res.status(500).json({ message: '获取失败：' + error.message });
    }
  } catch (err) {
    console.error('DB error fetching storyboards:', err);
    res.status(500).json({ message: 'Failed to fetch storyboards' });
  }
}

module.exports = getStoryboards;
