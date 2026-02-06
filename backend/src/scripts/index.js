/**
 * Scripts API 路由集成
 * 所有剧本相关的 API 端点
 */

const express = require('express');
const { authMiddleware } = require('../middleware');

// 导入所有端点处理函数
const getModels = require('./Noraml/getModels');
const generateScript = require('./ScriptStudio/generateScript');
const saveFromWorkflow = require('./ScriptStudio/saveFromWorkflow');
const getProjectScripts = require('./ScriptStudio/getProjectScripts');
const getEpisode = require('./ScriptStudio/getEpisode');
const getAllScripts = require('./ScriptStudio/getAllScripts');
const updateScript = require('./ScriptStudio/updateScript');
const deleteScript = require('./ScriptStudio/deleteScript');

const router = express.Router();

// ============================================================
// 路由定义
// ============================================================

// 获取可用模型
router.get('/models', getModels);

// 生成剧本
router.post('/generate', authMiddleware, generateScript);

// 保存工作流结果
router.post('/save-from-workflow', authMiddleware, saveFromWorkflow);

// 获取项目的所有剧本
router.get('/project/:projectId', authMiddleware, getProjectScripts);

// 获取指定集的剧本
router.get('/project/:projectId/episode/:episodeNumber', authMiddleware, getEpisode);

// 获取所有剧本（旧接口）
router.get('/', authMiddleware, getAllScripts);

// 更新剧本
router.put('/:id', authMiddleware, updateScript);

// 删除剧本
router.delete('/:id', authMiddleware, deleteScript);

module.exports = router;
