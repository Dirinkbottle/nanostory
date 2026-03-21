/**
 * 草图文件上传 API
 * 
 * POST   /:storyboardId/sketch        - 上传草图文件
 * DELETE /:storyboardId/sketch        - 删除草图
 * PUT    /:storyboardId/sketch-settings - 更新草图设置
 * PUT    /:storyboardId/sketch-data   - 保存 Excalidraw 矢量数据
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { queryOne, execute } = require('../../dbHelper');

// 有效的草图类型
const VALID_SKETCH_TYPES = ['stick_figure', 'storyboard_sketch', 'detailed_lineart'];

// 允许的文件 MIME 类型
const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

// 文件扩展名映射
const EXTENSION_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg'
};

// 最大文件大小 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 获取 uploads 目录的基础路径
const UPLOADS_BASE = path.join(__dirname, '..', '..', '..', 'uploads');

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 临时存储位置，后续会移动到正确目录
    const tempDir = path.join(UPLOADS_BASE, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = EXTENSION_MAP[file.mimetype] || 'png';
    cb(null, `temp_${Date.now()}.${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，仅支持 PNG/JPG/SVG 格式'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * 获取分镜信息并验证用户权限
 * @param {number} storyboardId 
 * @param {number} userId 
 * @returns {Promise<object|null>}
 */
async function getStoryboardWithAuth(storyboardId, userId) {
  return queryOne(
    `SELECT s.id, s.project_id, s.sketch_url, s.sketch_type, s.sketch_data, s.control_strength
     FROM storyboards s 
     JOIN scripts sc ON s.script_id = sc.id 
     WHERE s.id = ? AND sc.user_id = ?`,
    [storyboardId, userId]
  );
}

/**
 * 删除文件（如果存在）
 * @param {string} filePath 
 */
function safeDeleteFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('[Sketch] Failed to delete file:', filePath, err.message);
    }
  }
}

/**
 * POST /:storyboardId/sketch
 * 上传草图文件
 */
