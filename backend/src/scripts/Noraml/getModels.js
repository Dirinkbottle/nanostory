/**
 * GET /api/scripts/models
 * 获取所有可用的文本模型
 */

const { getTextModels } = require('../../aiModelService');

async function getModels(req, res) {
  try {
    const models = await getTextModels();
    res.json({ models });
  } catch (error) {
    console.error('[Get Text Models]', error);
    res.status(500).json({ message: '获取模型列表失败' });
  }
}

module.exports = getModels;
