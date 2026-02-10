/**
 * 工作流步骤：保存分镜到数据库
 * 
 * 逻辑与前端调用的 saveFromWorkflow API 完全一致：
 *   1. DELETE 旧分镜
 *   2. INSERT 新分镜（prompt_template + variables_json）
 *   3. linkAllForScript 建立资源关联
 * 
 * 确保 scene_state_analysis 执行前分镜已在 DB 中
 * 
 * input:  { scenes, scriptId, projectId }
 * output: { saved: number }
 */

const { execute } = require('../../../dbHelper');

async function handleSaveStoryboards(inputParams, onProgress) {
  const { scenes, scriptId, projectId } = inputParams;

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
  if (onProgress) onProgress(80);

  // 建立分镜与角色/场景的强ID关联（与 saveFromWorkflow 一致）
  try {
    const { linkAllForScript } = require('../../../resourceLinks');
    const linkResult = await linkAllForScript(scriptId, projectId);
    console.log('[SaveStoryboards] 资源关联结果:', linkResult);
  } catch (linkError) {
    // 关联失败不影响分镜保存结果
    console.error('[SaveStoryboards] 资源关联失败（不影响分镜）:', linkError.message);
  }

  if (onProgress) onProgress(100);
  console.log(`[SaveStoryboards] 完成，已保存 ${scenes.length} 个分镜`);

  return { saved: scenes.length };
}

module.exports = handleSaveStoryboards;
