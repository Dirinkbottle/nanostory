const express = require('express');
const { authMiddleware } = require('./middleware');
const { getBillingSummary, listBillingRecords } = require('./aiBillingService');
const modelStatsRoutes = require('./billingHandlers/modelStats');

const router = express.Router();

// 注册模型统计路由
modelStatsRoutes(router);

router.get('/summary', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const summary = await getBillingSummary(userId);
    return res.json(summary);
  } catch (err) {
    console.error('DB error in billing summary:', err);
    return res.status(500).json({ message: 'Failed to fetch billing summary' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await listBillingRecords(userId, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0,
      chargeStatus: req.query.chargeStatus || null,
      modelCategory: req.query.modelCategory || null,
      sourceType: req.query.sourceType || null
    });

    return res.json(result.records);
  } catch (err) {
    console.error('DB error in billing history:', err);
    return res.status(500).json({ message: 'Failed to fetch billing history' });
  }
});

module.exports = router;
