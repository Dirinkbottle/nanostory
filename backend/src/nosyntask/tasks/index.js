/**
 * 任务处理器统一导出
 * 每个处理器是一个纯函数：接收 input_params，调用 AI，返回 result_data
 */

const handleScriptGeneration = require('./scriptGeneration');
const handleCharacterExtraction = require('./characterExtraction');
const handleImageGeneration = require('./imageGeneration');
const handleVideoGeneration = require('./videoGeneration');
const handleSmartParse = require('./smartParse');

module.exports = {
  handleScriptGeneration,
  handleCharacterExtraction,
  handleImageGeneration,
  handleVideoGeneration,
  handleSmartParse
};
