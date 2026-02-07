/**
 * 批量分镜帧生成处理器
 * 一键生成一集所有分镜的首帧/首尾帧图片（并发池模式）
 * 
 * 逻辑：
 * 1. 查询 scriptId 下所有分镜
 * 2. 过滤出需要生成的分镜（跳过已有帧的，除非 overwriteFrames=true）
 * 3. 以并发池方式同时生成最多 maxConcurrency 个分镜
 *    - hasAction=true  → 调用 frameGeneration（首尾帧）
 *    - hasAction=false → 调用 singleFrameGeneration（单帧）
 * 4. 每完成一个立即保存到数据库（子 handler 自带保存）
 * 5. 某个失败 → 记录错误，不影响其他并发任务
 * 
 * input:  { scriptId, imageModel, textModel, overwriteFrames, width, height, maxConcurrency }
 * output: { total, completed, skipped, failed, results[] }
 */

const { queryAll } = require('../../../dbHelper');
const handleFrameGeneration = require('./frameGeneration');
const handleSingleFrameGeneration = require('./singleFrameGeneration');

// ============================================================
// 并发池：同时运行最多 limit 个 async 任务
// ============================================================
async function runPool(tasks, limit, onTaskDone) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  let doneCount = 0;

  return new Promise((resolve, reject) => {
    function runNext() {
      if (doneCount === tasks.length) {
        return resolve(results);
      }
      while (nextIndex < tasks.length && (nextIndex - doneCount) < limit) {
        const idx = nextIndex++;
        tasks[idx]()
          .then(res => { results[idx] = res; })
          .catch(err => { results[idx] = err; })
          .finally(() => {
            doneCount++;
            if (onTaskDone) onTaskDone(doneCount, tasks.length);
            runNext();
          });
      }
    }
    runNext();
  });
}

async function handleBatchFrameGeneration(inputParams, onProgress) {
  const {
    scriptId, imageModel, textModel, overwriteFrames = false,
    width, height, maxConcurrency = 5
  } = inputParams;

  if (!scriptId) {
    throw new Error('缺少必要参数: scriptId');
  }
  if (!imageModel) {
    throw new Error('imageModel 参数是必需的');
  }

  const concurrency = Math.min(Math.max(Number(maxConcurrency) || 5, 1), 100);
  console.log(`[BatchFrameGen] 开始批量生成，scriptId: ${scriptId}, 覆盖: ${overwriteFrames}, 并发: ${concurrency}`);

  // 1. 查询所有分镜
  const storyboards = await queryAll(
    'SELECT id, prompt_template, variables_json, first_frame_url, last_frame_url FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
    [scriptId]
  );

  if (!storyboards || storyboards.length === 0) {
    throw new Error('该剧本下没有分镜数据');
  }

  const total = storyboards.length;
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  // 2. 构建任务列表：跳过不需要生成的，其余包装成 async 函数
  const taskFns = [];
  const taskMeta = []; // 保持与 taskFns 一一对应的元信息

  for (let i = 0; i < storyboards.length; i++) {
    const sb = storyboards[i];
    const vars = typeof sb.variables_json === 'string'
      ? JSON.parse(sb.variables_json || '{}')
      : (sb.variables_json || {});
    const hasAction = vars.hasAction || false;
    const hasExistingFrame = !!sb.first_frame_url;

    // 跳过
    if (!overwriteFrames && hasExistingFrame) {
      console.log(`[BatchFrameGen] [${i + 1}/${total}] 分镜 ${sb.id} 已有帧图片，跳过`);
      skipped++;
      results.push({ storyboardId: sb.id, status: 'skipped' });
      continue;
    }

    const description = sb.prompt_template || '';
    const idx = i;

    // 包装成 async 函数放入池
    taskFns.push(async () => {
      if (hasAction) {
        console.log(`[BatchFrameGen] [${idx + 1}/${total}] 分镜 ${sb.id} 有动作，生成首尾帧...`);
        return await handleFrameGeneration({
          storyboardId: sb.id,
          prompt: description,
          imageModel,
          textModel,
          width: width || 1024,
          height: height || 576
        }, null);
      } else {
        console.log(`[BatchFrameGen] [${idx + 1}/${total}] 分镜 ${sb.id} 无动作，生成单帧...`);
        return await handleSingleFrameGeneration({
          storyboardId: sb.id,
          description,
          imageModel,
          textModel,
          width: width || 1024,
          height: height || 576
        }, null);
      }
    });

    taskMeta.push({ storyboardId: sb.id, index: idx, hasAction });
  }

  console.log(`[BatchFrameGen] 需要生成: ${taskFns.length}, 跳过: ${skipped}, 并发: ${concurrency}`);

  if (onProgress) onProgress(5);

  // 3. 并发池执行
  if (taskFns.length > 0) {
    const poolResults = await runPool(taskFns, concurrency, (done, taskTotal) => {
      // 进度：5% ~ 95%
      const pct = 5 + Math.floor((done / taskTotal) * 90);
      if (onProgress) onProgress(pct);
    });

    // 4. 收集结果
    for (let i = 0; i < poolResults.length; i++) {
      const meta = taskMeta[i];
      const res = poolResults[i];
      if (res instanceof Error) {
        console.error(`[BatchFrameGen] 分镜 ${meta.storyboardId} 生成失败:`, res.message);
        failed++;
        results.push({ storyboardId: meta.storyboardId, status: 'failed', error: res.message });
      } else {
        console.log(`[BatchFrameGen] 分镜 ${meta.storyboardId} 生成成功`);
        completed++;
        results.push({
          storyboardId: meta.storyboardId,
          status: 'completed',
          type: meta.hasAction ? 'frame' : 'single_frame',
          ...res
        });
      }
    }
  }

  if (onProgress) onProgress(100);
  console.log(`[BatchFrameGen] 批量生成完成: 总计=${total}, 成功=${completed}, 跳过=${skipped}, 失败=${failed}`);

  return {
    total,
    completed,
    skipped,
    failed,
    results
  };
}

module.exports = handleBatchFrameGeneration;
