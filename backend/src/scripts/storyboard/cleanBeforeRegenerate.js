/**
 * POST /api/storyboards/clean-before-regenerate
 * 重新生成分镜前的清理接口
 * 
 * 删除该集（scriptId）的所有分镜，以及仅被该集关联的孤立角色和场景
 * 
 * 级联删除链：
 *   DELETE storyboards → CASCADE → storyboard_characters / storyboard_scenes
 *   孤立角色/场景（仅被该集分镜关联、不被其他集引用）→ 主动 DELETE
 */

const { queryOne, queryAll, execute } = require('../../dbHelper');

async function cleanBeforeRegenerate(req, res) {
  const userId = req.user.id;
  const { scriptId } = req.body;

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

    // 统计分镜数
    const storyboardCount = await queryOne(
      'SELECT COUNT(*) AS cnt FROM storyboards WHERE script_id = ?',
      [scriptId]
    );
    const sbCount = storyboardCount?.cnt || 0;

    if (sbCount === 0) {
      return res.json({
        message: '无需清理',
        deletedStoryboards: 0,
        deletedCharacters: 0,
        deletedScenes: 0
      });
    }

    // 1. 查孤立资源（必须在删除分镜前查，删除后关联记录就没了）
    const orphanCharIds = await findOrphanIds(projectId, scriptId, 'storyboard_characters', 'character_id');
    const orphanSceneIds = await findOrphanIds(projectId, scriptId, 'storyboard_scenes', 'scene_id');

    console.log(`[CleanBeforeRegenerate] scriptId=${scriptId}: ${sbCount} 个分镜, 孤立角色=${orphanCharIds.length}, 孤立场景=${orphanSceneIds.length}`);

    // 2. 删除分镜（级联自动清理 storyboard_characters / storyboard_scenes）
    await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
    console.log(`[CleanBeforeRegenerate] 已删除 ${sbCount} 个分镜`);

    // 3. 删除孤立角色
    let deletedCharacters = 0;
    if (orphanCharIds.length > 0) {
      const ph = orphanCharIds.map(() => '?').join(',');
      await execute(`DELETE FROM characters WHERE id IN (${ph})`, orphanCharIds);
      deletedCharacters = orphanCharIds.length;
      console.log(`[CleanBeforeRegenerate] 已清理 ${deletedCharacters} 个孤立角色`);
    }

    // 4. 删除孤立场景
    let deletedScenes = 0;
    if (orphanSceneIds.length > 0) {
      const ph = orphanSceneIds.map(() => '?').join(',');
      await execute(`DELETE FROM scenes WHERE id IN (${ph})`, orphanSceneIds);
      deletedScenes = orphanSceneIds.length;
      console.log(`[CleanBeforeRegenerate] 已清理 ${deletedScenes} 个孤立场景`);
    }

    res.json({
      message: '清理完成',
      deletedStoryboards: sbCount,
      deletedCharacters,
      deletedScenes
    });
  } catch (err) {
    console.error('[CleanBeforeRegenerate] 清理失败:', err);
    res.status(500).json({ message: '清理失败: ' + err.message });
  }
}

/**
 * 查找仅被该集分镜关联的资源ID（孤立资源）
 * 复用 deleteEpisode.js 的逻辑
 */
async function findOrphanIds(projectId, scriptId, joinTable, fkColumn) {
  // 该集分镜关联的资源ID
  const thisIds = await queryAll(
    `SELECT DISTINCT jt.${fkColumn} AS rid
     FROM ${joinTable} jt
     JOIN storyboards sb ON jt.storyboard_id = sb.id
     WHERE sb.script_id = ?`,
    [scriptId]
  );
  if (thisIds.length === 0) return [];

  // 其中哪些也被其他集关联（跨集共享的不删）
  const ids = thisIds.map(r => r.rid);
  const ph = ids.map(() => '?').join(',');
  const otherLinked = await queryAll(
    `SELECT DISTINCT jt.${fkColumn} AS rid
     FROM ${joinTable} jt
     JOIN storyboards sb ON jt.storyboard_id = sb.id
     WHERE sb.project_id = ? AND sb.script_id != ? AND jt.${fkColumn} IN (${ph})`,
    [projectId, scriptId, ...ids]
  );
  const otherSet = new Set(otherLinked.map(r => r.rid));

  return ids.filter(id => !otherSet.has(id));
}

module.exports = cleanBeforeRegenerate;
