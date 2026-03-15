/**
 * POST /api/scripts/generate
 * 生成剧本（使用工作流引擎）
 */

const { queryOne, execute } = require('../../dbHelper');
const { VISUAL_STYLE_PRESETS } = require('../../utils/getProjectStyle');
const { callAIModel } = require('../../aiModelService');

/**
 * 自动为项目设置叙事风格（AI推荐）
 * 性能优化：精简prompt + 超时保护 + 默认值回退
 */
async function autoSuggestProjectStyle(projectId, projectName, projectDescription) {
  console.log('[Auto Suggest Style] 项目未设置叙事风格，正在调用AI推荐...');
  
  const visualStyles = Object.keys(VISUAL_STYLE_PRESETS).join('、');
  // 优化：精简prompt，减少token消耗和响应时间
  const prompt = `根据项目信息推荐风格。
名称：${projectName || '未提供'}
描述：${projectDescription || '未提供'}
可选视觉风格：${visualStyles}
返回JSON：{"visualStyle":"","storyStyle":"","storyConstraints":""}
visualStyle从可选列表选，storyStyle如"热血少年漫",storyConstraints用一句话描述。只返回JSON。`;

  // 获取第一个可用的文本模型
  const textModel = await queryOne(
    "SELECT name FROM ai_model_configs WHERE category = 'TEXT' AND is_active = 1 ORDER BY id ASC LIMIT 1"
  );

  if (!textModel) {
    // 无可用模型时使用默认值
    console.log('[Auto Suggest Style] 无可用文本模型，使用默认风格');
    return saveDefaultStyle(projectId);
  }

  try {
    // 设置更短的超时（30秒）用于风格推荐
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const result = await callAIModel(textModel.name, {
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 256 // 限制输出长度
    });
    
    clearTimeout(timeoutId);

    // 解析AI返回的JSON
    let suggestions = parseStyleSuggestions(result);
    return await saveStyleToProject(projectId, suggestions);
  } catch (error) {
    // AI调用失败时使用默认值
    console.error('[Auto Suggest Style] AI调用失败，使用默认风格:', error.message);
    return saveDefaultStyle(projectId);
  }
}

/**
 * 解析AI返回的风格建议
 */
function parseStyleSuggestions(result) {
  try {
    let content = result.content || result.text || result.message || '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }
    // 尝试提取JSON对象
    const jsonObjMatch = content.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      content = jsonObjMatch[0];
    }
    return JSON.parse(content);
  } catch (parseError) {
    console.error('[Auto Suggest Style] JSON解析失败:', parseError);
    return {
      visualStyle: '日系动漫',
      storyStyle: '热血少年漫',
      storyConstraints: ''
    };
  }
}

/**
 * 保存默认风格到项目
 */
async function saveDefaultStyle(projectId) {
  const defaultSettings = {
    visualStyle: '日系动漫',
    visualStylePrompt: VISUAL_STYLE_PRESETS['日系动漫'] || '',
    storyStyle: '热血少年漫',
    storyConstraints: ''
  };
  await execute(
    'UPDATE projects SET settings_json = ? WHERE id = ?',
    [JSON.stringify(defaultSettings), projectId]
  );
  console.log('[Auto Suggest Style] 已设置默认风格:', defaultSettings);
  return defaultSettings;
}

/**
 * 保存风格建议到项目
 */
async function saveStyleToProject(projectId, suggestions) {
  // 验证 visualStyle 是否在预设列表中
  if (!VISUAL_STYLE_PRESETS[suggestions.visualStyle]) {
    suggestions.visualStyle = '日系动漫';
  }
  suggestions.visualStylePrompt = VISUAL_STYLE_PRESETS[suggestions.visualStyle] || '';

  const settingsObj = {
    visualStyle: suggestions.visualStyle,
    visualStylePrompt: suggestions.visualStylePrompt,
    storyStyle: suggestions.storyStyle || '热血少年漫',
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
    // === 性能优化：合并多个查询为一个联合查询 ===
    // 原先有5次独立查询，现在合并为1次
    const combinedQuery = await queryOne(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.description as project_description,
        p.settings_json,
        u.balance as user_balance,
        (SELECT MAX(episode_number) FROM scripts WHERE project_id = ?) as max_episode,
        (SELECT id FROM scripts WHERE project_id = ? AND episode_number = ? LIMIT 1) as existing_script_id,
        (SELECT status FROM scripts WHERE project_id = ? AND episode_number = ? LIMIT 1) as existing_script_status
      FROM projects p
      JOIN users u ON u.id = ?
      WHERE p.id = ? AND p.user_id = ?
    `, [projectId, projectId, episodeNumber || 9999, projectId, episodeNumber || 9999, userId, projectId, userId]);

    if (!combinedQuery || !combinedQuery.project_id) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    const project = {
      id: combinedQuery.project_id,
      name: combinedQuery.project_name,
      description: combinedQuery.project_description,
      settings_json: combinedQuery.settings_json
    };
    const userBalance = combinedQuery.user_balance || 0;

    // 性能优化：直接从合并查询结果检查风格，避免额外查询
    let hasStoryStyle = false;
    if (combinedQuery.settings_json) {
      try {
        const settings = typeof combinedQuery.settings_json === 'string' 
          ? JSON.parse(combinedQuery.settings_json) 
          : combinedQuery.settings_json;
        hasStoryStyle = !!settings.storyStyle;
      } catch (e) {
        hasStoryStyle = false;
      }
    }

    // 检查项目是否设置了叙事风格，未设置则自动推荐
    if (!hasStoryStyle) {
      try {
        await autoSuggestProjectStyle(projectId, project.name, project.description);
      } catch (suggestError) {
        console.error('[Generate Script] 自动设置叙事风格失败:', suggestError);
        // 性能优化：失败时使用默认值而不是报错
        await saveDefaultStyle(projectId);
      }
    }

    // 如果没有指定集数，自动计算下一集编号
    if (!targetEpisode) {
      targetEpisode = (combinedQuery.max_episode || 0) + 1;
    }

    // 检查该集是否已存在（使用合并查询的结果）
    if (combinedQuery.existing_script_id && combinedQuery.existing_script_status) {
      if (combinedQuery.existing_script_status === 'generating') {
        return res.status(400).json({ message: `第${targetEpisode}集正在生成中，请稍候` });
      }
      return res.status(400).json({ message: `第${targetEpisode}集已存在，请编辑或生成下一集` });
    }

    // 预先检查余额（估算费用）- 使用合并查询的结果
    const estimatedTokens = 2000;
    const unitPrice = 0.0000014;
    const estimatedAmount = estimatedTokens * unitPrice;

    if (userBalance < estimatedAmount) {
      return res.status(402).json({ 
        message: '余额不足，请充值',
        required: estimatedAmount,
        current: userBalance
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
