/**
 * 批量草图帧生成处理器
 * 一键生成一集所有分镜的草图转图片
 * 
 * 与 batchFrameGeneration 不同：
 * 1. 只处理已上传草图的分镜（sketch_url 不为空）
 * 2. 使用草图作为控制图进行生成
 * 3. 支持并发处理（草图控制不需要严格的链式传递）
 * 
 * 逻辑：
 * 1. 查询 scriptId 下所有分镜（按 idx 排序）
 * 2. 过滤出有草图的分镜
 * 3. 并发处理每个分镜的草图转图片
 * 4. 容错机制：某个镜头失败时记录错误，继续处理其他镜头
 * 
 * input:  { scriptId, imageModel, textModel, aspectRatio, controlStrength, overwriteFrames, maxConcurrency }
 * output: { total, totalWithSketch, completed, skipped, failed, results[] }
 */

const { queryAll, execute } = require('../../../dbHelper');
const handleSketchToImage = require('./sketchToImage');

/**
 * 控制并发数量的执行器
 * @param {Array} items - 待处理项
 * @param {number} concurrency - 并发数
 * @param {Function} handler - 处理函数 (item, index) => Promise
 * @returns {Promise<Array>} 处理结果数组
 */
async function runWithConcurrency(items, concurrency, handler) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      try {
        results[index] = await handler(item, index);
      } catch (err) {
        results[index] = { error: err.message, item };
      }
    }
  }

  // 启动 concurrency 个 worker
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}

async function handleBatchSketchFrameGeneration(inputParams, onProgress) {
  const {
    scriptId,
    imageModel,
    textModel,
    aspectRatio,
    controlStrength = 0.8,
    overwriteFrames = false,
    maxConcurrency = 5
  } = inputParams;

  if (!scriptId) {
    throw new Error('缺少必要参数: scriptId');
  }
  if (!imageModel) {
    throw new Error('imageModel 参数是必需的');
  }

  console.log(`[BatchSketchGen] 开始批量草图帧生成，scriptId: ${scriptId}, 覆盖: ${overwriteFrames}, 并发: ${maxConcurrency}`);

  // 0. 覆盖模式：先批量清除有草图分镜的首尾帧
  if (overwriteFrames) {
    console.log('[BatchSketchGen] 覆盖模式：清除有草图分镜的首尾帧...');
    await execute(
      'UPDATE storyboards SET first_frame_url = NULL, last_frame_url = NULL WHERE script_id = ? AND sketch_url IS NOT NULL AND sketch_url != ""',
      [scriptId]
    );
    console.log('[BatchSketchGen] 已清除相关首尾帧');
  }

  // 1. 查询所有分镜（按顺序）
  const storyboards = await queryAll(
    'SELECT id, prompt_template, variables_json, first_frame_url, last_frame_url, sketch_url, sketch_type FROM storyboards WHERE script_id = ? ORDER BY idx ASC',
    [scriptId]
  );

  if (!storyboards || storyboards.length === 0) {
    throw new Error('该剧本下没有分镜数据');
  }

  const total = storyboards.length;

  // 2. 过滤出有草图的分镜
  const storyboardsWithSketch = storyboards.filter(sb => sb.sketch_url && sb.sketch_url.trim() !== '');
  const totalWithSketch = storyboardsWithSketch.length;

  if (totalWithSketch === 0) {
    console.log('[BatchSketchGen] 没有发现上传了草图的分镜');
    return {
      total,
      totalWithSketch: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      results: [],
      message: '没有发现上传了草图的分镜，请先为分镜上传草图'
    };
  }

  console.log(`[BatchSketchGen] 发现 ${totalWithSketch}/${total} 个分镜有草图`);

  // 3. 过滤需要处理的分镜（跳过已有帧的）
  const toProcess = [];
  const skippedResults = [];

  for (const sb of storyboardsWithSketch) {
    const hasExistingFrame = !!sb.first_frame_url;
    if (!overwriteFrames && hasExistingFrame) {
      console.log(`[BatchSketchGen] 分镜 ${sb.id} 已有帧图片，跳过`);
      skippedResults.push({ storyboardId: sb.id, status: 'skipped' });
    } else {
      toProcess.push(sb);
    }
  }

  const skipped = skippedResults.length;
  console.log(`[BatchSketchGen] 需要处理: ${toProcess.length}, 跳过: ${skipped}`);

  if (toProcess.length === 0) {
    return {
      total,
      totalWithSketch,
      completed: 0,
      skipped,
      failed: 0,
      results: skippedResults,
      message: '所有有草图的分镜都已生成帧图片'
    };
  }

  if (onProgress) onProgress(5);

  // 4. 并发处理草图转图片
  let processedCount = 0;
  const processResults = await runWithConcurrency(toProcess, maxConcurrency, async (sb, index) => {
    const description = sb.prompt_template || '';
    const sketchUrl = sb.sketch_url;
    const sketchType = sb.sketch_type || 'storyboard_sketch';

    console.log(`[BatchSketchGen] [${processedCount + 1}/${toProcess.length}] 处理分镜 ${sb.id}...`);

    try {
      const res = await handleSketchToImage({
        storyboardId: sb.id,
        processedSketchUrl: sketchUrl,
        sketchType,
        prompt: description,
        controlStrength,
        imageModel,
        textModel,
        aspectRatio
      }, null);

      processedCount++;
      console.log(`[BatchSketchGen] 分镜 ${sb.id} 生成成功`);

      // 更新进度
      const pct = 5 + Math.floor((processedCount / toProcess.length) * 90);
      if (onProgress) onProgress(pct);

      return {
        storyboardId: sb.id,
        status: 'completed',
        ...res
      };
    } catch (err) {
      processedCount++;
      console.error(`[BatchSketchGen] 分镜 ${sb.id} 生成失败:`, err.message);

      // 更新进度
      const pct = 5 + Math.floor((processedCount / toProcess.length) * 90);
      if (onProgress) onProgress(pct);

      return {
        storyboardId: sb.id,
        status: 'failed',
        error: err.message
      };
    }
  });

  // 5. 统计结果
  let completed = 0;
  let failed = 0;
  const allResults = [...skippedResults];

  for (const res of processResults) {
    if (res.status === 'completed') {
      completed++;
    } else if (res.status === 'failed' || res.error) {
      failed++;
    }
    allResults.push(res);
  }

  if (onProgress) onProgress(100);
  console.log(`[BatchSketchGen] 批量草图帧生成完成: 总计=${total}, 有草图=${totalWithSketch}, 成功=${completed}, 跳过=${skipped}, 失败=${failed}`);

  return {
    total,
    totalWithSketch,
    completed,
    skipped,
    failed,
    controlStrength,
    maxConcurrency,
    results: allResults
  };
}

module.exports = handleBatchSketchFrameGeneration;
