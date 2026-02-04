// 视频生成模型配置
const VIDEO_MODELS = {
  // 极致档 - 顶级质量，适合专业制作
  ultimate: {
    provider: 'volcengine', // 火山引擎
    model: 'doubao-video-pro',
    displayName: '火山引擎 Video Pro',
    tier: '极致',
    description: '顶级视频质量，4K输出，适合商业作品',
    pricing: {
      perSecond: 0.5,  // 每秒视频价格
      perFrame: 0.05   // 每帧价格
    },
    features: ['4K输出', '60fps', '专业调色', '高精度运动'],
    maxDuration: 60,
    endpoint: 'https://visual.volcengineapi.com'
  },
  
  // 性能档 - 高质量，性价比高
  performance: {
    provider: 'minimax',
    model: 'video-01',
    displayName: 'MiniMax Video-01',
    tier: '性能',
    description: '高质量视频，平衡质量与速度',
    pricing: {
      perSecond: 0.2,
      perFrame: 0.02
    },
    features: ['1080P输出', '30fps', '智能补帧', '快速生成'],
    maxDuration: 30,
    endpoint: 'https://api.minimax.chat/v1/video_generation'
  },
  
  // 经济档 - 稳定可靠，价格适中
  economy: {
    provider: 'runway',
    model: 'gen-2',
    displayName: 'Runway Gen-2',
    tier: '经济',
    description: '稳定的视频生成，适合日常创作',
    pricing: {
      perSecond: 0.1,
      perFrame: 0.01
    },
    features: ['720P输出', '24fps', '标准质量', '稳定输出'],
    maxDuration: 15,
    endpoint: 'https://api.runwayml.com/v1'
  },
  
  // 轻量档 - 快速预览，低成本
  lightweight: {
    provider: 'placeholder',
    model: 'fast-preview',
    displayName: '快速预览',
    tier: '轻量',
    description: '快速生成预览，低成本测试',
    pricing: {
      perSecond: 0.05,
      perFrame: 0.005
    },
    features: ['480P输出', '15fps', '快速生成', '预览级质量'],
    maxDuration: 10,
    endpoint: 'internal'
  }
};

// 文本生成模型配置
const TEXT_MODELS = {
  // DeepSeek - 高性价比文本生成
  deepseek: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    description: '高性价比AI文本生成，适合剧本创作',
    pricing: {
      perToken: 0.0000014  // 每token价格（人民币）
    },
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    maxTokens: 8000
  }
};

module.exports = {
  VIDEO_MODELS,
  TEXT_MODELS
};
