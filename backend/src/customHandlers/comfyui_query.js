/**
 * ComfyUI 查询 Handler
 * 
 * 功能：轮询 ComfyUI 任务状态，获取生成结果
 * 
 * 查询逻辑：
 * 1. 从 params 或 rendered 中获取 prompt_id
 * 2. GET /history/${prompt_id} 获取执行历史
 * 3. 解析响应，返回统一的状态格式
 */

const fetch = require('node-fetch');

module.exports = {
  /**
   * 自定义查询请求
   * @param {object} model - 完整 DB 模型配置
   * @param {object} params - 原始合并参数（含提交时返回的 prompt_id）
   * @param {object} rendered - 模板渲染后的 { url, method, headers, body }
   * @returns {object} 统一状态响应
   */
  async query(model, params, rendered) {
    console.log('[ComfyUI Query Handler] 开始查询任务状态');
    
    // 1. 获取 ComfyUI 基础 URL
    const baseUrl = process.env.COMFYUI_BASE_URL;
    if (!baseUrl) {
      throw new Error('ComfyUI 未配置：请设置环境变量 COMFYUI_BASE_URL');
    }
    
    // 2. 获取 prompt_id（优先从 params，其次从 rendered.body）
    const promptId = params.prompt_id || 
                     params.taskId || 
                     params.task_id ||
                     rendered?.body?.prompt_id;
    
    if (!promptId) {
      throw new Error('ComfyUI 查询缺少 prompt_id');
    }
    
    console.log(`[ComfyUI Query Handler] 查询 prompt_id: ${promptId}`);
    
    // 3. 查询执行历史
    const historyUrl = `${baseUrl}/history/${promptId}`;
    console.log(`[ComfyUI Query Handler] 查询 URL: ${historyUrl}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    
    let response;
    try {
      response = await fetch(historyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('ComfyUI 查询超时（60秒）');
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new Error(`ComfyUI 连接失败: 无法连接到 ${baseUrl}`);
      }
      throw new Error(`ComfyUI 查询失败: ${err.message}`);
    }
    
    const responseText = await response.text();
    console.log('[ComfyUI Query Handler] 响应状态:', response.status);
    
    // 4. 解析响应
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      throw new Error(`ComfyUI API 返回非 JSON: ${responseText.substring(0, 300)}`);
    }
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || JSON.stringify(data);
      throw new Error(`ComfyUI API 错误 (${response.status}): ${errorMsg}`);
    }
    
    // 5. 检查任务是否存在于历史中
    const historyEntry = data[promptId];
    
    if (!historyEntry) {
      // 任务还在队列中或正在执行
      console.log('[ComfyUI Query Handler] 任务仍在处理中');
      return {
        status: 'processing',
        prompt_id: promptId,
        message: '任务正在处理中'
      };
    }
    
    // 6. 检查执行状态
    const status = historyEntry.status;
    
    // ComfyUI 的 status 对象包含 status_str 和 completed 等字段
    if (status && status.status_str === 'error') {
      // 执行失败
      const errorMessages = status.messages || [];
      const errorMsg = errorMessages
        .filter(msg => msg[0] === 'execution_error')
        .map(msg => msg[1]?.exception_message || JSON.stringify(msg[1]))
        .join('; ');
      
      console.log(`[ComfyUI Query Handler] 任务执行失败: ${errorMsg}`);
      
      return {
        status: 'failed',
        prompt_id: promptId,
        error: errorMsg || '执行过程中发生错误'
      };
    }
    
    // 7. 检查是否有输出
    const outputs = historyEntry.outputs;
    
    if (!outputs || Object.keys(outputs).length === 0) {
      // 可能还在执行中
      console.log('[ComfyUI Query Handler] 任务无输出，可能仍在执行');
      return {
        status: 'processing',
        prompt_id: promptId,
        message: '任务正在执行中'
      };
    }
    
    // 8. 从输出节点找到图片
    let imageUrl = null;
    let imageFilename = null;
    let imageSubfolder = '';
    
    // 遍历所有输出节点，找到包含图片的节点
    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      
      // SaveImage 节点的输出格式
      if (nodeOutput.images && nodeOutput.images.length > 0) {
        const imageInfo = nodeOutput.images[0];
        imageFilename = imageInfo.filename;
        imageSubfolder = imageInfo.subfolder || '';
        
        // 构建图片 URL
        const imageParams = new URLSearchParams({
          filename: imageFilename,
          subfolder: imageSubfolder,
          type: imageInfo.type || 'output'
        });
        
        imageUrl = `${baseUrl}/view?${imageParams.toString()}`;
        console.log(`[ComfyUI Query Handler] 找到输出图片: ${imageFilename}`);
        break;
      }
    }
    
    if (!imageUrl) {
      // 没有找到图片输出
      console.log('[ComfyUI Query Handler] 任务完成但未找到图片输出');
      return {
        status: 'failed',
        prompt_id: promptId,
        error: '任务完成但未找到图片输出'
      };
    }
    
    // 9. 返回成功结果
    console.log(`[ComfyUI Query Handler] 任务完成，图片 URL: ${imageUrl}`);
    
    return {
      status: 'completed',
      prompt_id: promptId,
      result_url: imageUrl,
      filename: imageFilename,
      subfolder: imageSubfolder
    };
  }
};
