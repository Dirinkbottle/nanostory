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
  handleBatchSceneVideoGeneration,
  handleSceneStyleAnalysis,
  handleCameraRunGeneration,
  handleSceneStateAnalysis,
  handleSaveStoryboards,
  handleSceneStoryboardGeneration,
  handleBatchStoryboardGeneration
} = require('./tasks');

// 独立帧生成模块（支持并发）
const { handleParallelFrameGeneration } = require('./tasks/StoryBoard/independentFrameGeneration');

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
   * 智能分镜（优化后）- 4 步骤，3 次 AI 调用
   * 
   * 流程（支持并行）：
   *   1. storyboard_generation  - AI 生成分镜内容
   *   2. save_storyboards       - 保存分镜 + 从 location 字段提取场景（无 AI）
   *   3. character_extraction   - AI 提取角色详情 ← 与步骤4并行执行
   *   4. scene_state_analysis   - AI 分析环境状态 ← 与步骤3并行执行
   * 
   * dependencies 字段说明：
   *   - 步骤的 dependencies 数组指定它依赖的步骤索引（从0开始）
   *   - 当一个步骤的所有依赖都完成后，它可以开始执行
   *   - 多个步骤如果依赖相同的步骤，可以并行执行
   */
  storyboard_generation: {
    name: '智能分镜',
    steps: [
      {
        type: 'storyboard_generation',
        targetType: 'storyboard',
        handler: handleStoryboardGeneration,
        // dependencies: [] - 无依赖，立即执行
        buildInput: createBuildInput([
          'scriptContent', 'scriptTitle', 'textModel',
          { key: 'think', defaultValue: true }
        ])
      },
      {
        type: 'save_storyboards',
        targetType: 'storyboard',
        handler: handleSaveStoryboards,
        dependencies: [0], // 依赖步骤0（storyboard_generation）
        buildInput: createBuildInput([
          { key: 'scenes', from: ctx => ctx.previousResults[0]?.scenes || [] },
          'scriptId', 'projectId', 'userId'
        ])
      },
      {
        type: 'character_extraction',
        targetType: 'characters',
        handler: handleCharacterExtraction,
        dependencies: [1], // 依赖步骤1（save_storyboards）
        buildInput: createBuildInput([
          { key: 'scenes', from: ctx => ctx.previousResults[0]?.scenes || [] },
          'scriptContent', 'projectId', 'scriptId', 'userId', 'textModel'
        ])
      },
      {
        type: 'scene_state_analysis',
        targetType: 'storyboard',
        handler: handleSceneStateAnalysis,
        dependencies: [1], // 也依赖步骤1，与步骤2并行执行
        buildInput: createBuildInput([
          'scriptId', 'textModel', { key: 'think', defaultValue: true }
        ])
      }
    ]
  },

  /**
   * 单场景分镜生成
   * 用于按场景分割的分镜生成模式
   * 
   * 流程：
   *   1. scene_storyboard_generation - AI 将单个场景转化为分镜
   *   2. save_storyboards - 保存分镜到数据库
   */
  scene_storyboard_generation: {
    name: '场景分镜',
    steps: [
      {
        type: 'scene_storyboard_generation',
        targetType: 'storyboard',
        handler: handleSceneStoryboardGeneration,
        buildInput: createBuildInput([
          'sceneContent', 'sceneName', 'sceneNumber', 'totalScenes',
          'previousSceneContext', 'scriptTitle', 'textModel',
          { key: 'think', defaultValue: true }
        ])
      },
      {
        type: 'save_storyboards',
        targetType: 'storyboard',
        handler: handleSaveStoryboards,
        dependencies: [0],
        buildInput: createBuildInput([
          { key: 'scenes', from: ctx => ctx.previousResults[0]?.scenes || [] },
          'scriptId', 'projectId', 'userId', 'sceneNumber', 'appendMode'
        ])
      }
    ]
  },

  /**
   * 批量分镜生成（整合版）
   * 将多场景分镜生成整合为单一任务显示
   * 
   * 特点：
   *   - 用户界面只显示一个统一任务
   *   - 后台按场景分割顺序处理
   *   - 统一进度反馈
   *   - 保持场景间连贯性
   *   - 结果按顺序整合后一次性保存
   *   - 分镜保存后自动提取角色
   */
  batch_storyboard_generation: {
    name: '分镜生成',
    steps: [
      {
        type: 'batch_storyboard_generation',
        targetType: 'storyboard',
        handler: handleBatchStoryboardGeneration,
        buildInput: createBuildInput([
          'scriptId', 'projectId', 'userId', 'textModel',
          { key: 'clearExisting', defaultValue: true },
          { key: 'think', defaultValue: false }
        ])
      },
      {
        // 分镜保存后提取角色
        type: 'character_extraction',
        targetType: 'characters',
        handler: handleCharacterExtraction,
        dependencies: [0],
        buildInput: createBuildInput([
          'scriptContent', 'projectId', 'scriptId', 'userId', 'textModel'
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
   * 场景图片生成
   */
  scene_image_generation: {
    name: '场景图片生成',
    steps: [
      {
        type: 'scene_style_analysis',
        targetType: 'scene',
        handler: handleSceneStyleAnalysis,
        buildInput: createBuildInput([
          'sceneName', 'description', 'environment', 'allScenes', 'textModel'
        ])
      },
      {
        type: 'scene_image_generation',
        targetType: 'scene',
        handler: handleSceneImageGeneration,
        buildInput: createBuildInput([
          'sceneId', 'sceneName', 'description', 'environment',
          'lighting', 'mood', 'style',
          'imageModel', 'textModel',
          { key: 'width', defaultValue: 1024 },
          { key: 'height', defaultValue: 576 },
          { key: 'referenceImageUrl', from: ctx => ctx.previousResults[0]?.referenceImageUrl || null },
          { key: 'styleDescription', from: ctx => ctx.previousResults[0]?.styleDescription || null }
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
   * 并发分镜帧生成（独立模式 - 每个分镜独立生成，支持并发）
   * 与 batch_frame_generation 的区别：
   *   1. 不使用链式传递（prevEndFrameUrl），每个分镜独立
   *   2. 支持真正的并发处理，效率更高
   *   3. 适合对连贯性要求不高、需要快速生成的场景
   */
  parallel_frame_generation: {
    name: '并发分镜帧生成',
    steps: [
      {
        type: 'parallel_frame',
        targetType: 'storyboard',
        handler: handleParallelFrameGeneration,
        buildInput: createBuildInput([
          'scriptId', 'imageModel', 'textModel', 'overwriteFrames',
          { key: 'maxConcurrency', defaultValue: 5 },  // 默认5个并发，避免API限流
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
          { key: 'think', defaultValue: true },
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
          'description', 'style', 'projectId', 'imageModel', 'textModel',
          { key: 'width', defaultValue: 512 },
          { key: 'height', defaultValue: 768 }
        ])
      }
    ]
  },

  /**
   * 精细运镜提示词生成（单个分镜）
   */
  camera_run_generation: {
    name: '精细运镜生成',
    steps: [
      {
        type: 'camera_run_generation',
        targetType: 'storyboard',
        handler: handleCameraRunGeneration,
        buildInput: createBuildInput([
          'storyboardId', 'textModel',
          { key: 'think', defaultValue: true }
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
