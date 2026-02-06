const { queryOne } = require('../../dbHelper');
const { authMiddleware } = require('../../middleware');

// POST /auto-generate/:scriptId - 根据剧本内容自动生成分镜（异步工作流）
module.exports = (router) => {
  router.post('/auto-generate/:scriptId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const scriptId = Number(req.params.scriptId);

    try {
      const script = await queryOne(
        'SELECT * FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, userId]
      );

      if (!script) {
        return res.status(404).json({ message: '剧本不存在' });
      }

      const projectId = script.project_id;

      // 启动异步工作流
      const workflowRes = await fetch('http://localhost:4000/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          workflowType: 'storyboard_generation',
          params: {
            scriptId,
            scriptContent: script.content,
            projectId
          },
          projectId
        })
      });

      if (!workflowRes.ok) {
        const contentType = workflowRes.headers.get('content-type');
        let errorMessage = '启动工作流失败';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await workflowRes.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const errorText = await workflowRes.text();
          console.error('[Auto Generate Storyboard] 非 JSON 响应:', errorText.substring(0, 200));
          errorMessage = `服务器返回错误 (${workflowRes.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = workflowRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await workflowRes.text();
        console.error('[Auto Generate Storyboard] 期望 JSON 但收到:', responseText.substring(0, 200));
        throw new Error('工作流 API 返回了非 JSON 响应，可能服务未正确启动');
      }

      const { jobId } = await workflowRes.json();

      res.json({
        message: '分镜生成已启动',
        jobId,
        scriptId
      });
    } catch (error) {
      console.error('[Auto Generate Storyboard]', error);
      res.status(500).json({ message: '启动分镜生成失败: ' + error.message });
    }
  });
};
