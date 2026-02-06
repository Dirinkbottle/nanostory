/**
 * 工作流定义系统
 * 
 * 设计原则：
 * 1. 任务只负责调用 AI，返回 result_data（纯数据）
 * 2. 工作流引擎负责串联步骤、传递数据
 * 3. 副作用操作（保存数据库、扣费等）由各步骤的 onComplete 回调处理
 * 4. 每个步骤的 buildInput 函数负责从上下文中提取本步骤需要的输入
 * 
 * 任务处理器统一放在 ./tasks/ 目录下，每个文件一个处理器
 */

const {
  handleScriptGeneration,
  handleCharacterExtraction,
  handleSceneExtraction,
  handleImageGeneration,
  handleVideoGeneration,
  handleSmartParse,
  handleFrameGeneration,
  handleSceneVideoGeneration,
  handleStoryboardGeneration,
  handleCharacterViewsGeneration,
  handleSceneImageGeneration
} = require('./tasks');

// ============================================================
// 工作流定义（Workflow Definitions）
// 
// 每个步骤包含：
//   - type:       任务类型（对应 generation_tasks.task_type）
//   - targetType: 产物关联的业务表（对应 generation_tasks.target_type）
//   - handler:    执行函数（纯 AI 调用）
//   - buildInput: 从工作流上下文构建本步骤的 input_params
//                 context = { jobParams, previousResults: { [stepIndex]: result_data } }
//   - modelKey:   从 jobParams 中取模型名的 key（可选）
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
        buildInput: (ctx) => ({
          title: ctx.jobParams.title,
          description: ctx.jobParams.description,
          style: ctx.jobParams.style,
          length: ctx.jobParams.length,
          modelName: ctx.jobParams.modelName,
          projectId: ctx.jobParams.projectId,
          episodeNumber: ctx.jobParams.episodeNumber
        })
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
        buildInput: (ctx) => ({
          scriptContent: ctx.jobParams.scriptContent,
          scriptTitle: ctx.jobParams.scriptTitle,
          modelName: ctx.jobParams.modelName
        })
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
        buildInput: (context) => ({
          scenes: context.jobParams.scenes,
          scriptContent: context.jobParams.scriptContent,
          projectId: context.jobParams.projectId,
          scriptId: context.jobParams.scriptId,
          userId: context.userId,
          modelName: context.jobParams.modelName
        }),
        modelKey: 'modelName'
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
        buildInput: (ctx) => ({
          title: ctx.jobParams.title,
          description: ctx.jobParams.description,
          style: ctx.jobParams.style,
          length: ctx.jobParams.length,
          modelName: ctx.jobParams.modelName
        })
      },
      {
        type: 'character_extract',
        targetType: 'character',
        handler: handleCharacterExtraction,
        buildInput: (ctx) => ({
          scriptContent: ctx.previousResults[0]?.content || '',
          modelName: ctx.jobParams.modelName
        })
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
        buildInput: (ctx) => ({
          apiDoc: ctx.jobParams.apiDoc,
          modelName: ctx.jobParams.modelName,
          customPrompt: ctx.jobParams.customPrompt
        })
      }
    ]
  },

  /**
   * 分镜首尾帧生成（单个分镜的图片）
   */
  frame_generation: {
    name: '分镜首尾帧生成',
    steps: [
      {
        type: 'frame_image',
        targetType: 'storyboard',
        handler: handleFrameGeneration,
        buildInput: (ctx) => ({
          prompt: ctx.jobParams.prompt,
          modelName: ctx.jobParams.modelName,
          width: ctx.jobParams.width || 1024,
          height: ctx.jobParams.height || 576
        })
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
        buildInput: (ctx) => ({
          prompt: ctx.jobParams.prompt,
          imageUrl: ctx.jobParams.imageUrl,
          startFrame: ctx.jobParams.startFrame,
          endFrame: ctx.jobParams.endFrame,
          modelName: ctx.jobParams.modelName,
          duration: ctx.jobParams.duration || 5
        })
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
        buildInput: (context) => ({
          scenes: context.jobParams.scenes,
          scriptContent: context.jobParams.scriptContent,
          projectId: context.jobParams.projectId,
          scriptId: context.jobParams.scriptId,
          userId: context.userId,
          modelName: context.jobParams.modelName
        }),
        modelKey: 'modelName'
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
        buildInput: (context) => ({
          sceneId: context.jobParams.sceneId,
          sceneName: context.jobParams.sceneName,
          description: context.jobParams.description,
          environment: context.jobParams.environment,
          lighting: context.jobParams.lighting,
          mood: context.jobParams.mood,
          style: context.jobParams.style,
          modelName: context.jobParams.modelName,
          width: context.jobParams.width || 1024,
          height: context.jobParams.height || 576
        }),
        modelKey: 'modelName'
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
        buildInput: (context) => ({
          characterId: context.jobParams.characterId,
          characterName: context.jobParams.characterName,
          appearance: context.jobParams.appearance,
          personality: context.jobParams.personality,
          description: context.jobParams.description,
          style: context.jobParams.style,
          modelName: context.jobParams.modelName,
          width: context.jobParams.width || 512,
          height: context.jobParams.height || 768
        }),
        modelKey: 'modelName'
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
    handleStoryboardGeneration
  }
};
