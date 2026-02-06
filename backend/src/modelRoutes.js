/**
 * AI 模型相关路由（普通用户可访问）
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./middleware');
const { queryAll } = require('./dbHelper');

/**
 * GET /api/ai-models
 * 获取可用的 AI 模型列表（普通用户可访问）
 * 可选参数：type (TEXT/IMAGE/VIDEO/AUDIO)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = `
      SELECT id, name, category, provider, description, is_active
      FROM ai_model_configs 
      WHERE is_active = 1
    `;
    const params = [];
    
    if (type) {
      query += ' AND category = ?';
      params.push(type);
    }
    
    query += ' ORDER BY name';
    
    const models = await queryAll(query, params);
    
    res.json({ 
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        type: m.category,
        description: m.description,
        isActive: m.is_active === 1
      }))
    });
  } catch (error) {
    console.error('[Get AI Models]', error);
    res.status(500).json({ message: '获取模型列表失败: ' + error.message });
  }
});

module.exports = router;
