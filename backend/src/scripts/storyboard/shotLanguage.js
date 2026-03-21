/**
 * 镜头语言参数管理
 * 提供分镜镜头参数的CRUD接口
 */

const { execute } = require('../../db');

// 镜头语言参数字段定义
const SHOT_LANGUAGE_FIELDS = [
  'shot_size',
  'camera_height',
  'camera_movement',
  'lens_type',
  'focus_point',
  'depth_of_field',
  'lighting_mood',
  'composition_rule',
  'axis_position',
  'screen_direction',
  'shot_duration',
  'transition_type',
];

/**
 * 更新分镜的镜头语言参数
 * PATCH /api/scripts/storyboards/:storyboardId/shot-language
 */
async function updateShotLanguage(req, res) {
  try {
    const { storyboardId } = req.params;
    const updates = req.body;

    if (!storyboardId) {
      return res.status(400).json({ error: '缺少分镜ID' });
    }

    // 过滤有效的镜头语言字段
    const validUpdates = {};
    for (const field of SHOT_LANGUAGE_FIELDS) {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ error: '没有有效的更新字段' });
    }

    // 检查分镜是否存在
    const [storyboard] = await execute(
      'SELECT id, is_locked FROM storyboards WHERE id = ?',
      [storyboardId]
    );

    if (!storyboard) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    if (storyboard.is_locked) {
      return res.status(403).json({ error: '分镜已锁定，无法修改' });
    }

    // 构建更新SQL
    const fields = Object.keys(validUpdates);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...Object.values(validUpdates), storyboardId];

    await execute(
      `UPDATE storyboards SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: '镜头参数已更新',
      storyboardId: parseInt(storyboardId),
      updates: validUpdates,
    });
  } catch (error) {
    console.error('[updateShotLanguage] 错误:', error);
    res.status(500).json({ error: '更新镜头参数失败: ' + error.message });
  }
}

/**
 * 获取分镜的镜头语言参数
 * GET /api/scripts/storyboards/:storyboardId/shot-language
 */
async function getShotLanguage(req, res) {
  try {
    const { storyboardId } = req.params;

    if (!storyboardId) {
      return res.status(400).json({ error: '缺少分镜ID' });
    }

    const fields = SHOT_LANGUAGE_FIELDS.join(', ');
    const [storyboard] = await execute(
      `SELECT ${fields} FROM storyboards WHERE id = ?`,
      [storyboardId]
    );

    if (!storyboard) {
      return res.status(404).json({ error: '分镜不存在' });
    }

    res.json({
      success: true,
      storyboardId: parseInt(storyboardId),
      shotLanguage: storyboard,
    });
  } catch (error) {
    console.error('[getShotLanguage] 错误:', error);
    res.status(500).json({ error: '获取镜头参数失败: ' + error.message });
  }
}

/**
 * 批量更新分镜的镜头语言参数
 * POST /api/scripts/storyboards/batch-shot-language
 */
async function batchUpdateShotLanguage(req, res) {
  try {
    const { storyboardIds, updates } = req.body;

    if (!Array.isArray(storyboardIds) || storyboardIds.length === 0) {
      return res.status(400).json({ error: '请提供分镜ID列表' });
    }

    // 过滤有效的镜头语言字段
    const validUpdates = {};
    for (const field of SHOT_LANGUAGE_FIELDS) {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return res.status(400).json({ error: '没有有效的更新字段' });
    }

    // 检查是否有被锁定的分镜
    const placeholders = storyboardIds.map(() => '?').join(',');
    const lockedStoryboards = await execute(
      `SELECT id FROM storyboards WHERE id IN (${placeholders}) AND is_locked = TRUE`,
      storyboardIds
    );

    if (lockedStoryboards.length > 0) {
      return res.status(403).json({
        error: '部分分镜已锁定，无法修改',
        lockedIds: lockedStoryboards.map(s => s.id),
      });
    }

    // 批量更新
    const setClause = Object.keys(validUpdates).map(f => `${f} = ?`).join(', ');
    const values = [...Object.values(validUpdates), ...storyboardIds];

    await execute(
      `UPDATE storyboards SET ${setClause} WHERE id IN (${placeholders})`,
      values
    );

    res.json({
      success: true,
      message: `已更新 ${storyboardIds.length} 个分镜的镜头参数`,
      count: storyboardIds.length,
      updates: validUpdates,
    });
  } catch (error) {
    console.error('[batchUpdateShotLanguage] 错误:', error);
    res.status(500).json({ error: '批量更新镜头参数失败: ' + error.message });
  }
}

/**
 * 检查轴线规则
 * POST /api/scripts/storyboards/check-axis
 */
async function checkAxisRule(req, res) {
  try {
    const { scriptId } = req.body;

    if (!scriptId) {
      return res.status(400).json({ error: '缺少剧本ID' });
    }

    // 获取该剧本下的所有分镜，按顺序
    const storyboards = await execute(
      `SELECT 
        id, idx, axis_position, screen_direction, 
        shot_size, camera_height, characters
      FROM storyboards 
      WHERE script_id = ? 
      ORDER BY idx ASC`,
      [scriptId]
    );

    const axisIssues = [];

    // 检查每对相邻分镜的轴线关系
    for (let i = 0; i < storyboards.length - 1; i++) {
      const current = storyboards[i];
      const next = storyboards[i + 1];

      // 检查越轴情况
      if (current.axis_position && next.axis_position) {
        // 如果当前在左侧，下一个在右侧，可能是越轴
        if (
          (current.axis_position === 'left' && next.axis_position === 'right') ||
          (current.axis_position === 'right' && next.axis_position === 'left')
        ) {
          // 检查是否有明确的越轴意图（如特写镜头）
          const isCloseUp = ['extreme_close_up', 'close_up'].includes(next.shot_size);
          
          if (!isCloseUp) {
            axisIssues.push({
              type: 'axis_violation',
              severity: 'warning',
              fromStoryboardId: current.id,
              toStoryboardId: next.id,
              fromIndex: current.idx,
              toIndex: next.idx,
              message: `分镜 ${current.idx + 1} 到 ${next.idx + 1} 可能存在越轴`,
              suggestion: '建议添加特写镜头过渡或使用明确的方向指示',
            });
          }
        }
      }

      // 检查视线匹配
      if (current.screen_direction && next.screen_direction) {
        const oppositeDirections = [
          ['left_to_right', 'right_to_left'],
          ['towards_camera', 'away_from_camera'],
        ];

        const isOpposite = oppositeDirections.some(
          pair => pair.includes(current.screen_direction) && pair.includes(next.screen_direction)
        );

        if (isOpposite && current.axis_position === next.axis_position) {
          axisIssues.push({
            type: 'direction_mismatch',
            severity: 'info',
            fromStoryboardId: current.id,
            toStoryboardId: next.id,
            fromIndex: current.idx,
            toIndex: next.idx,
            message: `分镜 ${current.idx + 1} 到 ${next.idx + 1} 运动方向相反`,
            suggestion: '确认是否为有意为之（如追逐戏）',
          });
        }
      }
    }

    res.json({
      success: true,
      scriptId,
      totalScenes: storyboards.length,
      issues: axisIssues,
      issueCount: axisIssues.length,
    });
  } catch (error) {
    console.error('[checkAxisRule] 错误:', error);
    res.status(500).json({ error: '检查轴线规则失败: ' + error.message });
  }
}

/**
 * 获取镜头语言选项配置
 * GET /api/scripts/storyboards/shot-language-options
 */
async function getShotLanguageOptions(req, res) {
  const options = {
    shotSize: [
      { value: 'extreme_close_up', label: '大特写', description: '强调眼神、表情细节', icon: '👁️' },
      { value: 'close_up', label: '特写', description: '面部表情、情绪传达', icon: '😊' },
      { value: 'medium_close_up', label: '中近景', description: '胸部以上，兼顾表情和姿态', icon: '👤' },
      { value: 'medium_shot', label: '中景', description: '腰部以上，适合对话', icon: '🧍' },
      { value: 'medium_long_shot', label: '中全景', description: '膝盖以上，展示肢体语言', icon: '🚶' },
      { value: 'long_shot', label: '全景', description: '完整人物与环境关系', icon: '🏞️' },
      { value: 'extreme_long_shot', label: '大远景', description: '强调环境、氛围', icon: '🌄' },
    ],
    cameraHeight: [
      { value: 'eye_level', label: '平视', description: '客观、自然', icon: '➡️' },
      { value: 'low_angle', label: '仰拍', description: '威严、压迫感', icon: '⬆️' },
      { value: 'high_angle', label: '俯拍', description: '弱势、审视', icon: '⬇️' },
      { value: 'bird_eye', label: '鸟瞰', description: '全局、上帝视角', icon: '🦅' },
      { value: 'worm_eye', label: '虫视', description: '夸张、压迫', icon: '🐛' },
    ],
    cameraMovement: [
      { value: 'static', label: '固定', description: '稳定、客观', icon: '📷' },
      { value: 'push', label: '推', description: '强调、进入', icon: '🔍' },
      { value: 'pull', label: '拉', description: '展开、远离', icon: '🔭' },
      { value: 'pan', label: '摇', description: '水平扫视', icon: '↔️' },
      { value: 'tilt', label: '升降', description: '垂直扫视', icon: '↕️' },
      { value: 'track', label: '移', description: '平行移动', icon: '🚂' },
      { value: 'dolly', label: '跟', description: '跟随主体', icon: '🏃' },
      { value: 'zoom', label: '变焦', description: '焦距变化', icon: '🔎' },
    ],
    lensType: [
      { value: 'wide', label: '广角', description: '视野广、变形大', icon: '📐' },
      { value: 'standard', label: '标准', description: '接近人眼', icon: '👁️' },
      { value: 'telephoto', label: '长焦', description: '压缩空间', icon: '🔭' },
      { value: 'macro', label: '微距', description: '细节特写', icon: '🌸' },
      { value: 'fisheye', label: '鱼眼', description: '极端变形', icon: '🐟' },
    ],
    depthOfField: [
      { value: 'shallow', label: '浅景深', description: '背景虚化、突出主体', icon: '✨' },
      { value: 'medium', label: '中等', description: '适度层次', icon: '⭕' },
      { value: 'deep', label: '深景深', description: '全景清晰', icon: '📍' },
    ],
    lightingMood: [
      { value: 'high_key', label: '高调', description: '明亮、轻快', icon: '☀️' },
      { value: 'low_key', label: '低调', description: '阴暗、神秘', icon: '🌑' },
      { value: 'chiaroscuro', label: '明暗对比', description: '戏剧性、油画感', icon: '🎨' },
      { value: 'silhouette', label: '剪影', description: '轮廓、神秘', icon: '👤' },
      { value: 'backlit', label: '逆光', description: '轮廓光、神圣感', icon: '✨' },
    ],
    compositionRule: [
      { value: 'rule_of_thirds', label: '三分法', description: '经典构图', icon: '➕' },
      { value: 'center', label: '中心构图', description: '对称、稳定', icon: '⭕' },
      { value: 'symmetry', label: '对称', description: '平衡、正式', icon: '⚖️' },
      { value: 'leading_lines', label: '引导线', description: '视线引导', icon: '〰️' },
      { value: 'frame_in_frame', label: '框中框', description: '层次感', icon: '🖼️' },
    ],
    axisPosition: [
      { value: 'left', label: '左侧', description: '180度轴线左侧', icon: '⬅️' },
      { value: 'right', label: '右侧', description: '180度轴线右侧', icon: '➡️' },
      { value: 'on_axis', label: '轴线上', description: '中性位置', icon: '⬆️' },
    ],
    screenDirection: [
      { value: 'left_to_right', label: '左→右', description: '正向运动', icon: '➡️' },
      { value: 'right_to_left', label: '右→左', description: '反向运动', icon: '⬅️' },
      { value: 'towards_camera', label: '朝向镜头', description: '逼近', icon: '📷' },
      { value: 'away_from_camera', label: '远离镜头', description: '远离', icon: '🏃' },
    ],
    transitionType: [
      { value: 'cut', label: '硬切', description: '直接切换', icon: '✂️' },
      { value: 'fade', label: '淡入淡出', description: '柔和过渡', icon: '☁️' },
      { value: 'dissolve', label: '叠化', description: '时间流逝', icon: '⏳' },
      { value: 'wipe', label: '划像', description: '场景转换', icon: '➡️' },
      { value: 'match_cut', label: '匹配剪辑', description: '图形匹配', icon: '🎯' },
    ],
  };

  res.json({
    success: true,
    options,
  });
}

/**
 * 注册路由
 */
function registerRoutes(router) {
  router.get('/shot-language-options', getShotLanguageOptions);
  router.get('/:storyboardId/shot-language', getShotLanguage);
  router.patch('/:storyboardId/shot-language', updateShotLanguage);
  router.post('/batch-shot-language', batchUpdateShotLanguage);
  router.post('/check-axis', checkAxisRule);
}

module.exports = registerRoutes;
