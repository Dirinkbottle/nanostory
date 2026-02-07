/**
 * 工作流定义系统
 * 
 * 设计原则：
 * 1. 任务只负责调用 AI，返回 result_data（纯数据）
 * 2. 工作流引擎负责串联步骤、传递数据
 * 3. 副作用操作（保存数据库、扣费等）由各步骤的 onComplete 回调处理
 * 4. 每个步骤的 buildInput 由 createBuildInput 工厂生成，字段名从统一字段表中选取
 * 
 * 字段表：  config/workflow_fieldtable.js
 * 工厂函数：buildInputFactory.js
 * 任务处理器：./tasks/ 目录
 */

const {
  handleScriptGeneration,
  handleCharacterExtraction,
  handleSceneExtraction,
  handleImageGeneration,
  handleVideoGeneration,
  handleSmartParse,
  handleFrameGeneration,
  handleSingleFrameGeneration,
  handleSceneVideoGeneration,
  handleStoryboardGeneration,
  handleCharacterViewsGeneration,
  handleSceneImageGeneration,
  handleBatchFrameGeneration,
  handleBatchSceneVideoGeneration
} = require('./tasks');

const { createBuildInput } = require('./buildInputFactory');

// ============================================================
// 工作流定义（Workflow Definitions）
// 
// 每个步骤包含：
//   - type:       任务类型（对应 generation_tasks.task_type）
//   - targetType: 产物关联的业务表（对应 generation_tasks.target_type）
//   - handler:    执行函数（纯 AI 调用）
//   - buildInput: 由 createBuildInput 生成，字段名必须在字段表中注册
//                 context = { jobParams, previousResults: { [stepIndex]: result_data } }
// ============================================================

