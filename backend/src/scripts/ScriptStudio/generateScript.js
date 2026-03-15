/**
 * POST /api/scripts/generate
 * 生成剧本（使用工作流引擎）
 */

const { queryOne, execute } = require('../../dbHelper');
const { getStoryStyle } = require('../../utils/getProjectStyle');
const { VISUAL_STYLE_PRESETS } = require('../../utils/getProjectStyle');
const { callAIModel } = require('../../aiModelService');

/**
 * 自动为项目设置叙事风格（AI推荐）
 */
async function autoSuggestProjectStyle(projectId, projectName, projectDescription) {
  console.log('[Auto Suggest Style] 项目未设置叙事风格，正在调用AI推荐...');
  
  const visualStyles = Object.keys(VISUAL_STYLE_PRESETS).join('、');
  const prompt = `你是一个专业的动漫/影视项目顾问。请根据以下项目信息，推荐最合适的风格设置。

项目名称：${projectName || '未提供'}
项目描述：${projectDescription || '未提供'}

可选的视觉风格：${visualStyles}

请以JSON格式返回推荐结果，格式如下：
{
  "visualStyle": "推荐的视觉风格（必须从可选列表中选择一个）",
  "storyStyle": "推荐的叙事风格（如：热血少年漫、悬疑推理、浪漫爱情、温馨日常、奇幻冒险等）",
  "storyConstraints": "推荐的剧本约束（如：不要魔法元素、现代都市背景、避免暴力描写等，用简短的一句话描述）"
}

注意：
1. visualStyle 必须严格从可选列表中选择
2. storyStyle 和 storyConstraints 要根据项目名称和描述的语义来推断
3. 只返回JSON，不要有其他文字说明`;

  // 获取第一个可用的文本模型
  const textModel = await queryOne(
    "SELECT name FROM ai_model_configs WHERE category = 'TEXT' AND is_active = 1 ORDER BY id ASC LIMIT 1"
  );

  if (!textModel) {
    throw new Error('没有可用的文本模型来推荐叙事风格');
  }

  const result = await callAIModel(textModel.name, {
    messages: [{ role: 'user', content: prompt }]
  });

  // 解析AI返回的JSON
  let suggestions;
  try {
    let content = result.content || result.text || result.message || '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }
    suggestions = JSON.parse(content);
  } catch (parseError) {
    console.error('[Auto Suggest Style] JSON解析失败:', parseError);
    suggestions = {
      visualStyle: '日系动漫',
      storyStyle: '热血少年漫',
      storyConstraints: ''
    };
  }

  // 验证 visualStyle 是否在预设列表中
  if (!VISUAL_STYLE_PRESETS[suggestions.visualStyle]) {
    suggestions.visualStyle = '日系动漫';
  }
  suggestions.visualStylePrompt = VISUAL_STYLE_PRESETS[suggestions.visualStyle] || '';

  // 保存到项目设置
  const settingsObj = {
    visualStyle: suggestions.visualStyle,
    visualStylePrompt: suggestions.visualStylePrompt,
    storyStyle: suggestions.storyStyle,
    storyConstraints: suggestions.storyConstraints || ''
  };

  await execute(
    'UPDATE projects SET settings_json = ? WHERE id = ?',
    [JSON.stringify(settingsObj), projectId]
  );

  console.log('[Auto Suggest Style] 已自动设置项目风格:', settingsObj);
  return settingsObj;
}

async function generateScript(req, res) {
  const { projectId, title, description, style, length, episodeNumber, textModel } = req.body || {};
  const userId = req.user.id;

  // 验证 projectId
  if (!projectId) {
    return res.status(400).json({ message: '缺少项目ID' });
  }

  if (!textModel) {
    return res.status(400).json({ message: '缺少模型名称，请选择一个文本模型' });
  }

  // 确定集数（默认为下一集）
  let targetEpisode = episodeNumber;

  try {
    // 验证项目是否属于当前用户
    const project = await queryOne('SELECT id, name, description, settings_json FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    // 检查项目是否设置了叙事风格，未设置则自动推荐
    const { storyStyle } = await getStoryStyle(projectId);
    if (!storyStyle) {
      try {
        await autoSuggestProjectStyle(projectId, project.name, project.description);
      } catch (suggestError) {
        console.error('[Generate Script] 自动设置叙事风格失败:', suggestError);
        return res.status(400).json({ 
          message: '该项目尚未设置叙事风格，且自动推荐失败。请先在「工程设置」中填写叙事风格（如热血少年漫、悬疑推理等），再生成剧本。' 
        });
      }
    }

    // 如果没有指定集数，自动计算下一集编号
    if (!targetEpisode) {
      const lastEpisode = await queryOne(
        'SELECT MAX(episode_number) as max_ep FROM scripts WHERE project_id = ?', 
        [projectId]
      );
      targetEpisode = (lastEpisode?.max_ep || 0) + 1;
    }

    // 检查该集是否已存在
    const existingScript = await queryOne(
      'SELECT id, status FROM scripts WHERE project_id = ? AND episode_number = ?', 
      [projectId, targetEpisode]
    );
    
    if (existingScript) {
      if (existingScript.status === 'generating') {
        return res.status(400).json({ message: `第${targetEpisode}集正在生成中，请稍候` });
      }
      return res.status(400).json({ message: `第${targetEpisode}集已存在，请编辑或生成下一集` });
    }

    // 预先检查余额（估算费用）
    const estimatedTokens = 2000; // 估算平均 token 数
    const unitPrice = 0.0000014;
    const estimatedAmount = estimatedTokens * unitPrice;

    const user = await queryOne('SELECT balance FROM users WHERE id = ?', [userId]);
    if (!user || user.balance < estimatedAmount) {
      return res.status(402).json({ 
        message: '余额不足，请充值',
        required: estimatedAmount,
        current: user?.balance || 0
      });
    }

    // 创建生成中的剧本记录
    const insertResult = await execute(
      'INSERT INTO scripts (user_id, project_id, episode_number, title, content, status) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, projectId, targetEpisode, title || `第${targetEpisode}集`, '', 'generating']
    );
    const scriptId = insertResult.insertId;

    // 使用工作流引擎生成剧本
    const engine = require('../../nosyntask/engine/index');
    
    console.log('[Generate Script] 准备启动工作流:', {
      workflowType: 'script_only',
      userId,
      projectId,
      targetEpisode
    });
    
    const result = await engine.startWorkflow('script_only', {
      userId,
      projectId,
      jobParams: {
        title: title || `第${targetEpisode}集`,
        description: description || '',
        style: style || '电影感',
        length: length || '短篇',
        textModel,
        projectId,
        episodeNumber: targetEpisode
      }
    });
    
    console.log('[Generate Script] 工作流创建成功:', result);
    
    const jobId = result.jobId;

    // 返回工作流信息
    res.json({
      jobId,
      scriptId,
      episodeNumber: targetEpisode,
      title: title || `第${targetEpisode}集`,
      status: 'generating',
      message: `第${targetEpisode}集剧本生成已启动，请等待完成`
    });
  } catch (error) {
    console.error('[Generate Script]', error);
    res.status(500).json({ message: '生成失败：' + error.message });
  }
}

module.exports = generateScript;