async function uploadSketch(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const sketchType = req.body.sketch_type;

  if (!storyboardId) {
    return res.status(400).json({ message: '无效的分镜 ID' });
  }

  if (!sketchType || !VALID_SKETCH_TYPES.includes(sketchType)) {
    // 删除已上传的临时文件
    if (req.file) safeDeleteFile(req.file.path);
    return res.status(400).json({ 
      message: '无效的草图类型',
      validTypes: VALID_SKETCH_TYPES
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: '请选择要上传的草图文件' });
  }

  try {
    // 验证用户权限
    const storyboard = await getStoryboardWithAuth(storyboardId, userId);
    if (!storyboard) {
      safeDeleteFile(req.file.path);
      return res.status(404).json({ message: '分镜不存在或无权访问' });
    }

    const projectId = storyboard.project_id;

    // 创建存储目录
    const sketchDir = path.join(UPLOADS_BASE, 'sketches', String(projectId));
    if (!fs.existsSync(sketchDir)) {
      fs.mkdirSync(sketchDir, { recursive: true });
    }

    // 生成文件名
    const ext = EXTENSION_MAP[req.file.mimetype] || 'png';
    const fileName = `${storyboardId}_${Date.now()}.${ext}`;
    const finalPath = path.join(sketchDir, fileName);

    // 移动文件到正确目录
    fs.renameSync(req.file.path, finalPath);

    // 删除旧草图文件
    if (storyboard.sketch_url) {
      // 修复路径拼接：去掉 URL 前缀 /uploads/，拼到 UPLOADS_BASE 下
      const relative = storyboard.sketch_url.replace(/^\/uploads\//, '');
      const oldFilePath = path.join(UPLOADS_BASE, relative);
      safeDeleteFile(oldFilePath);
    }

    // 生成相对 URL
    const sketchUrl = `/uploads/sketches/${projectId}/${fileName}`;

    // 更新数据库
    await execute(
      'UPDATE storyboards SET sketch_url = ?, sketch_type = ? WHERE id = ?',
      [sketchUrl, sketchType, storyboardId]
    );

    console.log('[Sketch] Uploaded:', { storyboardId, sketchUrl, sketchType });

    res.json({ 
      message: '草图上传成功',
      sketch_url: sketchUrl,
      sketchUrl  // 兼容前端驼峰命名
    });
  } catch (err) {
    // 清理临时文件
    if (req.file) safeDeleteFile(req.file.path);
    console.error('[Sketch Upload]', err);
    res.status(500).json({ message: '草图上传失败' });
  }
}

/**
 * DELETE /:storyboardId/sketch
 * 删除草图
 */
async function deleteSketch(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);

  if (!storyboardId) {
    return res.status(400).json({ message: '无效的分镜 ID' });
  }

  try {
    // 验证用户权限
    const storyboard = await getStoryboardWithAuth(storyboardId, userId);
    if (!storyboard) {
      return res.status(404).json({ message: '分镜不存在或无权访问' });
    }

    // 删除文件
    if (storyboard.sketch_url) {
      // 修复路径拼接：去掉 URL 前缀 /uploads/，拼到 UPLOADS_BASE 下
      const relative = storyboard.sketch_url.replace(/^\/uploads\//, '');
      const filePath = path.join(UPLOADS_BASE, relative);
      safeDeleteFile(filePath);
    }

    // 重置数据库字段
    await execute(
      'UPDATE storyboards SET sketch_url = NULL, sketch_type = NULL, sketch_data = NULL, control_strength = 0.85 WHERE id = ?',
      [storyboardId]
    );

    console.log('[Sketch] Deleted:', { storyboardId });

    res.json({ success: true });
  } catch (err) {
    console.error('[Sketch Delete]', err);
    res.status(500).json({ message: '删除草图失败' });
  }
}

/**
 * PUT /:storyboardId/sketch-settings
 * 更新草图设置
 */
async function updateSketchSettings(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const { sketch_type, control_strength } = req.body;

  if (!storyboardId) {
    return res.status(400).json({ message: '无效的分镜 ID' });
  }

  // 验证参数
  if (sketch_type !== undefined && !VALID_SKETCH_TYPES.includes(sketch_type)) {
    return res.status(400).json({ 
      message: '无效的草图类型',
      validTypes: VALID_SKETCH_TYPES
    });
  }

  if (control_strength !== undefined) {
    const strength = Number(control_strength);
    if (isNaN(strength) || strength < 0 || strength > 1) {
      return res.status(400).json({ message: 'control_strength 必须在 0.0 ~ 1.0 之间' });
    }
  }

  try {
    // 验证用户权限
    const storyboard = await getStoryboardWithAuth(storyboardId, userId);
    if (!storyboard) {
      return res.status(404).json({ message: '分镜不存在或无权访问' });
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (sketch_type !== undefined) {
      updates.push('sketch_type = ?');
      params.push(sketch_type);
    }

    if (control_strength !== undefined) {
      updates.push('control_strength = ?');
      params.push(Number(control_strength));
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '没有需要更新的字段' });
    }

    params.push(storyboardId);
    await execute(`UPDATE storyboards SET ${updates.join(', ')} WHERE id = ?`, params);

    // 查询更新后的数据
    const updated = await queryOne(
      'SELECT sketch_type, control_strength FROM storyboards WHERE id = ?',
      [storyboardId]
    );

    console.log('[Sketch] Settings updated:', { storyboardId, ...updated });

    res.json({
      message: '草图设置已更新',
      sketch_type: updated.sketch_type,
      control_strength: updated.control_strength
    });
  } catch (err) {
    console.error('[Sketch Settings]', err);
    res.status(500).json({ message: '更新草图设置失败' });
  }
}

/**
 * PUT /:storyboardId/sketch-data
 * 保存 Excalidraw 矢量数据
 */
async function saveSketchData(req, res) {
  const userId = req.user.id;
  const storyboardId = Number(req.params.storyboardId);
  const { sketch_data } = req.body;

  if (!storyboardId) {
    return res.status(400).json({ message: '无效的分镜 ID' });
  }

  if (sketch_data === undefined) {
    return res.status(400).json({ message: '缺少 sketch_data 字段' });
  }

  try {
    // 验证用户权限
    const storyboard = await getStoryboardWithAuth(storyboardId, userId);
    if (!storyboard) {
      return res.status(404).json({ message: '分镜不存在或无权访问' });
    }

    // 存储 JSON 数据
    await execute(
      'UPDATE storyboards SET sketch_data = ? WHERE id = ?',
      [JSON.stringify(sketch_data), storyboardId]
    );

    console.log('[Sketch] Data saved:', { storyboardId });

    res.json({ success: true });
  } catch (err) {
    console.error('[Sketch Data]', err);
    res.status(500).json({ message: '保存草图数据失败' });
  }
}

/**
 * 导出路由注册函数
 * @param {import('express').Router} router 
 */
module.exports = function(router) {
  const { authMiddleware } = require('../../middleware');

  // 上传草图（使用 multer 处理文件上传）
  router.post('/:storyboardId/sketch', authMiddleware, upload.single('sketch'), uploadSketch);

  // 删除草图
  router.delete('/:storyboardId/sketch', authMiddleware, deleteSketch);

  // 更新草图设置
  router.put('/:storyboardId/sketch-settings', authMiddleware, updateSketchSettings);

  // 保存 Excalidraw 数据
  router.put('/:storyboardId/sketch-data', authMiddleware, saveSketchData);
};

