/**
 * 工作流统一字段表
 * 
 * 所有工作流 handler 接收的字段名必须从此表中选取。
 * buildInputFactory.js 在编译期校验字段名是否合法。
 * 
 * 每个字段定义：
 *   from:         对应 jobParams 中的 key（运行时从 context.jobParams[from] 取值）
 *   defaultValue: 取不到时的默认值
 *   resolver:     自定义取值函数 (context) => value，优先级高于 from
 *   description:  字段说明（仅文档用途）
 *   category:     分类标签，方便查阅
 */

module.exports = {

  // ================================================================
  //  AI 模型（按类型严格区分，禁止使用 modelName）
  // ================================================================
  textModel: {
    from: 'textModel',
    defaultValue: null,
    description: '文本生成模型名称（剧本、分镜、提示词生成等）',
    category: 'model'
  },
  imageModel: {
    from: 'imageModel',
    defaultValue: null,
    description: '图片生成模型名称（角色图、场景图、帧图等）',
    category: 'model'
  },
  videoModel: {
    from: 'videoModel',
    defaultValue: null,
    description: '视频生成模型名称（分镜视频等）',
    category: 'model'
  },
  audioModel: {
    from: 'audioModel',
    defaultValue: null,
    description: '音频生成模型名称（配音、音效等，预留）',
    category: 'model'
  },

  // ================================================================
  //  通用标识
  // ================================================================
  projectId: {
    from: 'projectId',
    defaultValue: null,
    description: '项目 ID',
    category: 'id'
  },
  scriptId: {
    from: 'scriptId',
    defaultValue: null,
    description: '剧本 ID',
    category: 'id'
  },
  sceneId: {
    from: 'sceneId',
    defaultValue: null,
    description: '场景 ID',
    category: 'id'
  },
  characterId: {
    from: 'characterId',
    defaultValue: null,
    description: '角色 ID',
    category: 'id'
  },
  storyboardId: {
    from: 'storyboardId',
    defaultValue: null,
    description: '分镜 ID',
    category: 'id'
  },
  userId: {
    from: null,
    resolver: (ctx) => ctx.userId,
    defaultValue: null,
    description: '用户 ID（从 context.userId 取，非 jobParams）',
    category: 'id'
  },

  // ================================================================
  //  剧本相关
  // ================================================================
  title: {
    from: 'title',
    defaultValue: null,
    description: '剧本/项目标题',
    category: 'script'
  },
  description: {
    from: 'description',
    defaultValue: null,
    description: '描述文本（剧本描述、角色描述、场景描述等通用）',
    category: 'script'
  },
  style: {
    from: 'style',
    defaultValue: null,
    description: '风格（写实、动漫、赛博朋克等）',
    category: 'script'
  },
  length: {
    from: 'length',
    defaultValue: null,
    description: '剧本篇幅（短篇、中篇、长篇）',
    category: 'script'
  },
  episodeNumber: {
    from: 'episodeNumber',
    defaultValue: null,
    description: '集数编号',
    category: 'script'
  },
  scriptContent: {
    from: 'scriptContent',
    defaultValue: null,
    description: '剧本正文内容',
    category: 'script'
  },
  scriptTitle: {
    from: 'scriptTitle',
    defaultValue: null,
    description: '剧本标题（用于分镜生成等）',
    category: 'script'
  },

  // ================================================================
  //  场景相关
  // ================================================================
  sceneName: {
    from: 'sceneName',
    defaultValue: null,
    description: '场景名称',
    category: 'scene'
  },
  environment: {
    from: 'environment',
    defaultValue: null,
    description: '环境描述',
    category: 'scene'
  },
  lighting: {
    from: 'lighting',
    defaultValue: null,
    description: '光照描述',
    category: 'scene'
  },
  mood: {
    from: 'mood',
    defaultValue: null,
    description: '氛围描述',
    category: 'scene'
  },
  scenes: {
    from: 'scenes',
    defaultValue: null,
    description: '场景列表（用于提取任务）',
    category: 'scene'
  },

  // ================================================================
  //  角色相关
  // ================================================================
  characterName: {
    from: 'characterName',
    defaultValue: null,
    description: '角色名称',
    category: 'character'
  },
  appearance: {
    from: 'appearance',
    defaultValue: null,
    description: '外貌特征描述',
    category: 'character'
  },
  personality: {
    from: 'personality',
    defaultValue: null,
    description: '性格特点描述',
    category: 'character'
  },

  // ================================================================
  //  批量控制
  // ================================================================
  overwriteFrames: {
    from: 'overwriteFrames',
    defaultValue: false,
    description: '是否覆盖已有首/首尾帧（批量生成时使用）',
    category: 'control'
  },
  overwriteVideos: {
    from: 'overwriteVideos',
    defaultValue: false,
    description: '是否覆盖已有视频（批量视频生成时使用）',
    category: 'control'
  },
  maxConcurrency: {
    from: 'maxConcurrency',
    defaultValue: 20,
    description: '最大并发数（批量任务使用，1~100）',
    category: 'control'
  },

  // ================================================================
  //  图片 / 视频生成
  // ================================================================
  prompt: {
    from: 'prompt',
    defaultValue: null,
    description: '生成提示词（图片/视频通用）',
    category: 'generation'
  },
  imageUrl: {
    from: 'imageUrl',
    defaultValue: null,
    description: '单张图片 URL（string，用于图生视频等）。模板占位符: {{imageUrl}}',
    category: 'generation'
  },
  imageUrls: {
    from: 'imageUrls',
    defaultValue: null,
    description: '图片 URL 数组（string[]，用于参考图/角色一致性等）。模板占位符: {{imageUrls}}',
    category: 'generation'
  },
  startFrame: {
    from: 'startFrame',
    defaultValue: null,
    description: '首帧图片 URL',
    category: 'generation'
  },
  endFrame: {
    from: 'endFrame',
    defaultValue: null,
    description: '尾帧图片 URL',
    category: 'generation'
  },
  width: {
    from: 'width',
    defaultValue: 1024,
    description: '输出宽度（像素）',
    category: 'generation'
  },
  height: {
    from: 'height',
    defaultValue: 1024,
    description: '输出高度（像素）',
    category: 'generation'
  },
  duration: {
    from: 'duration',
    defaultValue: 5,
    description: '视频时长（秒）',
    category: 'generation'
  },
  aspectRatio: {
    from: 'aspectRatio',
    defaultValue: null,
    description: '画面比例（如 "16:9"、"9:16"、"1:1"）',
    category: 'generation'
  },

  // ================================================================
  //  管理后台
  // ================================================================
  apiDoc: {
    from: 'apiDoc',
    defaultValue: null,
    description: 'API 文档内容（智能解析用）',
    category: 'admin'
  },
  customPrompt: {
    from: 'customPrompt',
    defaultValue: null,
    description: '自定义提示词（智能解析用）',
    category: 'admin'
  }
};
