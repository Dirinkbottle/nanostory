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
  handleImageGeneration,
  handleVideoGeneration,
  handleSmartParse
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
   * 完整漫剧生成流水线：剧本 -> 角色提取 -> 角色图片 -> 视频
   */
  comic_generation: {
    name: '漫剧生成',
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
          modelName: ctx.jobParams.textModelName
        })
      },
      {
        type: 'character_extract',
        targetType: 'character',
        handler: handleCharacterExtraction,
        buildInput: (ctx) => ({
          scriptContent: ctx.previousResults[0]?.content || '',
          modelName: ctx.jobParams.textModelName
        })
      },
      {
        type: 'character_image',
        targetType: 'character',
        handler: handleImageGeneration,
        buildInput: (ctx) => {
          const chars = ctx.previousResults[1]?.characters || [];
          const firstChar = chars[0] || {};
          return {
            prompt: `${firstChar.appearance || firstChar.name || '角色'}，高质量，细节丰富`,
            modelName: ctx.jobParams.imageModelName
          };
        }
      },
      {
        type: 'video',
        targetType: 'storyboard',
        handler: handleVideoGeneration,
        buildInput: (ctx) => ({
          prompt: ctx.previousResults[0]?.content?.substring(0, 500) || '',
          image_url: ctx.previousResults[2]?.image_url || null,
          modelName: ctx.jobParams.videoModelName,
          duration: ctx.jobParams.duration || 5
        })
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
    handleSmartParse
  }
};
