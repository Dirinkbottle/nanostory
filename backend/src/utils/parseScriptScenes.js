/**
 * 剧本场景解析工具
 * 从剧本内容中识别并分离各个场景
 */

/**
 * 解析剧本内容，识别并分离各个场景
 * @param {string} scriptContent - 剧本内容
 * @returns {Array<{sceneNumber: number, sceneName: string, content: string}>}
 */
function parseScriptScenes(scriptContent) {
  if (!scriptContent || scriptContent.trim() === '') {
    return [];
  }

  const scenes = [];
  
  // 场景标题匹配模式
  // 匹配格式：## 场景1：xxx  或  ## 场景1:xxx  或  ## 场景一：xxx  等
  const sceneHeaderPattern = /^##\s*场景\s*(\d+|[一二三四五六七八九十]+)\s*[:：]\s*(.*)$/gm;
  
  // 找到所有场景标题的位置
  const sceneHeaders = [];
  let match;
  while ((match = sceneHeaderPattern.exec(scriptContent)) !== null) {
    sceneHeaders.push({
      index: match.index,
      fullMatch: match[0],
      sceneNumber: parseSceneNumber(match[1]),
      sceneName: match[2].trim()
    });
  }

  // 如果没有找到标准格式的场景标题，尝试其他格式
  if (sceneHeaders.length === 0) {
    // 尝试匹配：【场景1】 或 [场景1] 格式
    const altPattern1 = /^[【\[]\s*场景\s*(\d+|[一二三四五六七八九十]+)\s*[】\]]\s*[:：]?\s*(.*)$/gm;
    while ((match = altPattern1.exec(scriptContent)) !== null) {
      sceneHeaders.push({
        index: match.index,
        fullMatch: match[0],
        sceneNumber: parseSceneNumber(match[1]),
        sceneName: match[2].trim()
      });
    }
  }

  if (sceneHeaders.length === 0) {
    // 尝试匹配：场景一：xxx 或 场景1：xxx（无 ## 前缀）
    const altPattern2 = /^场景\s*(\d+|[一二三四五六七八九十]+)\s*[:：]\s*(.*)$/gm;
    while ((match = altPattern2.exec(scriptContent)) !== null) {
      sceneHeaders.push({
        index: match.index,
        fullMatch: match[0],
        sceneNumber: parseSceneNumber(match[1]),
        sceneName: match[2].trim()
      });
    }
  }

  // 如果仍然没有找到场景标题，将整个剧本作为一个场景
  if (sceneHeaders.length === 0) {
    return [{
      sceneNumber: 1,
      sceneName: '完整剧本',
      content: scriptContent.trim()
    }];
  }

  // 按位置排序
  sceneHeaders.sort((a, b) => a.index - b.index);

  // 提取每个场景的内容
  for (let i = 0; i < sceneHeaders.length; i++) {
    const header = sceneHeaders[i];
    const startIndex = header.index;
    const endIndex = i < sceneHeaders.length - 1 
      ? sceneHeaders[i + 1].index 
      : scriptContent.length;
    
    // 提取场景内容（包含标题）
    const sceneContent = scriptContent.slice(startIndex, endIndex).trim();
    
    scenes.push({
      sceneNumber: header.sceneNumber,
      sceneName: header.sceneName || `场景${header.sceneNumber}`,
      content: sceneContent
    });
  }

  // 处理场景标题前的内容（如果有）
  if (sceneHeaders.length > 0 && sceneHeaders[0].index > 0) {
    const preamble = scriptContent.slice(0, sceneHeaders[0].index).trim();
    if (preamble.length > 50) {
      // 如果前言内容较长，可能是未标记的场景或序幕
      scenes.unshift({
        sceneNumber: 0,
        sceneName: '序幕',
        content: preamble
      });
    }
  }

  console.log(`[parseScriptScenes] 识别到 ${scenes.length} 个场景:`, 
    scenes.map(s => `场景${s.sceneNumber}(${s.sceneName})`).join(', '));

  return scenes;
}

/**
 * 将中文数字转换为阿拉伯数字
 * @param {string} numStr - 数字字符串（可能是阿拉伯数字或中文数字）
 * @returns {number}
 */
function parseSceneNumber(numStr) {
  // 如果是阿拉伯数字，直接转换
  if (/^\d+$/.test(numStr)) {
    return parseInt(numStr, 10);
  }
  
  // 中文数字映射
  const cnNumMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  };
  
  // 处理十位数（如：十一、二十一）
  if (numStr.includes('十')) {
    if (numStr === '十') return 10;
    const parts = numStr.split('十');
    const tens = parts[0] ? cnNumMap[parts[0]] || 0 : 1;
    const ones = parts[1] ? cnNumMap[parts[1]] || 0 : 0;
    return tens * 10 + ones;
  }
  
  return cnNumMap[numStr] || 1;
}

/**
 * 获取场景数量
 * @param {string} scriptContent - 剧本内容
 * @returns {number}
 */
function getSceneCount(scriptContent) {
  const scenes = parseScriptScenes(scriptContent);
  return scenes.length;
}

module.exports = {
  parseScriptScenes,
  parseSceneNumber,
  getSceneCount
};
