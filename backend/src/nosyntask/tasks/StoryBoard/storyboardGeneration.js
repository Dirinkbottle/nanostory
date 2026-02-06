/**
 * 自动分镜处理器
 * 调用文本模型将剧本内容拆分为分镜镜头列表
 * 
 * input:  { scriptContent, scriptTitle, modelName }
 * output: { scenes: [...], count }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const handleRepairJsonResponse = require('./repairJsonResponse');

async function handleStoryboardGeneration(inputParams, onProgress) {
  const { scriptContent, scriptTitle, modelName } = inputParams;

  if (!scriptContent || scriptContent.trim() === '') {
    throw new Error('剧本内容为空，无法生成分镜');
  }

  const selectedModel = modelName || 'DeepSeek Chat';

  if (onProgress) onProgress(10);

  const fullPrompt = `你是一个专业的电影分镜师。你的任务是将剧本极度细化为分镜，每个镜头只展示一个静止画面。规则：1）每句对白独立一个镜头；2）每个动作分解为准备-进行-结果；3）场景切换要从远到近层层推进；4）一个剧本场景至少拆成5-10个镜头。

**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹，例如 "description": "这是描述"
- 不要输出 "description": 这是描述（缺少引号）
- 确保 JSON 格式完整，以 ] 结尾
- 只输出 JSON 数组，不要添加其他说明文字

---

请根据以下剧本内容，将其细化为电影级分镜镜头。

【剧本内容】
${scriptContent}

【核心要求 - 极度细化】
1. 每个分镜 = 一个静止画面，可直接生成一张图片
2. 对话场景必须拆分：
   - 每句对白一个镜头（说话人特写）
   - 穿插听者反应镜头
   - 适时加入双人镜头或场景全景
3. 动作场景必须拆分：
   - 动作准备阶段
   - 动作进行中
   - 动作结果
4. 场景切换时：
   - 先用远景/全景建立新场景
   - 再逐步推近到角色
5. 情绪变化点要单独一个特写镜头
6. 数量要求：一个场景至少拆成 5-10 个镜头

【输出 JSON 格式】
每个分镜包含：
- order: 分镜序号（从1开始）
- shotType: 镜头类型（"特写"/"近景"/"中景"/"全景"/"远景"/"俯拍"/"仰拍"/"过肩"）
- description: 画面描述（详细描述画面内容，要足够详细，可直接用于AI生图）
- hasAction: 是否有动作（true/false）
- startFrame: 首帧描述（仅当hasAction=true时）
- endFrame: 尾帧描述（仅当hasAction=true时）
- dialogue: 对白内容（如果有）
- duration: 建议时长（秒）
- characters: 出现的角色数组
- location: 场景地点
- emotion: 情绪氛围

只输出 JSON 数组，不要其他内容。示例：
[
  {"order": 1, "shotType": "远景", "description": "清晨的城市天际线，高楼大厦沐浴在金色晨光中", "hasAction": false, "dialogue": "", "duration": 2, "characters": [], "location": "城市外景", "emotion": "平静"},
  {"order": 2, "shotType": "近景", "description": "主角侧脸特写，眼神望向窗外", "hasAction": true, "startFrame": "主角侧脸望向窗外", "endFrame": "主角缓缓转头看向镜头", "dialogue": "新的一天又开始了...", "duration": 3, "characters": ["主角"], "location": "办公室", "emotion": "沉思"}
]`;

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    modelName: selectedModel,
    maxTokens: 8192,
    temperature: 0.3
  }, onProgress);

  if (onProgress) onProgress(80);

  // 解析 AI 返回的 JSON
  let scenes = [];
  try {
    let jsonStr = result.content;
    
    console.log('[StoryboardGen] 响应总长度:', jsonStr.length, '字符');
    console.log('[StoryboardGen] 原始响应 (前200字符):', jsonStr.substring(0, 200));
    console.log('[StoryboardGen] 原始响应 (后200字符):', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
    
    // 这里直接输出全部原始响应体
    console.log('[StoryboardGen] 原始响应 (全部):', jsonStr);


    // 1. 先处理 <think> 标签
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // 2. 处理 markdown 代码块包裹 (```json ... ``` 或 ``` ... ```)
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[StoryboardGen] 提取代码块后长度:', jsonStr.length, '字符');
      console.log('[StoryboardGen] 提取代码块后 (前200字符):', jsonStr.substring(0, 200));
      console.log('[StoryboardGen] 提取代码块后 (后200字符):', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
    }
    
    // 3. 移除可能的前导/尾随空白和换行
    jsonStr = jsonStr.trim();
    
    // 4. 修复常见的 JSON 格式错误（AI 有时会忘记加引号）
    // 只修复明确缺少引号的情况：字段名后直接跟非引号、非数字、非布尔的内容
    // 使用更保守的策略，避免误修改正常内容
    
    // 先尝试解析，如果失败再尝试修复
    let needsFix = false;
    try {
      JSON.parse(jsonStr);
    } catch (e) {
      needsFix = true;
      console.log('[StoryboardGen] JSON 解析失败，尝试修复格式错误...');
    }
    
    if (needsFix) {
      // 修复策略：查找 "key": 后面没有引号的中文或字母开头的值
      // 匹配到下一个逗号或右花括号之前的内容
      const lines = jsonStr.split('\n');
      const fixedLines = lines.map(line => {
        // 匹配模式："key": value, 或 "key": value}
        // 其中 value 不是以引号、数字、true、false、null、[ 或 { 开头
        return line.replace(
          /"(\w+)":\s*([^"\d\[\{tfn][^,\}]*?)([,\}])/g,
          (match, key, value, end) => {
            const trimmedValue = value.trim();
            // 确保不是 true/false/null
            if (trimmedValue !== 'true' && 
                trimmedValue !== 'false' && 
                trimmedValue !== 'null') {
              console.log('[StoryboardGen] 修复字段:', key, '→', trimmedValue.substring(0, 30) + '...');
              // 移除值末尾可能的多余空格
              return `"${key}": "${trimmedValue}"${end}`;
            }
            return match;
          }
        );
      });
      jsonStr = fixedLines.join('\n');
      console.log('[StoryboardGen] 格式修复完成，重新尝试解析...');
    }
    
    // 5. 检测 JSON 是否完整（应该以 ] 结尾）
    const isIncomplete = !jsonStr.endsWith(']') && !jsonStr.endsWith('}');
    if (isIncomplete) {
      console.warn('[StoryboardGen] ⚠️ JSON 可能被截断，不以 ] 或 } 结尾');
      console.warn('[StoryboardGen] 将尝试调用修复任务...');
    }
    
    // 6. 尝试解析 JSON
    try {
      scenes = JSON.parse(jsonStr);
      console.log('[StoryboardGen] ✅ 成功解析，共', scenes.length, '个分镜');
    } catch (firstParseError) {
      console.error('[StoryboardGen] ❌ 首次解析失败:', firstParseError.message);
      
      // 尝试修复 JSON
      console.log('[StoryboardGen] 🔧 调用 JSON 修复任务...');
      
      try {
        const repairResult = await handleRepairJsonResponse({
          incompleteJson: jsonStr,
          originalPrompt: fullPrompt,
          modelName: selectedModel
        }, (progress) => {
          if (onProgress) onProgress(80 + progress * 0.15); // 80% -> 95%
        });
        
        if (repairResult.success && repairResult.repairedJson) {
          scenes = repairResult.repairedJson;
          console.log('[StoryboardGen] ✅ JSON 修复成功，共', scenes.length, '个分镜');
        } else {
          console.error('[StoryboardGen] ❌ JSON 修复失败');
          throw new Error('分镜解析失败，AI 返回的内容无法解析为 JSON，修复尝试也失败了: ' + (repairResult.error || firstParseError.message));
        }
      } catch (repairError) {
        console.error('[StoryboardGen] ❌ 修复任务执行失败:', repairError);
        throw new Error('分镜解析失败，AI 返回的内容无法解析为 JSON: ' + firstParseError.message + '。修复尝试失败: ' + repairError.message);
      }
    }
  } catch (parseError) {
    console.error('[StoryboardGen] 解析分镜 JSON 失败:', parseError);
    console.error('[StoryboardGen] 完整响应内容:', result.content);
    throw new Error('分镜解析失败: ' + parseError.message);
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('AI 未返回有效的分镜数据');
  }

  if (onProgress) onProgress(100);

  return {
    scenes,
    count: scenes.length,
    tokens: result.tokens || 0,
    provider: result._model?.provider || 'unknown'
  };
}

module.exports = handleStoryboardGeneration;
