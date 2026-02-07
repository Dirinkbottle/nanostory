/**
 * POST /api/scripts/generate
 * 生成剧本（使用工作流引擎）
 */

const { queryOne, execute, getLastInsertId } = require('../../dbHelper');

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
    const project = await queryOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
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
    await execute(
      'INSERT INTO scripts (user_id, project_id, episode_number, title, content, status) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, projectId, targetEpisode, title || `第${targetEpisode}集`, '', 'generating']
    );
    const scriptId = await getLastInsertId();

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
