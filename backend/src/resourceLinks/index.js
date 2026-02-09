/**
 * 资源关联模块 — 统一管理分镜与角色/场景的强ID关联
 * 
 * 核心职责：
 *   1. 根据分镜 variables_json 中的角色/场景名字，匹配 characters/scenes 表中的记录
 *   2. 写入 storyboard_characters / storyboard_scenes 关联表
 *   3. 查询分镜关联的角色/场景ID
 * 
 * 设计原则：
 *   - 纯数据操作，不依赖 HTTP 上下文
 *   - 所有函数接收明确参数，可被 saveFromWorkflow、手动保存等多处调用
 */

const { linkStoryboardCharacters } = require('./linkCharacters');
const { linkStoryboardScenes } = require('./linkScenes');
const { getStoryboardLinks } = require('./queryLinks');
const { linkAllForScript } = require('./linkAllForScript');

module.exports = {
  linkStoryboardCharacters,
  linkStoryboardScenes,
  getStoryboardLinks,
  linkAllForScript
};
