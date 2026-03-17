/**
 * AI 模型相关路由（普通用户可访问）
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./middleware');
const { queryAll } = require('./dbHelper');
const { parseJsonField } = require('./utils/parseJsonField');

/**
 * GET /api/ai-models
 * 获取可用的 AI 模型列表（普通用户可访问）
 * 可选参数：type (TEXT/IMAGE/VIDEO/AUDIO)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;

    let query = `
      SELECT id, name, category, provider, description, is_active, price_config,
             supported_aspect_ratios, supported_durations
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
      models: models.map(m => {
        // 解析 price_config JSON
        let priceConfig = null;
        if (m.price_config) {
          try {
            const parsed = parseJsonField(m.price_config);
            priceConfig = {
              unit: parsed.unit || 'token',
              price: parsed.price || 0
            };
          } catch (err) {
            console.warn(`[Get AI Models] 解析 price_config 失败 (${m.name}):`, err.message);
          }
        }

        return {
          id: m.id,
          name: m.name,
          provider: m.provider,
          type: m.category,
          description: m.description,
          isActive: m.is_active === 1,
          priceConfig,
          supportedAspectRatios: parseJsonField(m.supported_aspect_ratios, []),
          supportedDurations: parseJsonField(m.supported_durations, [])
        };
      })
    });
  } catch (error) {
    console.error('[Get AI Models]', error);
    res.status(500).json({ message: '获取模型列表失败: ' + error.message });
  }
});

module.exports = router;