const WORKFLOW_DEFINITIONS = {

  /**
   * 仅生成剧本
   */
  script_only: {
    name: '剧本生成',
    steps: [
      {
        type: 'script_generation',
        targetType: 'script',
        handler: handleScriptGeneration,
        buildInput: createBuildInput([
          'title', 'description', 'style', 'length',
          'textModel', 'projectId', 'episodeNumber'
        ])
      }
    ]
  },

  /**
   * 分镜生成
   */
  storyboard_generation: {
    name: '分镜生成',
    steps: [
      {
        type: 'storyboard_generation',
        targetType: 'storyboard',
        handler: handleStoryboardGeneration,
        buildInput: createBuildInput([
          'scriptContent', 'scriptTitle', 'textModel'
        ])
      }
    ]
  },

  /**
   * 场景提取（手动触发）
   */
  scene_extraction: {
    name: '场景提取',
    steps: [
      {
        type: 'scene_extraction',
        targetType: 'scenes',
        handler: handleSceneExtraction,
        buildInput: createBuildInput([
          'scenes', 'scriptContent', 'projectId', 'scriptId',
          'userId', 'textModel'
        ])
      }
    ]
  },

  /**
   * 剧本 -> 角色提取
   */
  script_and_characters: {
    name: '剧本生成 + 角色提取',
    steps: [
      {
        type: 'script',
        targetType: 'script',
        handler: handleScriptGeneration,
        buildInput: createBuildInput([
          'title', 'description', 'style', 'length', 'textModel'
        ])
      },
      {
        type: 'character_extract',
        targetType: 'character',
        handler: handleCharacterExtraction,
        buildInput: createBuildInput([
          { key: 'scriptContent', from: ctx => ctx.previousResults[0]?.content || '' },
          'textModel'
        ])
      }
    ]
  },

  /**
   * 智能解析 API 文档（管理后台用）
   */
  smart_parse: {
    name: 'AI 智能解析',
    steps: [
      {
        type: 'smart_parse',
        targetType: 'ai_model_config',
        handler: handleSmartParse,
        buildInput: createBuildInput([
          'apiDoc', 'textModel', 'customPrompt'
        ])
      }
    ]
  },

  /**
   * 分镜首尾帧生成（有动作的分镜）
   */
  frame_generation: {
    name: '分镜首尾帧生成',
    steps: [
      {
        type: 'frame_image',
        targetType: 'storyboard',
        handler: handleFrameGeneration,
        buildInput: createBuildInput([
          'storyboardId', 'prompt', 'imageModel', 'textModel',
          { key: 'width', defaultValue: 1024 },
          { key: 'height', defaultValue: 576 }
        ])
      }
    ]
  },

  /**
   * 分镜单帧生成（无动作的分镜）
   */
  single_frame_generation: {
    name: '分镜单帧生成',
    steps: [
      {
        type: 'single_frame',
        targetType: 'storyboard',
        handler: handleSingleFrameGeneration,
        buildInput: createBuildInput([
          'storyboardId', 'description', 'imageModel', 'textModel',
          { key: 'width', defaultValue: 1024 },
          { key: 'height', defaultValue: 576 }
        ])
      }
    ]
  },

  /**
   * 分镜视频生成（单个分镜的视频）
   */
  scene_video: {
    name: '分镜视频生成',
    steps: [
      {
        type: 'scene_video',
        targetType: 'storyboard',
        handler: handleSceneVideoGeneration,
        buildInput: createBuildInput([
          'storyboardId', 'videoModel', 'textModel', 'duration'
        ])
      }
    ]
  },

  /**
   * 角色提取（从分镜或剧本中提取角色）
   */
  character_extraction: {
    name: '角色提取',
    steps: [
      {
        type: 'character_extraction',
        targetType: 'characters',
        handler: handleCharacterExtraction,
        buildInput: createBuildInput([
          'scenes', 'scriptContent', 'projectId', 'scriptId',
          'userId', 'textModel'
        ])
      }
    ]
  },

  /**
   * 场景图片生成
   */
  scene_image_generation: {
    name: '场景图片生成',
    steps: [
      {
        type: 'scene_image_generation',
        targetType: 'scene',
        handler: handleSceneImageGeneration,
        buildInput: createBuildInput([
          'sceneId', 'sceneName', 'description', 'environment',
          'lighting', 'mood', 'style',
          'imageModel', 'textModel',
          { key: 'width', defaultValue: 1024 },
          { key: 'height', defaultValue: 576 }
        ])
      }
    ]
  },

  /**
   * 批量分镜帧生成（一键生成一集所有分镜图片）
   */
  batch_frame_generation: {
    name: '批量分镜帧生成',
    steps: [
      {
        type: 'batch_frame',
        targetType: 'storyboard',
        handler: handleBatchFrameGeneration,
        buildInput: createBuildInput([
          'scriptId', 'imageModel', 'textModel', 'overwriteFrames',
          { key: 'maxConcurrency', defaultValue: 20 },
          { key: 'width', defaultValue: 1024 },
          { key: 'height', defaultValue: 576 }
        ])
      }
    ]
  },

  /**
   * 批量分镜视频生成（一键生成一集所有分镜视频）
   */
  batch_scene_video_generation: {
    name: '批量分镜视频生成',
    steps: [
      {
        type: 'batch_scene_video',
        targetType: 'storyboard',
        handler: handleBatchSceneVideoGeneration,
        buildInput: createBuildInput([
          'scriptId', 'videoModel', 'textModel', 'duration',
          'overwriteVideos',
          { key: 'maxConcurrency', defaultValue: 3 }
        ])
      }
    ]
  },

  /**
   * 角色三视图生成
   */
  character_views_generation: {
    name: '角色三视图生成',
    steps: [
      {
        type: 'character_views_generation',
        targetType: 'character',
        handler: handleCharacterViewsGeneration,
        buildInput: createBuildInput([
          'characterId', 'characterName', 'appearance', 'personality',
          'description', 'style', 'imageModel', 'textModel',
          { key: 'width', defaultValue: 512 },
          { key: 'height', defaultValue: 768 }
        ])
      }
    ]
  }
};

/**
 * 获取工作流定义
 * @param {string} workflowType 
 * @returns {object|null}
 */
function getWorkflowDefinition(workflowType) {
  return WORKFLOW_DEFINITIONS[workflowType] || null;
}

/**
 * 获取所有可用的工作流类型
 */
function getAvailableWorkflows() {
  return Object.entries(WORKFLOW_DEFINITIONS).map(([key, def]) => ({
    type: key,
    name: def.name,
    totalSteps: def.steps.length,
    steps: def.steps.map((s, i) => ({ index: i, type: s.type, targetType: s.targetType }))
  }));
}

module.exports = {
  getWorkflowDefinition,
  getAvailableWorkflows,
  WORKFLOW_DEFINITIONS,
  // 导出处理器，方便单独使用
  handlers: {
    handleScriptGeneration,
    handleCharacterExtraction,
    handleImageGeneration,
    handleVideoGeneration,
    handleSmartParse,
    handleFrameGeneration,
    handleSceneVideoGeneration,
    handleStoryboardGeneration,
    handleBatchFrameGeneration,
    handleBatchSceneVideoGeneration
  }
};
