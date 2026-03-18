/**
 * GET /scripts/project/:projectId/recap
 * 获取前情回顾数据 - 供前端展示"上一集发生了什么"
 * 
 * 逻辑与 scriptGeneration.js 保持一致：
 * - 最近 3 集：完整内容
 * - 更早的集：摘要（500字符以内）
 */

const { queryOne, queryAll } = require('../../dbHelper');

// 配置常量（与 scriptGeneration.js 一致）
const MAX_FULL_EPISODES = 3;
const MAX_SUMMARY_LENGTH = 500;

async function getEpisodesRecap(req, res) {
  const userId = req.user.id;
  const { projectId } = req.params;
  const { targetEpisode } = req.query; // 目标集数（要创建的新集）

  try {
    // 验证项目归属
    const project = await queryOne('SELECT id, name FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) {
      return res.status(404).json({ message: '项目不存在或无权访问' });
    }

    const targetEp = parseInt(targetEpisode) || 2;
    
    // 如果是第一集，没有前情回顾
    if (targetEp <= 1) {
      return res.json({
        hasRecap: false,
        targetEpisode: targetEp,
        episodes: [],
        message: '第一集无需前情回顾'
      });
    }

    // 获取目标集之前的所有已完成剧本
    const previousScripts = await queryAll(
      `SELECT episode_number, title, content, created_at, updated_at
       FROM scripts 
       WHERE project_id = ? AND episode_number < ? AND status = 'completed'
       ORDER BY episode_number ASC`,
      [projectId, targetEp]
    );

    if (previousScripts.length === 0) {
      return res.json({
        hasRecap: false,
        targetEpisode: targetEp,
        episodes: [],
        message: '暂无已完成的前序集数'
      });
    }

    // 处理每集内容，与 scriptGeneration.js 逻辑一致
    const totalEpisodes = previousScripts.length;
    const fullContentStart = Math.max(0, totalEpisodes - MAX_FULL_EPISODES);

    const episodes = previousScripts.map((script, index) => {
      const isFullContent = index >= fullContentStart;
      let displayContent;
      let isTruncated = false;

      if (isFullContent) {
        // 最近几集：完整内容
        displayContent = script.content;
      } else {
        // 早期集数：只显示摘要
        if (script.content.length > MAX_SUMMARY_LENGTH) {
          displayContent = script.content.substring(0, MAX_SUMMARY_LENGTH) + '...';
          isTruncated = true;
        } else {
          displayContent = script.content;
        }
      }

      return {
        episodeNumber: script.episode_number,
        title: script.title || `第${script.episode_number}集`,
        content: displayContent,
        isFullContent,
        isTruncated,
        originalLength: script.content.length,
        updatedAt: script.updated_at || script.created_at
      };
    });

    // 统计信息
    const fullContentCount = Math.min(totalEpisodes, MAX_FULL_EPISODES);
    const summaryCount = Math.max(0, totalEpisodes - MAX_FULL_EPISODES);

    return res.json({
      hasRecap: true,
      targetEpisode: targetEp,
      totalPreviousEpisodes: totalEpisodes,
      fullContentCount,
      summaryCount,
      episodes,
      // 为前端提供最近一集的简要信息（方便快速展示）
      lastEpisode: episodes.length > 0 ? {
        episodeNumber: episodes[episodes.length - 1].episodeNumber,
        title: episodes[episodes.length - 1].title,
        // 最近一集的简短摘要（用于折叠状态显示）
        briefSummary: episodes[episodes.length - 1].content.substring(0, 200) + 
          (episodes[episodes.length - 1].content.length > 200 ? '...' : '')
      } : null
    });
  } catch (err) {
    console.error('[getEpisodesRecap] DB error:', err);
    return res.status(500).json({ message: '获取前情回顾失败' });
  }
}

module.exports = getEpisodesRecap;
