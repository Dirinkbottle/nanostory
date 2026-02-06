const express = require('express');
const { queryOne, execute } = require('./dbHelper');
const { authMiddleware } = require('./middleware');
const { VIDEO_MODELS } = require('./models');
const { callAIModel, getImageModels } = require('./aiModelService');

const router = express.Router();

// 获取所有视频模型配置
router.get('/models', (req, res) => {
  const models = Object.entries(VIDEO_MODELS).map(([key, config]) => ({
    id: key,
    ...config
  }));

  res.json({ models });
});

// 单分镜生成视频（图生视频）
router.post('/generate-scene', authMiddleware, async (req, res) => {
  const { prompt, imageUrl, startFrame, endFrame, duration = 5 } = req.body;
  const userId = req.user.id;

  if (!prompt) {
    return res.status(400).json({ message: '请提供画面描述' });
  }

  try {
    console.log('[Video Generate Scene]', { prompt: prompt.substring(0, 50), duration });
    
    // 构建视频生成提示词
    let videoPrompt = prompt;
    if (startFrame && endFrame) {
      videoPrompt = `动画视频：从"${startFrame}"过渡到"${endFrame}"。${prompt}`;
    }
    
    // 调用 sora2-new 模型生成视频
    const result = await callAIModel('sora2-new', {
      prompt: videoPrompt,
      duration: String(Math.min(duration, 10)), // 最大10秒，无最小限制
      size: 'small',
      aspectRatio: '16:9'
    });
    
    console.log('[Video Generate] Initial result:', JSON.stringify(result, null, 2));
    
    const taskId = result.task_id || result.taskId;
    
    if (!taskId) {
      throw new Error('未获取到任务 ID');
    }
    
    // 轮询查询视频生成状态
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待 120 秒
    
    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      console.log(`[Video Generate] 查询任务状态，第 ${attempts} 次...`);
      
      const queryResult = await queryVideoTaskStatus(taskId);
      console.log('[Video Generate] Query result:', JSON.stringify(queryResult, null, 2));
      
      if (queryResult.status === 2 || queryResult.status === 'completed' || queryResult.status === 'success') {
        // status 2 可能是失败，需要检查是否有视频URL
        if (queryResult.video_url) {
          videoUrl = queryResult.video_url || queryResult.videoUrl;
          break;
        } else if (queryResult.fail_reason) {
          throw new Error(queryResult.fail_reason);
        }
      } else if (queryResult.status === 3 || queryResult.status === 'failed' || queryResult.status === 'error') {
        throw new Error(queryResult.fail_reason || '视频生成失败');
      }
    }
    
    if (!videoUrl) {
      throw new Error('视频生成超时，请稍后重试');
    }
    
    res.json({
      success: true,
      videoUrl,
      duration,
      message: '视频生成成功'
    });
  } catch (error) {
    console.error('[Video Generate Scene]', error);
    res.status(500).json({ message: '视频生成失败：' + error.message });
  }
});

// 查询视频任务状态
async function queryVideoTaskStatus(taskId) {
  const { queryOne } = require('./dbHelper');
  const fetch = require('node-fetch');
  
  const model = await queryOne(
    'SELECT * FROM ai_model_configs WHERE name = ? AND is_active = 1',
    ['sora2-new']
  );
  
  if (!model || !model.query_url_template) {
    throw new Error('视频模型未配置查询接口');
  }
  
  const apiKey = model.api_key;
  const queryUrl = model.query_url_template
    .replace('{{apiKey}}', apiKey)
    .replace('{{task_id}}', taskId);
  
  console.log(`[Video Query] URL: ${queryUrl}`);
  
  const response = await fetch(queryUrl, {
    method: model.query_method || 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset:utf-8;',
      'Authorization': apiKey
    }
  });
  
  const data = await response.json();
  console.log('[Video Query] Response:', JSON.stringify(data, null, 2));
  
  return {
    status: data.data?.status,
    video_url: data.data?.remote_url,
    fail_reason: data.data?.fail_reason
  };
}

// 生成视频（占位实现）
router.post('/generate', authMiddleware, async (req, res) => {
  const { scriptId, modelTier, duration } = req.body;
  const userId = req.user.id;

  if (!modelTier || !VIDEO_MODELS[modelTier]) {
    return res.status(400).json({ message: '无效的模型档次' });
  }

  const model = VIDEO_MODELS[modelTier];

  try {
    // 计算费用
    const videoDuration = Math.min(duration || 10, model.maxDuration);
    const amount = videoDuration * model.pricing.perSecond;

    // 检查用户余额
    const user = await queryOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < amount) {
      return res.status(402).json({
        message: '余额不足，请充值',
        required: amount,
        current: user?.balance || 0
      });
    }

    // 扣除余额
    await execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

    // 记录计费
    await execute(
      'INSERT INTO billing_records (user_id, script_id, operation, model_provider, model_tier, tokens, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, scriptId || null, '视频生成', model.provider, modelTier, videoDuration, model.pricing.perSecond, amount]
    );

    const newBalance = user.balance - amount;

    // 返回占位视频URL（实际应该调用真实API）
    res.json({
      success: true,
      videoUrl: `https://placeholder.video/${Date.now()}.mp4`,
      model: model.displayName,
      tier: model.tier,
      duration: videoDuration,
      cost: amount,
      balance: newBalance,
      message: '视频生成成功'
    });
  } catch (error) {
    console.error('[Video Generate]', error);
    res.status(500).json({ message: '生成失败：' + error.message });
  }
});

module.exports = router;