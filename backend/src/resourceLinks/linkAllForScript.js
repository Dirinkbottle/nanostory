/**
 * 批量关联 — 为指定剧本下的所有分镜建立角色/场景关联
 * 
 * 典型调用场景：saveFromWorkflow 保存分镜后调用此函数
 */

const { queryAll } = require('../dbHelper');
const { linkStoryboardCharacters } = require('./linkCharacters');
const { linkStoryboardScenes } = require('./linkScenes');

/**
 * 为指定 scriptId 下的所有分镜建立资源关联
 * 
 * @param {number} scriptId - 剧本ID
 * @param {number} projectId - 项目ID
 * @returns {Promise<{total: number, charLinked: number, sceneLinked: number, charNotFound: string[], sceneNotFound: string[]}>}
 */
async function linkAllForScript(scriptId, projectId) {
  if (!scriptId || !projectId) {
    return { total: 0, charLinked: 0, sceneLinked: 0, charNotFound: [], sceneNotFound: [] };
  }

  const storyboards = await queryAll(
    'SELECT id, variables_json FROM storyboards WHERE script_id = ? ORDER BY idx',
    [scriptId]
  );

  let charLinked = 0;
  let sceneLinked = 0;
  const charNotFound = new Set();
  const sceneNotFound = new Set();

  for (const sb of storyboards) {
    let vars = {};
    try {
      vars = typeof sb.variables_json === 'string'
        ? JSON.parse(sb.variables_json)
        : sb.variables_json || {};
    } catch (e) {
      console.error('[linkAllForScript] 解析 variables_json 失败, storyboardId:', sb.id);
      continue;
    }

    // 关联角色
    const charNames = vars.characters || [];
    if (charNames.length > 0) {
      const charResult = await linkStoryboardCharacters(sb.id, charNames, projectId);
      charLinked += charResult.linked;
      charResult.notFound.forEach(n => charNotFound.add(n));
    }

    // 关联场景
    const location = vars.location || '';
    if (location) {
      const sceneResult = await linkStoryboardScenes(sb.id, location, projectId);
      if (sceneResult.linked) sceneLinked++;
      if (sceneResult.notFound) sceneNotFound.add(location);
    }
  }

  console.log(`[linkAllForScript] scriptId=${scriptId}: ${storyboards.length} 个分镜, 角色关联=${charLinked}, 场景关联=${sceneLinked}`);
  if (charNotFound.size > 0) {
    console.log(`[linkAllForScript] 未匹配角色: ${[...charNotFound].join(', ')}`);
  }
  if (sceneNotFound.size > 0) {
    console.log(`[linkAllForScript] 未匹配场景: ${[...sceneNotFound].join(', ')}`);
  }

  return {
    total: storyboards.length,
    charLinked,
    sceneLinked,
    charNotFound: [...charNotFound],
    sceneNotFound: [...sceneNotFound]
  };
}

module.exports = { linkAllForScript };
