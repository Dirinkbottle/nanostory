/**
 * 图片/视频参数自动派生工具
 * 
 * 从 imageUrl, imageUrls, startFrame, endFrame 中任意已有的参数自动派生其余缺失的参数。
 * 
 * 派生规则：
 *   imageUrl   → imageUrls[0] + startFrame
 *   imageUrls  → imageUrl(=[0]) + startFrame(=[0]) + endFrame(=[1])
 *   startFrame → imageUrl + imageUrls[0]
 *   endFrame   → imageUrls[1]
 * 
 * @param {Object} params
 * @param {string}   [params.imageUrl]   - 单张图片 URL
 * @param {string[]} [params.imageUrls]  - 图片 URL 数组
 * @param {string}   [params.startFrame] - 首帧 URL
 * @param {string}   [params.endFrame]   - 尾帧 URL
 * @returns {{ imageUrl: string|null, imageUrls: string[]|null, startFrame: string|null, endFrame: string|null }}
 */
function deriveImageParams({ imageUrl, imageUrls, startFrame, endFrame }) {
  let url = imageUrl || null;
  let urls = imageUrls && imageUrls.length > 0 ? [...imageUrls] : null;
  let sf = startFrame || null;
  let ef = endFrame || null;

  // ── 从 imageUrl 派生 ──
  // imageUrl → imageUrls[0], startFrame
  if (url) {
    if (!urls) urls = [url];
    if (!sf) sf = url;
  }

  // ── 从 imageUrls 派生 ──
  // imageUrls[0] → imageUrl, startFrame
  // imageUrls[1] → endFrame
  if (urls && urls.length > 0) {
    if (!url) url = urls[0];
    if (!sf) sf = urls[0];
    if (!ef && urls.length > 1) ef = urls[1];
  }

  // ── 从 startFrame 派生 ──
  // startFrame → imageUrl, imageUrls[0]
  if (sf) {
    if (!url) url = sf;
    if (!urls) urls = [sf];
    else if (!urls.includes(sf)) urls[0] = sf;
  }

  // ── 从 endFrame 派生 ──
  // endFrame → imageUrls[1]
  if (ef) {
    if (!urls) urls = [sf || ef, ef];
    else if (urls.length < 2) urls.push(ef);
  }

  return { imageUrl: url, imageUrls: urls, startFrame: sf, endFrame: ef };
}

module.exports = { deriveImageParams };
