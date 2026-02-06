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
  
  return result;
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
        
        if (queryResult.status === 'completed' || queryResult.status === 'success' || queryResult.status === 1 || queryResult.status === 2) {
          imageUrl = queryResult.image_url || queryResult.imageUrl;
          break;
        } else if (queryResult.status === 'failed' || queryResult.status === 'error' || queryResult.status === 3) {
          throw new Error('图片生成失败');
        }
      }
      
      if (!imageUrl) {
        throw new Error('图片生成超时，请稍后重试');
      }
      
      return res.json({
        success: true,
        imageUrl,
        model: targetModel
      });
    }
    
    // 同步模式：直接获取图片 URL
    const imageUrl = result.imageUrl || result.url || result.image_url || result.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error('模型返回结果中没有图片 URL');
    }
    
    res.json({
      success: true,
      imageUrl,
      model: targetModel
    });
    
  } catch (error) {
    console.error('[Image Generate] Error:', error);
    res.status(500).json({ 
      message: error.message || '图片生成失败',
      error: error.message 
    });
  }
});

module.exports = router;
