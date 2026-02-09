/**
 * Storyboards 路由汇总
 */

const express = require('express');
const { authMiddleware } = require('../middleware');

const getTemplates = require('./getTemplates');
const autoGenerate = require('./autoGenerate');
const saveFromWorkflow = require('./saveFromWorkflow');
const getStoryboards = require('./getStoryboards');
const saveStoryboards = require('./saveStoryboards');
const updateMedia = require('./updateMedia');
const validateReadiness = require('./validateReadiness');
const reorderStoryboards = require('./reorderStoryboards');
const deleteStoryboard = require('./deleteStoryboard');
const addStoryboard = require('./addStoryboard');

const router = express.Router();

// 手动添加单个分镜
router.post('/add', authMiddleware, addStoryboard);

// 分镜排序保存
router.patch('/reorder', authMiddleware, reorderStoryboards);

// 删除单个分镜
router.delete('/scene/:storyboardId', authMiddleware, deleteStoryboard);

// 分镜生成预检（检查资产完整性）
router.get('/:storyboardId/validate', authMiddleware, validateReadiness);

// 获取分镜模板
router.get('/templates', authMiddleware, getTemplates);

// 自动生成分镜（异步工作流）
router.post('/auto-generate/:scriptId', authMiddleware, autoGenerate);

// 保存工作流生成的分镜结果
router.post('/save-from-workflow', authMiddleware, saveFromWorkflow);

// 获取指定剧本的所有分镜
router.get('/:scriptId', authMiddleware, getStoryboards);

// 保存/更新分镜列表
router.post('/:scriptId', authMiddleware, saveStoryboards);

// 更新单个分镜的图片或视频
router.patch('/:storyboardId/media', authMiddleware, updateMedia);

module.exports = router;
