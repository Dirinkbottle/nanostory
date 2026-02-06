/**
 * POST /api/storyboards/auto-generate/:scriptId
 * 根据剧本内容自动生成分镜（异步工作流）
 */

const { queryOne } = require('../dbHelper');

async function autoGenerate(req, res) {
  const userId = req.user.id;
  const scriptId = Number(req.params.scriptId);

  if (!scriptId) {
    return res.status(400).json({ message: '无效的剧本ID' });
  }

  try {
    // 获取剧本内容
    const script = await queryOne(
      'SELECT id, project_id, title, content, episode_number FROM scripts WHERE id = ? AND user_id = ?', 
      [scriptId, userId]
    );

    if (!script) {
      return res.status(404).json({ message: '剧本不存在' });
    }

    if (!script.content || script.content.trim() === '') {
      return res.status(400).json({ message: '剧本内容为空，无法生成分镜' });
    }

    console.log('[Auto Storyboard] 启动分镜生成工作流:', {
      scriptId,
      projectId: script.project_id,
      title: script.title
    });

    // 使用工作流引擎生成分镜
    const engine = require('../nosyntask/engine');
    const result = await engine.startWorkflow('storyboard_generation', {
      userId,
      projectId: script.project_id,
      jobParams: {
        scriptId,
        scriptContent: script.content,
        scriptTitle: script.title || `第${script.episode_number}集`,
        modelName: 'DeepSeek Chat'
      }
    });

    console.log('[Auto Storyboard] 工作流创建成功:', result);

    // 返回工作流信息
    res.json({
      jobId: result.jobId,
      scriptId,
      projectId: script.project_id,
      status: 'generating',
      message: '分镜生成已启动，请等待完成'
    });
  } catch (error) {
    console.error('[Auto Storyboard]', error);
    res.status(500).json({ message: '生成失败：' + error.message });
  }
}

module.exports = autoGenerate;
