/**
 * 工作流步骤：保存分镜到数据库 + 提取场景/道具信息
 * 
 * 逻辑与前端调用的 saveFromWorkflow API 完全一致：
 *   1. DELETE 旧分镜（或追加模式下保留）
 *   2. INSERT 新分镜（prompt_template + variables_json）
 *   3. linkAllForScript 建立资源关联
 *   4. 从 scenes.location 汇总场景信息，直接保存到 scenes 表（无需 AI）
 *   5. 从 scenes.props 汇总道具信息，保存到 props 表并建立关联
 * 
 * 确保 scene_state_analysis 执行前分镜已在 DB 中
 * 
 * input:  { scenes, scriptId, projectId, userId, sceneNumber?, appendMode? }
 * output: { saved: number, scenesExtracted: number, propsExtracted: number }
 */

const { execute, queryOne, queryAll } = require('../../../dbHelper');

async function handleSaveStoryboards(inputParams, onProgress) {
  const { scenes, scriptId, projectId, userId, sceneNumber, appendMode } = inputParams;

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('缺少分镜数据（scenes 为空）');
  }
  if (!scriptId || !projectId) {
    throw new Error('缺少 scriptId 或 projectId');
  }

  console.log(`[SaveStoryboards] 保存 ${scenes.length} 个分镜到 DB, scriptId=${scriptId}, appendMode=${appendMode}, sceneNumber=${sceneNumber}`);
  if (onProgress) onProgress(10);

  // 计算分镜序号偏移（追加模式下需要）
  let idxOffset = 0;
  if (appendMode) {
    // 追加模式：获取当前最大 idx
    const maxIdxRow = await queryOne(
      'SELECT MAX(idx) as maxIdx FROM storyboards WHERE script_id = ?',
      [scriptId]
    );
    idxOffset = (maxIdxRow?.maxIdx ?? -1) + 1;
    console.log(`[SaveStoryboards] 追加模式，从 idx=${idxOffset} 开始`);
  } else {
    // 非追加模式：删除该剧本的旧分镜
    await execute('DELETE FROM storyboards WHERE script_id = ?', [scriptId]);
    console.log('[SaveStoryboards] 已删除旧分镜');
  }

  // 保存新分镜（与 saveFromWorkflow 一致：prompt_template + variables_json）
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const actualIdx = idxOffset + i;
    await execute(
      `INSERT INTO storyboards (project_id, script_id, idx, prompt_template, variables_json) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        projectId,
        scriptId,
        actualIdx,
        scene.description || scene.prompt_template || '',
        JSON.stringify(scene.variables || scene)
      ]
    );
  }

  console.log('[SaveStoryboards] 保存了', scenes.length, '个分镜');
  if (onProgress) onProgress(40);

  // ============================================
  // 从 scenes.location 汇总场景信息，直接保存到 scenes 表
  // 必须在 linkAllForScript 之前执行，否则关联时找不到场景
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

        // 自动生成 environment 和 lighting 默认值
        const environment = `${locName}场景`;
        const lighting = '自然光';

        if (existing) {
          // 更新现有场景（补充缺失字段）
          await execute(
            `UPDATE scenes 
             SET description = COALESCE(NULLIF(description, ''), ?),
                 mood = COALESCE(NULLIF(mood, ''), ?),
                 environment = COALESCE(NULLIF(environment, ''), ?),
                 lighting = COALESCE(NULLIF(lighting, ''), ?),
                 script_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [envDescription, mood, environment, lighting, scriptId, existing.id]
          );
        } else {
          // 插入新场景（包含所有必需字段）
          await execute(
            `INSERT INTO scenes (user_id, project_id, script_id, name, description, mood, environment, lighting, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'auto_extracted')`,
            [userId, projectId, scriptId, locName, envDescription, mood, environment, lighting]
          );
        }
        scenesExtracted++;
      } catch (dbError) {
        console.error('[SaveStoryboards] 保存场景失败:', locName, dbError.message);
      }
    }
    console.log('[SaveStoryboards] 场景提取完成:', scenesExtracted);
  }

  if (onProgress) onProgress(60);

  // ============================================
  // 从 scenes.props 汇总道具信息，保存到 props 表
  // ============================================
  let propsExtracted = 0;
  const propNameToId = new Map(); // propName -> propId

  if (userId) {
    // 收集所有道具名称
    const allPropNames = new Set();
    for (const scene of scenes) {
      if (Array.isArray(scene.props)) {
        scene.props.forEach(p => {
          if (p && p.trim()) allPropNames.add(p.trim());
        });
      }
    }

    console.log('[SaveStoryboards] 从分镜汇总了', allPropNames.size, '个道具');

    // 保存道具到数据库
    for (const propName of allPropNames) {
      try {
        // 检查道具是否已存在
        const existing = await queryOne(
          'SELECT id FROM props WHERE project_id = ? AND name = ? AND user_id = ?',
          [projectId, propName, userId]
        );

        if (existing) {
          propNameToId.set(propName, existing.id);
        } else {
          // 插入新道具
          const result = await execute(
            `INSERT INTO props (user_id, project_id, name, description, category) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, projectId, propName, `从分镜自动提取的道具：${propName}`, '未分类']
          );
          propNameToId.set(propName, result.insertId);
          propsExtracted++;
        }
      } catch (dbError) {
        console.error('[SaveStoryboards] 保存道具失败:', propName, dbError.message);
      }
    }

    console.log('[SaveStoryboards] 道具提取完成:', propsExtracted, '个新道具');
  }

  // 建立分镜与角色/场景的强ID关联（与 saveFromWorkflow 一致）
  // 注意：必须在场景保存之后执行，否则关联时找不到场景
  try {
    const { linkAllForScript } = require('../../../resourceLinks');
    const linkResult = await linkAllForScript(scriptId, projectId);
    console.log('[SaveStoryboards] 资源关联结果:', linkResult);
  } catch (linkError) {
    // 关联失败不影响分镜保存结果
    console.error('[SaveStoryboards] 资源关联失败（不影响分镜）:', linkError.message);
  }

  if (onProgress) onProgress(90);

  // 建立分镜与道具的关联
  if (propNameToId.size > 0) {
    try {
      // 获取该剧本的所有分镜
      const storyboards = await queryAll(
        'SELECT id, idx, variables_json FROM storyboards WHERE script_id = ? ORDER BY idx',
        [scriptId]
      );

      for (const sb of storyboards) {
        try {
          const variables = typeof sb.variables_json === 'string' 
            ? JSON.parse(sb.variables_json) 
            : sb.variables_json;
          
          const sceneProps = variables?.props || [];
          
          for (const propName of sceneProps) {
            const propId = propNameToId.get(propName?.trim());
            if (propId) {
              // 插入分镜-道具关联（忽略重复）
              await execute(
                `INSERT IGNORE INTO storyboard_props (storyboard_id, prop_id) VALUES (?, ?)`,
                [sb.id, propId]
              );
            }
          }
        } catch (parseErr) {
          // 解析失败，跳过该分镜
        }
      }
      console.log('[SaveStoryboards] 分镜-道具关联完成');
    } catch (linkPropErr) {
      console.error('[SaveStoryboards] 分镜-道具关联失败:', linkPropErr.message);
    }
  }

  if (onProgress) onProgress(100);
  console.log(`[SaveStoryboards] 完成，已保存 ${scenes.length} 个分镜，${scenesExtracted} 个场景，${propsExtracted} 个新道具`);

  return { saved: scenes.length, scenesExtracted, propsExtracted };
}

module.exports = handleSaveStoryboards;
