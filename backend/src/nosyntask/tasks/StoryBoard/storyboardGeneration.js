/**
 * 自动分镜处理器
 * 调用文本模型将剧本内容拆分为分镜镜头列表
 * 同时输出角色和场景信息，减少重复 AI 调用
 * 
 * input:  { scriptContent, scriptTitle, textModel }
 * output: { scenes, characters, locations, count }
 */

const handleBaseTextModelCall = require('../base/baseTextModelCall');
const handleRepairJsonResponse = require('./repairJsonResponse');
const { stripThinkTags, extractCodeBlock, extractJSON, stripInvisible } = require('../../../utils/washBody');

// 超时包装函数
function withTimeout(promise, ms, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

async function handleStoryboardGeneration(inputParams, onProgress) {
  const { scriptContent, scriptTitle, textModel: modelName, think } = inputParams;

  if (!scriptContent || scriptContent.trim() === '') {
    throw new Error('剧本内容为空，无法生成分镜');
  }

  if (!modelName) {
    throw new Error('textModel 参数是必需的');
  }

  if (onProgress) onProgress(10);

  const fullPrompt = `你是一个专业的电影分镜师，精通连续性剪辑（Continuity Editing）规则。你的任务是将剧本细化为分镜，确保相邻镜头在视觉上可以无缝衔接。

规则：
1）每句对白独立一个镜头
2）每个动作分解为准备-进行-结果
3）场景切换要从远到近层层推进
4）一个剧本场景至少拆成5-10个镜头
**重要：必须输出严格的 JSON 格式！**
- 所有字符串值必须用双引号包裹
- 确保 JSON 格式完整，以 ] 结尾
- 只输出 JSON 数组，不要添加其他说明文字
·
---

请根据以下剧本内容，将其细化为电影级分镜镜头。

【剧本内容】
${scriptContent}

【核心要求 - 极度细化】
1. 每个分镜 = 一个静止画面，可直接生成一张图片
   - 无角色的空镜头（如风景、物品特写）characters为空数组[]
2. **description 字段必须包含完整的视觉信息，足够直接用于 AI 绘图**：
   - 必须描述光源方向和光线质感（如「左侧篝火暖光映照」「背光剪影」「顶光投下锐利阴影」）
   - 必须描述色调和氛围（如「暖橙色调」「冷蓝灰色调」「高对比度明暗交织」）
   - 必须描述景深效果（如「前景虚化」「背景虚化突出人物」「全景深锐利」）
   - 必须描述材质和质感细节（如「粗糙的石墙」「光滑的丝绸」「生锈的铁器」）
   - 角色的表情必须精确到具体的面部肌肉状态（如「眉头紧锁、嘴角下撇」而非「悲伤」）
3. 对话场景必须拆分：
   - 每句对白一个镜头（说话人特写，只包含说话人）
   - 穿插听者反应镜头（只包含听者）
   - 适时加入无人的场景全景空镜头
4. 动作场景必须拆分：
   - 动作准备阶段
   - 动作进行中
   - 动作结果
5. 场景切换时：
   - 先用远景/全景建立新场景（无角色空镜头）
   - 再逐步推近到角色
6. 情绪变化点要单独一个特写镜头
7. 数量要求：一个场景至少拆成 5-10 个镜头

【镜头连续性规则 - 极其重要】
相邻镜头必须在视觉上可以无缝衔接，遵守以下专业剪辑规则：

1. **姿态连续性（Match on Action）**：
   - 上一镜头结束时角色的姿势/位置/朝向，必须与下一镜头开始时一致
   - 例如：上一镜头角色站着结束 → 下一镜头角色必须站着开始，不能突然坐着或趴着
   - 如果需要姿态变化（如站→坐），必须有一个过渡镜头展示这个动作

2. **景别渐变规则（30度规则）**：
   - 同场景内相邻镜头的景别不能跳跃太大
   - 允许的渐变：远景↔全景↔中景↔近景↔特写（相邻级别可以跳一级）
   - 禁止直接跳跃：特写→远景 或 远景→特写（必须经过中间景别过渡）
   - 不同场景之间切换不受此限制

3. **空间连续性（180度规则）**：
   - 同一场景内，镜头的拍摄方向应保持在同一侧
   - 角色面朝左离开画面 → 下一镜头应从右侧入画

4. **场景转换规则**：
   - 切换到新场景时，第一个镜头必须是建立镜头（远景/全景），让观众理解新的空间
   - 然后再逐步推近到角色

5. **endState 必须精确**：
   - 每个镜头必须填写 endState，完整描述该镜头结束时的状态
   - 下一个镜头的 startFrame/description 的起始状态必须与上一个镜头的 endState 一致

6. **环境效果描述规范 - 极其重要**：
   每个镜头的 description 中，所有环境效果必须按以下规则精确描述：

   a) **持续性 vs 一次性**：必须区分持续性环境（全程不停）和一次性事件（发生一次就结束）
      - 持续性环境必须明确标注"持续"/"不间断"/"全程"，如："暴风雪持续肆虐（全程不停）"
      - 一次性事件用瞬时动词，如："一道闪电划过天空"
      - 禁止模糊描述：不能只写"暴风雪"而不说明是持续还是短暂

   b) **强度量化**：每个环境效果必须标注强度等级
      - 使用明确的强度词：微弱/轻微/中等/强烈/猛烈
      - 错误示例： "闪电在乌云中若隐若现" → 视频模型会生成猛烈闪电
      - 正确示例： "极远处乌云中偶尔有一丝微弱的电光闪烁（非常微弱，仅是云层内部的微光，没有雷声）"
      - 特别注意："若隐若现""隐约""淡淡的"这类含蓄修辞必须转换为明确的强度描述

   c) **室内外环境隔离**：
      - 室外环境效果不能直接"穿越"到室内
      - 室内镜头描述外部天气时，必须明确说明是"透过窗户/门缝感受到的"，并且强度大幅衰减
      - 错误示例： "庙内，风雪灌入" → 视频模型会在室内生成暴风雪
      - 正确示例： "庙内，少量细小雪粒从破损的窗棂缝隙中被风带入，在火光中可见零星飘落的雪花"
      - 室内不可能出现：室外级别的暴风雪、直接的闪电光照、大面积降雨

   d) **物理交互合理性**：
      - 环境效果与物体/空间的交互必须符合物理规律
      - 通过缝隙进入的风雪：只能是少量、细小、被风挤入的
      - 透过窗户的光：会被窗框遮挡和散射，不是直射
      - 室内火焰受风影响：微微摇曳，不会被吹灭（除非剧情需要）

7. **有声/无声动作区分 - 极其重要**：
   视频模型会根据描述自动生成音频，因此必须严格区分有声和无声动作：

   a) **dialogue 字段与 description 必须一致**：
      - dialogue 有内容 = 角色发出声音的对白，description 中应写"说道"/"喊道"/"低声说"等有声动词
      - dialogue 为空 = 该镜头无任何人声，description 中涉及口部动作必须加"无声地"前缀

   b) **无声口部动作的正确写法**：
      - ✅ "无声地嘴唇微动" "无声地默念" "嘴唇无声翕动"
      - ❌ "嘴唇微动默念" "低声呢喃" "喃喃自语"（这些暗示有声音，会导致视频模型生成配音）
      - 规则：只要 dialogue 为空，description 中一切涉及嘴/唇/念/说/语/喃/呢/吟/诵/叹的词前必须加"无声地"

   c) **叹息/呼吸等非语言声音**：
      - 如果需要叹息/叹气等非语言声音，dialogue 填写 "（叹息）" 或 "（叹气）"
      - 如果不需要声音，写成"无声地长舒一口气"

8. **环境变化追踪 - 极其重要**：
   当镜头中发生环境的不可逆物理变化时，必须严格追踪并传递：

   a) **变化发生的镜头**（description 中必须包含）：
      - 变化的具体过程："杯子从桌上滑落摔碎在地" 而非简单的 "杯子碎了"
      - 变化后的环境细节："碎片散落在地板上，咖啡渍在瓷砖上扩散"
      - endState 中必须包含变化后的环境状态

   b) **变化之后的同场景镜头**（description 和 endState 中必须保留）：
      - 所有后续在同一场景（location 相同）的镜头，description 必须包含已发生的环境变化
      - 例如：杯子在镜头3碎了 → 镜头5（同场景）的 description 必须提及 "地上仍有碎杯片和咖啡渍"
      - endState 也必须包含这些持续存在的环境变化
      - 禁止在后续镜头中遗忘已发生的变化（如碎杯子突然消失）

   c) **不可逆变化的判定标准**：
      - 属于不可逆变化：物品损坏/打翻/移位、液体泼洒、门窗开关、灯光变化、火焰熄灭/点燃、血迹/伤痕
      - 不属于环境变化：角色姿势改变（由 endState 的角色状态部分管理）、表情变化、临时的手势
      - 自然环境渐变：天色变化（黄昏→夜晚）、天气转变（晴→雨），需要在每个镜头中反映当前时间段的状态

【输出 JSON 格式】
每个分镜包含：
- order: 分镜序号（从1开始）
- shotType: 镜头类型（"特写"/"近景"/"中景"/"全景"/"远景"/"俯拍"/"仰拍"/"过肩"）
- description: 画面描述（非常详细地描述画面内容，包含光线、色调、材质、景深、角色精确表情和姿态，要足够详细可直接用于AI生图。至少50字）
- hasAction: 是否有动作（true/false）
- startFrame: 首帧描述（仅当hasAction=true时，描述动作开始瞬间的静止画面，包含角色精确姿势和环境细节）
- endFrame: 尾帧描述（仅当hasAction=true时，描述动作完成瞬间的静止画面，包含角色精确姿势和环境细节）
- endState: 【必填】镜头结束时的完整状态快照。下一个镜头的起始状态必须与此一致。
  · 有角色的镜头【必须】包含以下信息（缺一不可）：
    ① 位置：角色在场景中的具体方位（如「庙内中央偏左」「门口右侧」「窗边」，需描述与场景地标的相对关系）
    ② 朝向：角色面朝/背对的方向（如「面朝庙门方向」「背对窗户，侧身朝向篝火」）
    ③ 姿势：身体姿态（站/坐/蹲/躺/跑等）+ 肢体位置 + 手中物品
    ④ 表情：面部表情状态
    ⑤ 时空方位：当前时间段（如「深夜」「黄昏」）及角色所处空间与周围环境的关系（如「篝火映照下」「月光从窗外透入」）
  · 无角色镜头只描述场景环境状态（门开/关、灯亮/灭、天气变化等）+ 时空方位
- dialogue: 对白内容（如果有）
- duration: 建议时长（秒）
- characters: 出现的角色数组（如["主角"]、["角色A", "角色B"]或[]。一个镜头中可以出现多个角色，但要注意每个角色的位置和朝向描述必须清晰明确）
- location: 场景地点
- emotion: 情绪氛围
- cameraMovement: 镜头运动描述，从以下选择或组合：
  · "static"（静止）- 固定机位，无运动
  · "push_in"（推近）- 镜头向主体推进，营造紧迫感或聚焦
  · "pull_out"（拉远）- 镜头远离主体，揭示环境或制造疏离感
  · "pan_left" / "pan_right"（左摇/右摇）- 镜头水平旋转，跟随或扫视
  · "tilt_up" / "tilt_down"（上摇/下摇）- 镜头垂直旋转，仰视或俯视
  · "track_left" / "track_right"（左移/右移）- 镜头平行移动，跟随角色行走
  · "zoom_in" / "zoom_out"（变焦推/变焦拉）- 焦距变化，不改变机位
  · "follow"（跟随）- 镜头跟随角色运动
  · "crane_up" / "crane_down"（升/降）- 镜头垂直升降
  · "orbit"（环绕）- 围绕主体旋转
  · "shake"（手持晃动）- 模拟手持拍摄的不稳定感，适合紧张/动作场景
  可以组合使用，如 "push_in + tilt_down"（推近同时下摇）

只输出 JSON 数组，不要其他内容。示例（endState必须精确，相邻镜头状态必须衔接）：
[
  {"order": 1, "shotType": "远景", "description": "暴风雪持续肆虐的深夜（风雪全程不停，强度：猛烈），破败的山神庙孤立在荒山中，庙顶积雪厚重，枯树在强风中剧烈摇摆，极远处乌云深处偶尔闪过一丝微弱电光（强度：极微弱，仅云层内部微光，无雷声）", "hasAction": false, "endState": "【时空】深夜，山神庙外景，暴风雪持续肆虐；庙门半掩，庙前空地无人，远处云层偶现微弱电光", "dialogue": "", "duration": 2, "characters": [], "location": "山神庙外", "emotion": "萧瑟", "cameraMovement": "static"},
  {"order": 2, "shotType": "全景", "description": "山神庙内部昏暗，中央篝火微弱摇曳（火光强度：微弱，持续燃烧），林冲裹着破旧棉袄侧卧在供桌旁稻草堆上，花枪靠墙。少量细小雪粒从破损窗棂缝隙被风带入（室内风雪强度：极轻微，仅零星雪粒飘落），庙外暴风雪的呼啸声隐约可闻", "hasAction": false, "endState": "【位置】庙内供桌旁稻草堆上（靠近东墙）【朝向】面朝供桌方向（身体朝西）【姿势】侧卧，双腿微曲，花枪靠墙于右手可及处【表情】双眼微闭，面容疲惫【时空】深夜，篝火微弱映照，窗缝偶有雪粒飘入", "dialogue": "", "duration": 2, "characters": ["林冲"], "location": "山神庙内", "emotion": "凄凉", "cameraMovement": "push_in"},
  {"order": 3, "shotType": "特写", "description": "林冲耳朵特写，篝火微光映照（持续），他猛然睁眼侧耳倾听，庙外隐约传来马蹄声（强度：微弱，被风雪声遮盖大半）", "hasAction": true, "startFrame": "林冲侧卧姿态，耳朵特写，双眼微闭，篝火微光映照", "endFrame": "林冲双眼圆睁，眉头紧锁，侧耳凝听", "endState": "【位置】庙内供桌旁稻草堆上（靠近东墙）【朝向】面朝供桌方向，头微转向庙门方向侧耳【姿势】侧卧，肌肉紧绷，双手未动【表情】双眼圆睁，眉头紧锁，警觉【时空】深夜，篝火微光映照耳廓", "dialogue": "", "duration": 2, "characters": ["林冲"], "location": "山神庙内", "emotion": "警觉", "cameraMovement": "static"},
  {"order": 4, "shotType": "近景", "description": "林冲从稻草堆上猛然翻身坐起，一手撑地一手去够墙边的花枪，篝火因动作带起的气流微微晃动（轻微晃动，不熄灭）", "hasAction": true, "startFrame": "林冲侧卧在稻草堆上，双眼圆睁警觉", "endFrame": "林冲坐起身，右手已握住花枪枪杆", "endState": "【位置】庙内稻草堆上（供桌旁，靠近东墙）【朝向】上身转向庙门方向（朝南）【姿势】坐姿，右手握花枪枪杆，左手撑地，上身前倾【表情】警惕，双眼紧盯庙门方向【时空】深夜，篝火因气流微微晃动", "dialogue": "", "duration": 2, "characters": ["林冲"], "location": "山神庙内", "emotion": "紧张", "cameraMovement": "track_right + tilt_up"},
  {"order": 5, "shotType": "中景", "description": "林冲握枪站起，双脚分开站稳，花枪斜指地面，身体微前倾做戒备姿态，篝火在身后持续燃烧（持续），将他的影子投射在残破墙面上", "hasAction": true, "startFrame": "林冲坐在稻草堆上，右手握枪，篝火微光", "endFrame": "林冲站立，双脚分开，花枪斜指地面，戒备姿态，身后篝火映出长影", "endState": "【位置】庙内中央偏南（距庙门约三步）【朝向】面朝庙门方向（正南），身体微前倾【姿势】站立，双脚与肩同宽，右手握花枪斜指地面，左手微抬护身【表情】目光锐利，注视庙门方向【时空】深夜，身后篝火持续燃烧，将长影投射在北墙上", "dialogue": "", "duration": 2, "characters": ["林冲"], "location": "山神庙内", "emotion": "肃杀", "cameraMovement": "crane_up + pull_out"}
]`;

  const result = await handleBaseTextModelCall({
    prompt: fullPrompt,
    textModel: modelName,
    maxTokens: 8192,
    temperature: 0.3,
    think
  }, onProgress);

  if (onProgress) onProgress(80);

  // 解析 AI 返回的 JSON
  let scenes = [];
  try {
    console.log('[StoryboardGen] 响应总长度:', result.content.length, '字符');

    // 1. 统一清洗：去 think 标签 + 提取代码块 + 去不可见字符
    let jsonStr = stripThinkTags(result.content);
    jsonStr = extractCodeBlock(jsonStr);
    jsonStr = stripInvisible(jsonStr).trim();

    // 2. 尝试直接解析
    try {
      scenes = JSON.parse(jsonStr);
      console.log('[StoryboardGen] ✅ 直接解析成功，共', scenes.length, '个分镜');
    } catch (directParseError) {
      // 2.5 尝试提取 JSON 片段
      const extracted = extractJSON(jsonStr);
      if (extracted) {
        try {
          scenes = JSON.parse(extracted);
          console.log('[StoryboardGen] ✅ 提取 JSON 片段解析成功，共', scenes.length, '个分镜');
        } catch (_) { /* 继续往下 fallback */ }
      }

      if (!Array.isArray(scenes) || scenes.length === 0) {
        // 3. jsonrepair 库修复
        console.log('[StoryboardGen] 直接解析失败，使用 jsonrepair 修复...');
        try {
          const { jsonrepair } = await import('jsonrepair');
          const repaired = jsonrepair(jsonStr);
          scenes = JSON.parse(repaired);
          console.log('[StoryboardGen] ✅ jsonrepair 修复成功，共', scenes.length, '个分镜');
        } catch (repairLibError) {
          console.error('[StoryboardGen] ❌ jsonrepair 修复失败:', repairLibError.message);

          // 4. 最后手段：调用 AI 修复（60秒超时）
          console.log('[StoryboardGen] 🔧 调用 AI 修复任务...');
          try {
            const repairResult = await withTimeout(
              handleRepairJsonResponse({
                incompleteJson: jsonStr,
                originalPrompt: fullPrompt,
                textModel: modelName
              }, (progress) => {
                if (onProgress) onProgress(80 + progress * 0.15);
              }),
              60000,
              'AI 修复超时（60秒）'
            );

            if (repairResult.success && repairResult.repairedJson) {
              scenes = repairResult.repairedJson;
              console.log('[StoryboardGen] ✅ AI 修复成功，共', scenes.length, '个分镜');
            } else {
              throw new Error('AI 修复也失败: ' + (repairResult.error || directParseError.message));
            }
          } catch (aiRepairError) {
            console.error('[StoryboardGen] ❌ AI 修复失败:', aiRepairError.message);
            // 超时或修复失败，返回原始错误
            throw new Error('分镜 JSON 解析失败: ' + (aiRepairError.message.includes('超时') ? aiRepairError.message : directParseError.message));
          }
        }
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
