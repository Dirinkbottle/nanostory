/**
 * GET /api/storyboards/templates
 * 获取分镜模板列表
 */

const DEFAULT_TEMPLATES = [
  {
    id: 'closeup-dialogue',
    name: '人物近景对话',
    prompt_template: '{角色} 的近景特写，在 {场景} 中进行对话，镜头类型：近景，风格：{风格}',
    category: '对话',
  },
  {
    id: 'wide-shot-scene',
    name: '远景场景展示',
    prompt_template: '广角镜头展示 {场景} 的整体环境，包含 {角色}，镜头类型：远景，风格：{风格}',
    category: '场景',
  },
  {
    id: 'action-shot',
    name: '动作镜头',
    prompt_template: '{角色} 在 {场景} 中做 {动作}，镜头类型：运动镜头，风格：{风格}',
    category: '动作',
  },
  {
    id: 'emotional-closeup',
    name: '情绪特写',
    prompt_template: '{角色} 面部表情特写，展现 {情绪} 的情感，背景虚化，镜头类型：特写，风格：{风格}',
    category: '对话',
  },
  {
    id: 'establishing-shot',
    name: '建立镜头',
    prompt_template: '从空中俯瞰 {场景}，建立整体环境氛围，时间：{时间}，天气：{天气}，风格：{风格}',
    category: '场景',
  },
  {
    id: 'chase-sequence',
    name: '追逐场景',
    prompt_template: '{角色} 在 {场景} 中快速奔跑/追逐，运动模糊效果，动态镜头跟随，风格：{风格}',
    category: '动作',
  },
  {
    id: 'transition-montage',
    name: '蒙太奇转场',
    prompt_template: '快速切换多个 {场景} 画面，展现时间流逝或空间变化，节奏：{节奏}，风格：{风格}',
    category: '转场',
  },
  {
    id: 'dramatic-reveal',
    name: '戏剧性揭示',
    prompt_template: '缓慢推进镜头，逐渐揭示 {对象}，在 {场景} 中营造悬念感，风格：{风格}',
    category: '场景',
  },
  {
    id: 'over-shoulder',
    name: '过肩镜头',
    prompt_template: '从 {角色A} 肩膀后方拍摄 {角色B}，展现两人对话关系，场景：{场景}，风格：{风格}',
    category: '对话',
  },
  {
    id: 'slow-motion',
    name: '慢动作',
    prompt_template: '{角色} 的 {动作} 以慢动作呈现，强调动作细节和戏剧性，场景：{场景}，风格：{风格}',
    category: '动作',
  },
];

async function getTemplates(req, res) {
  res.json(DEFAULT_TEMPLATES);
}

module.exports = getTemplates;
