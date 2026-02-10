/**
 * 批量分镜帧生成处理器（串行链式模式）
 * 一键生成一集所有分镜的首帧/首尾帧图片
 * 
 * 为保持镜头间连续性，必须串行生成：
 * 每个镜头的首帧需要上一镜头的尾帧作为参考图，提示词也需要上一镜头描述作为上下文。
 * 
 * 逻辑：
 * 1. 查询 scriptId 下所有分镜（按 idx 排序）
 * 2. 串行遍历每个分镜：
 *    - 跳过已有帧的（除非 overwriteFrames=true），但仍然取其尾帧传递给下一个
 *    - hasAction=true  → 调用 frameGeneration（首尾帧）
 *    - hasAction=false → 调用 singleFrameGeneration（单帧）
 *    - 传入 prevEndFrameUrl + prevDescription 保持连续性
 * 3. 每个镜头完成后，取其“最终帧”传给下一个：
 *    - 动作镜头 → last_frame_url
 *    - 静态镜头 → first_frame_url
 * 4. 某个失败 → 记录错误，链条中断（后续镜头将缺少参考图）
 * 
 * input:  { scriptId, imageModel, textModel, overwriteFrames, width, height }
 * output: { total, completed, skipped, failed, results[] }
 */

const { queryAll, execute } = require('../../../dbHelper');
const handleFrameGeneration = require('./frameGeneration');
const handleSingleFrameGeneration = require('./singleFrameGeneration');

/**
 * 获取分镜的"最终帧" URL
 * - 动作镜头（hasAction=true）→ 尾帧 last_frame_url
 * - 静态镜头（hasAction=false）→ 首帧 first_frame_url
 */
function getFinalFrameUrl(sb, vars) {
  const hasAction = vars.hasAction || false;
  if (hasAction && sb.last_frame_url) {
    return sb.last_frame_url;
  }
  return sb.first_frame_url || null;
}

async function handleBatchFrameGeneration(inputParams, onProgress) {
  const {
    scriptId, imageModel, textModel, overwriteFrames = false,
    width, height
  } = inputParams;

  if (!scriptId) {
    throw new Error('缺少必要参数: scriptId');
  }
  if (!imageModel) {
    throw new Error('imageModel 参数是必需的');
  }

  console.log(`[BatchFrameGen] 开始批量串行生成，scriptId: ${scriptId}, 覆盖: ${overwriteFrames}`);

  // 0. 覆盖模式：先批量清除所有分镜的首尾帧，让前端立即看到帧被清除
  if (overwriteFrames) {
    console.log('[BatchFrameGen] 覆盖模式：清除所有已有首尾帧...');
    await execute(
      'UPDATE storyboards SET first_frame_url = NULL, last_frame_url = NULL, updated_scene_url = NULL WHERE script_id = ?',
      [scriptId]
    );
    console.log('[BatchFrameGen] 已清除所有首尾帧');
  }

  // 1. 查询所有分镜（按顺序）
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

  // 链式传递的上一镜头信息
  let prevEndFrameUrl = null;
  let prevDescription = null;

  if (onProgress) onProgress(5);

  // 2. 串行遍历每个分镜
  for (let i = 0; i < storyboards.length; i++) {
    const sb = storyboards[i];
    const vars = typeof sb.variables_json === 'string'
      ? JSON.parse(sb.variables_json || '{}')
      : (sb.variables_json || {});
    const hasAction = vars.hasAction || false;
    const hasExistingFrame = !!sb.first_frame_url;
    const description = sb.prompt_template || '';
    const isFirstScene = (i === 0);

    // 跳过已有帧的分镜（但仍然要取其最终帧传递给下一个）
    if (!overwriteFrames && hasExistingFrame) {
      console.log(`[BatchFrameGen] [${i + 1}/${total}] 分镜 ${sb.id} 已有帧图片，跳过（传递尾帧给下一镜头）`);
      prevEndFrameUrl = getFinalFrameUrl(sb, vars);
      prevDescription = description;
      skipped++;
      results.push({ storyboardId: sb.id, status: 'skipped' });
      continue;
    }

    try {
      let res;
      if (hasAction) {
        console.log(`[BatchFrameGen] [${i + 1}/${total}] 分镜 ${sb.id} 有动作，生成首尾帧...`);
        res = await handleFrameGeneration({
          storyboardId: sb.id,
          prompt: description,
          imageModel,
          textModel,
          width: width || 1024,
          height: height || 576,
          prevEndFrameUrl,
          prevDescription,
          isFirstScene
        }, null);
        // 动作镜头的最终帧 = 尾帧
        prevEndFrameUrl = res.endFrame || res.startFrame;
      } else {
        console.log(`[BatchFrameGen] [${i + 1}/${total}] 分镜 ${sb.id} 无动作，生成单帧...`);
        res = await handleSingleFrameGeneration({
          storyboardId: sb.id,
          description,
          imageModel,
          textModel,
          width: width || 1024,
          height: height || 576,
          prevEndFrameUrl,
          prevDescription,
          isFirstScene
        }, null);
        // 静态镜头的最终帧 = 首帧
        prevEndFrameUrl = res.firstFrameUrl;
      }

      prevDescription = description;
      completed++;
      console.log(`[BatchFrameGen] 分镜 ${sb.id} 生成成功`);
      results.push({
        storyboardId: sb.id,
        status: 'completed',
        type: hasAction ? 'frame' : 'single_frame',
        ...res
      });
    } catch (err) {
      console.error(`[BatchFrameGen] 分镜 ${sb.id} 生成失败:`, err.message);
      failed++;
      results.push({ storyboardId: sb.id, status: 'failed', error: err.message });
      // 失败后立即中断：后续镜头缺少参考图，继续生成无意义
      console.error(`[BatchFrameGen] 链条中断，跳过剩余 ${total - i - 1} 个镜头`);
      break;
    }

    // 进度：5% ~ 95%
    const pct = 5 + Math.floor(((i + 1) / total) * 90);
    if (onProgress) onProgress(pct);
  }

  if (onProgress) onProgress(100);
  console.log(`[BatchFrameGen] 批量串行生成完成: 总计=${total}, 成功=${completed}, 跳过=${skipped}, 失败=${failed}`);

  return {
    total,
    completed,
    skipped,
    failed,
    results
  };
}

module.exports = handleBatchFrameGeneration;
