const express = require('express');
const { authMiddleware } = require('./middleware');
const { callAIModel, getImageModels } = require('./aiModelService');
const { queryOne } = require('./dbHelper');
const fetch = require('node-fetch');

const router = express.Router();

// 获取所有可用的图片模型
router.get('/models', async (req, res) => {
  try {
    const models = await getImageModels();
    res.json({ models });
  } catch (error) {
    console.error('[Get Image Models]', error);
    res.status(500).json({ message: '获取图片模型列表失败' });
  }
});

// 查询异步任务状态
async function queryTaskStatus(modelName, taskId) {
  const model = await queryOne(
    'SELECT * FROM ai_model_configs WHERE name = ? AND is_active = 1',
    [modelName]
  );
  
  if (!model || !model.query_url_template) {
    throw new Error('模型未配置查询接口');
  }
  
  const apiKey = model.api_key;
  const queryUrl = model.query_url_template
    .replace('{{apiKey}}', apiKey)
    .replace('{{task_Id}}', taskId);
  
  const queryHeaders = typeof model.query_headers_template === 'string'
    ? JSON.parse(model.query_headers_template)
    : model.query_headers_template;
  
  // 替换 headers 中的 apiKey
  const headers = {};
  for (const [key, value] of Object.entries(queryHeaders)) {
    headers[key] = String(value).replace('{{apiKey}}', apiKey);
  }
  
  console.log(`[Image Query] URL: ${queryUrl}`);
  
  const response = await fetch(queryUrl, {
    method: model.query_method || 'GET',
    headers
  });
  
  const data = await response.json();
  console.log('[Image Query] Response:', JSON.stringify(data, null, 2));
  
  // 解析响应映射
  const responseMapping = typeof model.query_response_mapping === 'string'
    ? JSON.parse(model.query_response_mapping)
    : model.query_response_mapping;
  
  const result = {};
  for (const [key, path] of Object.entries(responseMapping)) {
    const pathParts = String(path).split('.');
    let value = data;
    for (const part of pathParts) {
      value = value?.[part];
    }
    result[key] = value;
  }
  
  // 添加原始响应中的 fail_reason
  if (data.data?.fail_reason) {
    result.fail_reason = data.data.fail_reason;
  }
  
  return result;
}

// 生成单张图片（内部函数）
async function generateSingleImage(prompt, targetModel, width, height) {
  console.log(`[Image Generate] 使用模型: ${targetModel}, prompt: ${prompt.substring(0, 50)}...`);
  
  // 调用 AI 模型生成图片（获取任务 ID）
  const result = await callAIModel(targetModel, {
    prompt,
    imageSize: `${width}x${height}`,
    aspectRatio: '16:9'
  });
  
  console.log('[Image Generate] Initial result:', JSON.stringify(result, null, 2));
  
  // 检查是否是异步模式（返回 task_Id）
  const taskId = result.task_Id || result.taskId || result.id;
  
  if (taskId) {
    // 异步模式：轮询获取结果
    console.log(`[Image Generate] 异步模式，任务ID: ${taskId}`);
    
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 30; // 最多等待 60 秒
    
    while (!imageUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
      attempts++;
      
      console.log(`[Image Generate] 查询任务状态，第 ${attempts} 次...`);
      
      const queryResult = await queryTaskStatus(targetModel, taskId);
      console.log('[Image Generate] Query result:', JSON.stringify(queryResult, null, 2));
      
      // status 2 可能是成功也可能是失败，需要检查
      if (queryResult.status === 'completed' || queryResult.status === 'success' || queryResult.status === 1 || queryResult.status === 2) {
        if (queryResult.image_url || queryResult.imageUrl) {
          imageUrl = queryResult.image_url || queryResult.imageUrl;
          break;
        } else if (queryResult.fail_reason) {
          throw new Error(queryResult.fail_reason);
        }
      } else if (queryResult.status === 'failed' || queryResult.status === 'error' || queryResult.status === 3) {
        throw new Error(queryResult.fail_reason || '图片生成失败');
      }
    }
    
    if (!imageUrl) {
      throw new Error('图片生成超时，请稍后重试');
    }
    
    return imageUrl;
  }
  
  // 同步模式：直接获取图片 URL
  const imageUrl = result.imageUrl || result.url || result.image_url || result.data?.[0]?.url;
  
  if (!imageUrl) {
    throw new Error('模型返回结果中没有图片 URL');
  }
  
  return imageUrl;
}

// 生成图片（支持异步轮询）
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { prompt, modelName, width = 1024, height = 1024 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: '请提供图片描述' });
    }
    
    // 获取可用的图片模型
    const models = await getImageModels();
    
    if (models.length === 0) {
      console.log('[Image Generate] 没有配置图片模型，返回占位图');
      const encodedPrompt = encodeURIComponent(prompt.substring(0, 30));
      return res.json({
        success: true,
        imageUrl: `https://placehold.co/${width}x${height}/3b82f6/ffffff?text=${encodedPrompt}`,
        message: '当前未配置图片生成模型，显示占位图。请在管理后台配置 IMAGE 类型的 AI 模型。'
      });
    }
    
    // 使用指定的模型或第一个可用模型
    const targetModel = modelName || models[0].name;
    
    const imageUrl = await generateSingleImage(prompt, targetModel, width, height);
    
    res.json({
      success: true,
      imageUrl,
      model: targetModel
    });
    
  } catch (error) {
    console.error('[Image Generate] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || '图片生成失败',
      error: error.message 
    });
  }
});

// 生成首尾帧（两张图片）
router.post('/generate-frames', authMiddleware, async (req, res) => {
  try {
    const { prompt, modelName, width = 1024, height = 576 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: '请提供图片描述' });
    }
    
    // 获取可用的图片模型
    const models = await getImageModels();
    
    if (models.length === 0) {
      console.log('[Frame Generate] 没有配置图片模型，返回占位图');
      const encodedPrompt = encodeURIComponent(prompt.substring(0, 20));
      return res.json({
        success: true,
        startFrame: `https://placehold.co/${width}x${height}/3b82f6/ffffff?text=Start:${encodedPrompt}`,
        endFrame: `https://placehold.co/${width}x${height}/6366f1/ffffff?text=End:${encodedPrompt}`,
        message: '当前未配置图片生成模型，显示占位图。'
      });
    }
    
    const targetModel = modelName || models[0].name;
    
    console.log('[Frame Generate] 开始生成首帧...');
    
    // 生成首帧
    const startFramePrompt = `${prompt}，画面开始时刻，动作起始状态`;
    const startFrame = await generateSingleImage(startFramePrompt, targetModel, width, height);
    
    console.log('[Frame Generate] 首帧生成完成，开始生成尾帧...');
    
    // 生成尾帧（基于描述，延续首帧内容）
    const endFramePrompt = `${prompt}，画面结束时刻，动作完成状态，延续前一帧的场景和角色`;
    const endFrame = await generateSingleImage(endFramePrompt, targetModel, width, height);
    
    console.log('[Frame Generate] 尾帧生成完成');
    
    res.json({
      success: true,
      startFrame,
      endFrame,
      model: targetModel
    });
    
  } catch (error) {
    console.error('[Frame Generate] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || '首尾帧生成失败',
      error: error.message 
    });
  }
});

module.exports = router;
