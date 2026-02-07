const express = require('express');
const router = express.Router();

// 导入所有端点处理器
const getTemplates = require('./getTemplates');
const autoGenerate = require('./autoGenerate');
const saveFromWorkflow = require('./saveFromWorkflow');
const getByScriptId = require('./getByScriptId');
const saveManual = require('./saveManual');
const extractScenes = require('./extractScenes');
const batchGenerateFrames = require('./batchGenerateFrames');
const batchGenerateVideos = require('./batchGenerateVideos');

// 注册路由（顺序很重要！具体路由在前，通用路由在后）
getTemplates(router);
autoGenerate(router);
batchGenerateFrames(router);
batchGenerateVideos(router);
saveFromWorkflow(router);
extractScenes(router);
saveManual(router);
getByScriptId(router);  // 必须放在最后，因为 /:scriptId 会匹配所有路径

module.exports = router;
