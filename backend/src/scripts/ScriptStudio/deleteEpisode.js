/**
 * DELETE /api/scripts/:id/episode
 * 删除某集剧本及其所有分镜，返回孤立角色/场景供用户确认
 * 
 * 流程：
 * 1. 删除该集所有分镜（storyboards）
 * 2. 删除剧本记录（scripts）
 * 3. 查找因此变为孤立的角色和场景（仅被该集引用）
 * 4. 返回孤立资源列表，由前端决定是否清理
 */

const { queryOne, queryAll, execute } = require('../../dbHelper');

async function deleteEpisode(req, res) {
  const userId = req.user.id;
  const scriptId = Number(req.params.id);

  if (!scriptId) {
    return res.status(400).json({ message: '缺少 scriptId' });
  }

  try {
    // 验证剧本归属
    const script = await queryOne(
      'SELECT id, project_id, episode_number FROM scripts WHERE id = ? AND user_id = ?',
      [scriptId, userId]
    );
    if (!script) {
      return res.status(404).json({ message: '剧本不存在或无权访问' });
    }

    const projectId = script.project_id;
    const episodeNumber = script.episode_number;

    // 1. 删除该集所有分镜
    const storyboards = await queryAll(
      'SELECT id FROM storyboards WHERE script_id = ?',
      [scriptId]
    );
    if (storyboards.length > 0) {
      await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
      console.log(`[DeleteEpisode] 已删除 ${storyboards.length} 个分镜, scriptId=${scriptId}`);
    }

    // 2. 查找孤立角色（script_id 指向该集，且项目内没有其他集引用同名角色）
    const orphanCharacters = await findOrphanCharacters(projectId, scriptId);

    // 3. 查找孤立场景（同理）
    const orphanScenes = await findOrphanScenes(projectId, scriptId);

    // 4. 删除剧本
    await execute('DELETE FROM scripts WHERE id = ? AND user_id = ?', [scriptId, userId]);
    console.log(`[DeleteEpisode] 已删除剧本 id=${scriptId}, 第${episodeNumber}集`);

    res.json({
      message: `第${episodeNumber}集已删除`,
      deletedStoryboards: storyboards.length,
      orphanCharacters,
      orphanScenes
    });
  } catch (err) {
    console.error('[DeleteEpisode] 删除失败:', err);
    res.status(500).json({ message: '删除失败: ' + err.message });
  }
}

/**
 * 查找仅被该集引用的角色
 * 逻辑：角色的 script_id = 当前 scriptId，且该角色名在项目的其他集分镜中未出现
 */
async function findOrphanCharacters(projectId, scriptId) {
  // 获取该集关联的角色
  const characters = await queryAll(
    'SELECT id, name, image_url FROM characters WHERE project_id = ? AND script_id = ?',
    [projectId, scriptId]
  );
  if (characters.length === 0) return [];

  // 获取项目中其他集的所有分镜角色名
  const otherStoryboards = await queryAll(
    'SELECT variables_json FROM storyboards WHERE project_id = ? AND script_id != ?',
    [projectId, scriptId]
  );
  const otherCharNames = new Set();
  for (const sb of otherStoryboards) {
    try {
      const vars = typeof sb.variables_json === 'string'
        ? JSON.parse(sb.variables_json || '{}')
        : (sb.variables_json || {});
      if (Array.isArray(vars.characters)) {
        vars.characters.forEach((name) => otherCharNames.add(name));
      }
    } catch (e) { /* ignore */ }
  }

  // 筛选出未被其他集引用的角色
  return characters
    .filter(c => !otherCharNames.has(c.name))
    .map(c => ({ id: c.id, name: c.name, image_url: c.image_url }));
}

/**
 * 查找仅被该集引用的场景
 * 逻辑：场景的 script_id = 当前 scriptId，且该场景名在项目的其他集分镜中未出现
 */
async function findOrphanScenes(projectId, scriptId) {
  const scenes = await queryAll(
    'SELECT id, name, image_url FROM scenes WHERE project_id = ? AND script_id = ?',
    [projectId, scriptId]
  );
  if (scenes.length === 0) return [];

  // 获取项目中其他集的所有分镜场景名
  const otherStoryboards = await queryAll(
    'SELECT variables_json FROM storyboards WHERE project_id = ? AND script_id != ?',
    [projectId, scriptId]
  );
  const otherLocations = new Set();
  for (const sb of otherStoryboards) {
    try {
      const vars = typeof sb.variables_json === 'string'
        ? JSON.parse(sb.variables_json || '{}')
        : (sb.variables_json || {});
      if (vars.location) {
        otherLocations.add(vars.location);
      }
    } catch (e) { /* ignore */ }
  }

  return scenes
    .filter(s => !otherLocations.has(s.name))
    .map(s => ({ id: s.id, name: s.name, image_url: s.image_url }));
}

module.exports = deleteEpisode;
