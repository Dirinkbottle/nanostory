/**
 * 分镜-角色关联写入
 * 
 * 根据分镜中的角色名字列表，匹配 characters 表，写入 storyboard_characters 关联表
 */

const { queryOne, queryAll, execute } = require('../dbHelper');

/**
 * 为单个分镜建立角色关联
 * 
 * @param {number} storyboardId - 分镜ID
 * @param {string[]} characterNames - 角色名字数组（来自 variables_json.characters）
 * @param {number} projectId - 项目ID（用于在 characters 表中匹配）
 * @param {object} [options]
 * @param {boolean} [options.clearExisting=true] - 是否先清除已有关联
 * @returns {Promise<{linked: number, notFound: string[]}>}
 */
async function linkStoryboardCharacters(storyboardId, characterNames, projectId, options = {}) {
  const { clearExisting = true } = options;

  if (!storyboardId || !projectId || !Array.isArray(characterNames) || characterNames.length === 0) {
    return { linked: 0, notFound: [] };
  }

  // 清除已有关联
  if (clearExisting) {
    await execute('DELETE FROM storyboard_characters WHERE storyboard_id = ?', [storyboardId]);
  }

  let linked = 0;
  const notFound = [];

  for (const name of characterNames) {
    if (!name || typeof name !== 'string') continue;

    const character = await queryOne(
      'SELECT id FROM characters WHERE project_id = ? AND name = ?',
      [projectId, name.trim()]
    );

    if (character) {
      try {
        await execute(
          'INSERT IGNORE INTO storyboard_characters (storyboard_id, character_id) VALUES (?, ?)',
          [storyboardId, character.id]
        );
        linked++;
      } catch (err) {
        // UNIQUE 冲突忽略
        if (!err.message.includes('Duplicate')) {
          console.error('[linkCharacters] 写入关联失败:', err.message);
        }
      }
    } else {
      notFound.push(name);
    }
  }

  return { linked, notFound };
}

module.exports = { linkStoryboardCharacters };
