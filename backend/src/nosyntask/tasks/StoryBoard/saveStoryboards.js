/**
 * 工作流步骤：保存分镜到数据库 + 提取场景信息
 * 
 * 逻辑与前端调用的 saveFromWorkflow API 完全一致：
 *   1. DELETE 旧分镜
 *   2. INSERT 新分镜（prompt_template + variables_json）
 *   3. linkAllForScript 建立资源关联
 *   4. 从 scenes.location 汇总场景信息，直接保存到 scenes 表（无需 AI）
 * 
 * 确保 scene_state_analysis 执行前分镜已在 DB 中
 * 
 * input:  { scenes, scriptId, projectId, userId }
 * output: { saved: number, scenesExtracted: number }
 */

const { execute, queryOne } = require('../../../dbHelper');

async function handleSaveStoryboards(inputParams, onProgress) {
  const { scenes, scriptId, projectId, userId } = inputParams;

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('缺少分镜数据（scenes 为空）');
  }
  if (!scriptId || !projectId) {
    throw new Error('缺少 scriptId 或 projectId');
  }

  console.log(`[SaveStoryboards] 保存 ${scenes.length} 个分镜到 DB, scriptId=${scriptId}`);
  if (onProgress) onProgress(10);

  // 删除该剧本的旧分镜（与 saveFromWorkflow 一致）
  await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
  console.log('[SaveStoryboards] 已删除旧分镜');

  // 保存新分镜（与 saveFromWorkflow 一致：prompt_template + variables_json）
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    await execute(
      `INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        projectId,
        scriptId,
        i,
        scene.description || scene.prompt_template || '',
        JSON.stringify(scene.variables || scene)
      ]
    );
  }

  console.log('[SaveStoryboards] 保存了', scenes.length, '个分镜');
  if (onProgress) onProgress(50);

  // 建立分镜与角色/场景的强ID关联（与 saveFromWorkflow 一致）
  try {
    const { linkAllForScript } = require('../../../resourceLinks');
    const linkResult = await linkAllForScript(scriptId, projectId);
    console.log('[SaveStoryboards] 资源关联结果:', linkResult);
  } catch (linkError) {
    // 关联失败不影响分镜保存结果
    console.error('[SaveStoryboards] 资源关联失败（不影响分镜）:', linkError.message);
  }

  if (onProgress) onProgress(70);

  // ============================================
  // 从 scenes.location 汇总场景信息，直接保存到 scenes 表
  // 代替了原来的 scene_extraction 的 AI 调用
  // ============================================
  let scenesExtracted = 0;
  if (userId) {
    const locationMap = new Map(); // location -> { descriptions, emotions }

    // 汇总每个 location 的信息
    for (const scene of scenes) {
      const loc = scene.location?.trim();
      if (!loc) continue;

      if (!locationMap.has(loc)) {
        locationMap.set(loc, {
          descriptions: [],
          emotions: new Set()
        });
      }
      const data = locationMap.get(loc);
      if (scene.description) data.descriptions.push(scene.description);
      if (scene.emotion) data.emotions.add(scene.emotion);
    }

    console.log('[SaveStoryboards] 从分镜汇总了', locationMap.size, '个场景');

    // 保存场景到数据库
    for (const [locName, data] of locationMap.entries()) {
      try {
        // 检查场景是否已存在
        const existing = await queryOne(
          'SELECT id FROM scenes WHERE project_id = ? AND name = ? AND user_id = ?',
          [projectId, locName, userId]
        );

        // 从 descriptions 中提取环境描述（取第一个详细的）
        const envDescription = data.descriptions[0] || '';
        const mood = Array.from(data.emotions).join(', ') || '';

        if (existing) {
          // 更新现有场景
          await execute(
            `UPDATE scenes 
             SET description = COALESCE(NULLIF(description, ''), ?),
                 mood = COALESCE(NULLIF(mood, ''), ?),
                 script_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [envDescription, mood, scriptId, existing.id]
          );
        } else {
          // 插入新场景
          await execute(
            `INSERT INTO scenes (user_id, project_id, script_id, name, description, mood, source)
             VALUES (?, ?, ?, ?, ?, ?, 'auto_extracted')`,
            [userId, projectId, scriptId, locName, envDescription, mood]
          );
        }
        scenesExtracted++;
      } catch (dbError) {
        console.error('[SaveStoryboards] 保存场景失败:', locName, dbError.message);
      }
    }
    console.log('[SaveStoryboards] 场景提取完成:', scenesExtracted);
  }

  if (onProgress) onProgress(100);
  console.log(`[SaveStoryboards] 完成，已保存 ${scenes.length} 个分镜，${scenesExtracted} 个场景`);

  return { saved: scenes.length, scenesExtracted };
}

module.exports = handleSaveStoryboards;
