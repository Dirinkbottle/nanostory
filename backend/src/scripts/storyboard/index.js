const express = require('express');
const { authMiddleware } = require('../../middleware');
const router = express.Router();

// 导入所有端点处理器
const getTemplates = require('./getTemplates');
const autoGenerate = require('./autoGenerate');
const saveFromWorkflow = require('./saveFromWorkflow');
const getByScriptId = require('./getByScriptId');
const saveManual = require('./saveManual');
const batchGenerateFrames = require('./batchGenerateFrames');
const batchGenerateVideos = require('./batchGenerateVideos');

// 单个分镜操作处理器
const addStoryboard = require('./addStoryboard');
const deleteStoryboard = require('./deleteStoryboard');
const reorderStoryboards = require('./reorderStoryboards');
const validateReadiness = require('./validateReadiness');
const updateMedia = require('./updateMedia');

// 注册路由（顺序很重要！具体路由在前，通用路由在后）

// 单个分镜操作（必须在 /:scriptId 之前）
router.post('/add', authMiddleware, addStoryboard);
router.delete('/scene/:storyboardId', authMiddleware, deleteStoryboard);
router.patch('/reorder', authMiddleware, reorderStoryboards);
router.get('/:storyboardId/validate', authMiddleware, validateReadiness);
router.patch('/:storyboardId/media', authMiddleware, updateMedia);

getTemplates(router);
autoGenerate(router);
batchGenerateFrames(router);
batchGenerateVideos(router);
saveFromWorkflow(router);
saveManual(router);
getByScriptId(router);  // 必须放在最后，因为 /:scriptId 会匹配所有路径

module.exports = router;
