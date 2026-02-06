const express = require('express');
const router = express.Router();

// 导入所有端点处理器
const getAll = require('./getAll');
const getByProject = require('./getByProject');
const batchSave = require('./batchSave');
const getById = require('./getById');
const create = require('./create');
const update = require('./update');
const deleteCharacter = require('./delete');
const generateViews = require('./generateViews');
const extractFromStoryboard = require('./extractFromStoryboard');

// 注册路由（顺序很重要！具体路由在前，通用路由在后）
getAll(router);
getByProject(router);
batchSave(router);
generateViews(router);
extractFromStoryboard(router);
create(router);
update(router);
deleteCharacter(router);
getById(router);  // 必须放在最后，因为 /:id 会匹配所有路径

module.exports = router;
