/**
 * PATCH /api/storyboards/:storyboardId/media
 * 更新单个分镜的图片或视频
 */

const { queryOne, execute } = require('../../dbHelper');

async function updateMedia(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const { imageUrl, videoUrl, startFrame, endFrame } = req.body;

  if (!storyboardId) {
    return res.status(400).json({ message: 'Invalid storyboard id' });
  }

  try {
    const storyboard = await queryOne(
      `SELECT s.id, s.project_id 
       FROM storyboards s 
       JOIN scripts sc ON s.script_id = sc.id 
       WHERE s.id = ? AND sc.user_id = ?`,
      [storyboardId, userId]
    );

    if (!storyboard) {
      return res.status(404).json({ message: 'Storyboard not found or access denied' });
    }

    const updates = [];
    const params = [];

    if (imageUrl !== undefined) {
      updates.push('first_frame_url = ?');
      params.push(imageUrl);
    }
    if (videoUrl !== undefined) {
      updates.push('video_url = ?');
      params.push(videoUrl);
    }
    if (startFrame !== undefined) {
      updates.push('first_frame_url = ?');
      params.push(startFrame);
    }
    if (endFrame !== undefined) {
      updates.push('last_frame_url = ?');
      params.push(endFrame);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(storyboardId);
    await execute(`UPDATE storyboards SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Media updated successfully' });
  } catch (err) {
    console.error('DB error updating storyboard media:', err);
    res.status(500).json({ message: 'Failed to update media' });
  }
}

module.exports = updateMedia;
