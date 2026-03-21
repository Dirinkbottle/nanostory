/**
 * 草图预处理处理器
 *
 * 流程：
 * 1. 验证草图文件存在
 * 2. 如果 sketch_type 未指定，根据图片特征自动推测
 *    - SVG 文件 → detailed_lineart
 *    - 其他默认 → storyboard_sketch
 * 3. 标准化图片尺寸（如需要）
 * 4. 返回处理后的草图信息
 *
 * input:  { storyboardId, sketchUrl, sketchType }
 * output: { processedSketchUrl, sketchType, width, height }
 */

const { queryOne } = require('../../../dbHelper');
const { traced, trace } = require('../../engine/generationTrace');
const path = require('path');

/**
 * 推测草图类型
 * @param {string} url - 草图 URL
 * @returns {string} - 'detailed_lineart' | 'storyboard_sketch'
 */
function inferSketchType(url) {
  if (!url) return 'storyboard_sketch';
  
  const urlLower = url.toLowerCase();
  const ext = path.extname(urlLower);
  
  // SVG 文件通常是矢量线稿，推测为 detailed_lineart
  if (ext === '.svg' || urlLower.includes('.svg')) {
    return 'detailed_lineart';
  }
  
  // 文件名包含 lineart 或 line-art 关键词
  if (urlLower.includes('lineart') || urlLower.includes('line-art') || urlLower.includes('line_art')) {
    return 'detailed_lineart';
  }
  
  // 默认为分镜草图
  return 'storyboard_sketch';
}

/**
 * 验证 URL 是否有效（简单检查格式）
 * @param {string} url 
 * @returns {boolean}
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // 支持 http/https URL 和相对路径
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('/') ||
         url.startsWith('data:');
}

/**
 * 草图预处理主函数
 */
const handleSketchPreprocess = traced('草图预处理', async function _handleSketchPreprocess(inputParams, onProgress) {
  const { storyboardId, sketchUrl, sketchType: inputSketchType } = inputParams;

  if (!storyboardId) {
    throw new Error('缺少必要参数: storyboardId');
  }

  if (!sketchUrl) {
    throw new Error('缺少必要参数: sketchUrl（草图 URL）');
  }

  console.log('[SketchPreprocess] 开始草图预处理，storyboardId:', storyboardId);
  if (onProgress) onProgress(10);

  // 1. 验证草图 URL 格式
  if (!isValidUrl(sketchUrl)) {
    throw new Error(`无效的草图 URL: ${sketchUrl}`);
  }
  trace('验证草图URL', { sketchUrl, isValid: true });

  // 2. 查询分镜数据（用于日志和后续处理）
  const storyboard = await queryOne(
    'SELECT id, script_id, idx, prompt_template FROM storyboards WHERE id = ?',
    [storyboardId]
  );
  if (!storyboard) {
    throw new Error(`分镜 ${storyboardId} 不存在`);
  }
  if (onProgress) onProgress(30);

  // 3. 确定草图类型
  let sketchType = inputSketchType;
  if (!sketchType || sketchType.trim() === '') {
    sketchType = inferSketchType(sketchUrl);
    console.log(`[SketchPreprocess] 自动推测草图类型: ${sketchType}`);
  }
  
  // 验证草图类型有效性
  const validSketchTypes = ['storyboard_sketch', 'detailed_lineart'];
  if (!validSketchTypes.includes(sketchType)) {
    console.warn(`[SketchPreprocess] 未知的草图类型 "${sketchType}"，回退到默认值 storyboard_sketch`);
    sketchType = 'storyboard_sketch';
  }
  trace('确定草图类型', { sketchType, wasAutoInferred: !inputSketchType });
  if (onProgress) onProgress(50);

  // 4. 草图尺寸处理
  // 当前实现：直接使用原始草图 URL，不做尺寸调整
  // 如果需要调整尺寸，可以在这里添加图片处理逻辑
  let processedSketchUrl = sketchUrl;
  let width = null;
  let height = null;

  // TODO: 如果需要实际的尺寸标准化，可以集成 sharp 等图片处理库
  // 这里假设草图已经是合适的尺寸，或者图片生成模型会自动处理
  
  // 可以尝试从 URL 或文件名推断尺寸信息（如果有的话）
  // 目前返回 null，让图片生成模型决定输出尺寸
  
  if (onProgress) onProgress(80);
  trace('草图预处理完成', { 
    processedSketchUrl, 
    sketchType, 
    width, 
    height,
    storyboardIdx: storyboard.idx 
  });

  if (onProgress) onProgress(100);
  console.log('[SketchPreprocess] 草图预处理完成');

  return {
    processedSketchUrl,
    sketchType,
    width,
    height
  };
}, {
  extractInput: (params) => ({ 
    storyboardId: params.storyboardId, 
    sketchUrl: params.sketchUrl?.substring(0, 100),
    sketchType: params.sketchType 
  }),
  extractOutput: (r) => ({ 
    sketchType: r.sketchType, 
    width: r.width, 
    height: r.height 
  })
});

module.exports = handleSketchPreprocess;
