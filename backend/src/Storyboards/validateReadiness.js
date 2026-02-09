/**
 * 分镜生成预检接口
 * 
 * GET /api/storyboards/:storyboardId/validate?type=frame|video
 * 
 * type=frame: 检查生成首尾帧的前置条件（角色图 + 场景图完整性）
 * type=video: 检查生成视频的前置条件（首尾帧 + 提示词完整性）
 */

const { queryOne, queryAll } = require('../dbHelper');

module.exports = async (req, res) => {
  try {
    const { storyboardId } = req.params;
    const { type } = req.query; // 'frame' | 'video'

    if (!type || !['frame', 'video'].includes(type)) {
      return res.status(400).json({ error: 'type 参数必须为 frame 或 video' });
    }

    // 获取分镜数据
    const storyboard = await queryOne(
      'SELECT * FROM storyboards WHERE id = ?',
      [storyboardId]
    );

    if (!storyboard) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    // 解析 variables
    let variables = {};
    try {
      variables = typeof storyboard.variables === 'string'
        ? JSON.parse(storyboard.variables)
        : (storyboard.variables || {});
    } catch (e) {
      variables = {};
    }

    if (type === 'frame') {
      return await validateForFrame(res, storyboard, variables);
    } else {
      return await validateForVideo(res, storyboard, variables);
    }
  } catch (error) {
    console.error('[Validate] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 校验生成首尾帧的前置条件
 * - 该镜头涉及的角色是否都有图片
 * - 该镜头的场景是否有图片
 */
async function validateForFrame(res, storyboard, variables) {
  const issues = [];
  const projectId = storyboard.project_id;

  // 1. 检查角色图片
  const characterNames = variables.characters || [];
  if (characterNames.length > 0) {
    const placeholders = characterNames.map(() => '?').join(',');
    const characters = await queryAll(
      `SELECT name, image_url FROM characters WHERE project_id = ? AND name IN (${placeholders})`,
      [projectId, ...characterNames]
    );

    const charMap = {};
    characters.forEach(c => { charMap[c.name] = c; });

    const missingChars = [];
    const noImageChars = [];
    for (const name of characterNames) {
      if (!charMap[name]) {
        missingChars.push(name);
      } else if (!charMap[name].image_url) {
        noImageChars.push(name);
      }
    }

    if (missingChars.length > 0) {
      issues.push({
        type: 'character_missing',
        message: `角色未创建: ${missingChars.join('、')}`,
        details: missingChars
      });
    }
    if (noImageChars.length > 0) {
      issues.push({
        type: 'character_no_image',
        message: `角色缺少图片: ${noImageChars.join('、')}`,
        details: noImageChars
      });
    }
  }

  // 2. 检查场景图片
  const location = variables.location || '';
  if (location) {
    const scene = await queryOne(
      'SELECT name, image_url FROM scenes WHERE project_id = ? AND name = ?',
      [projectId, location]
    );

    if (!scene) {
      issues.push({
        type: 'scene_missing',
        message: `场景未创建: ${location}`,
        details: [location]
      });
    } else if (!scene.image_url) {
      issues.push({
        type: 'scene_no_image',
        message: `场景缺少图片: ${location}`,
        details: [location]
      });
    }
  }

  // 3. 检查提示词
  if (!storyboard.prompt_template || storyboard.prompt_template.trim() === '') {
    issues.push({
      type: 'no_prompt',
      message: '分镜缺少描述/提示词'
    });
  }

  return res.json({
    ready: issues.length === 0,
    issues
  });
}

/**
 * 校验生成视频的前置条件
 * - 首帧是否存在
 * - 如果是动作镜头，尾帧是否存在
 * - 提示词是否完整
 */
async function validateForVideo(res, storyboard, variables) {
  const issues = [];

  // 1. 检查首帧
  if (!storyboard.first_frame_url) {
    issues.push({
      type: 'no_start_frame',
      message: '缺少首帧图片，请先生成首尾帧'
    });
  }

  // 2. 如果是动作镜头，检查尾帧
  const hasAction = variables.hasAction || false;
  if (hasAction && !storyboard.last_frame_url) {
    issues.push({
      type: 'no_end_frame',
      message: '动作镜头缺少尾帧图片，请先生成首尾帧'
    });
  }

  // 3. 检查提示词
  if (!storyboard.prompt_template || storyboard.prompt_template.trim() === '') {
    issues.push({
      type: 'no_prompt',
      message: '分镜缺少描述/提示词'
    });
  }

  return res.json({
    ready: issues.length === 0,
    issues
  });
}
