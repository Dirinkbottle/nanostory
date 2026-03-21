/**
 * 镜头语言类型定义
 * 专业影视镜头参数系统
 */

// ============ 基础枚举类型 ============

/** 景别 - Shot Size */
export type ShotSize = 
  | 'extreme_close_up'  // 大特写
  | 'close_up'          // 特写
  | 'medium_close_up'   // 中近景
  | 'medium_shot'       // 中景
  | 'medium_long_shot'  // 中全景
  | 'long_shot'         // 全景
  | 'extreme_long_shot'; // 大远景

/** 机位高度 - Camera Height */
export type CameraHeight = 
  | 'eye_level'   // 平视
  | 'low_angle'   // 仰拍
  | 'high_angle'  // 俯拍
  | 'bird_eye'    // 鸟瞰
  | 'worm_eye';   // 虫视

/** 镜头运动 - Camera Movement */
export type CameraMovement = 
  | 'static'  // 固定
  | 'push'    // 推
  | 'pull'    // 拉
  | 'pan'     // 摇
  | 'tilt'    // 升降
  | 'track'   // 移
  | 'dolly'   // 跟
  | 'zoom';   // 变焦

/** 镜头类型 - Lens Type */
export type LensType = 
  | 'wide'       // 广角
  | 'standard'   // 标准
  | 'telephoto'  // 长焦
  | 'macro'      // 微距
  | 'fisheye';   // 鱼眼

/** 景深 - Depth of Field */
export type DepthOfField = 
  | 'shallow'  // 浅景深
  | 'medium'   // 中等
  | 'deep';    // 深景深

/** 光影氛围 - Lighting Mood */
export type LightingMood = 
  | 'high_key'      // 高调
  | 'low_key'       // 低调
  | 'chiaroscuro'   // 明暗对比
  | 'silhouette'    // 剪影
  | 'backlit';      // 逆光

/** 构图法则 - Composition Rule */
export type CompositionRule = 
  | 'rule_of_thirds'   // 三分法
  | 'center'           // 中心构图
  | 'symmetry'         // 对称
  | 'leading_lines'    // 引导线
  | 'frame_in_frame';  // 框中框

/** 轴线位置 - Axis Position */
export type AxisPosition = 
  | 'left'     // 左侧
  | 'right'    // 右侧
  | 'on_axis'; // 轴线上

/** 屏幕方向 - Screen Direction */
export type ScreenDirection = 
  | 'left_to_right'       // 左→右
  | 'right_to_left'       // 右→左
  | 'towards_camera'      // 朝向镜头
  | 'away_from_camera';   // 远离镜头

/** 转场类型 - Transition Type */
export type TransitionType = 
  | 'cut'         // 硬切
  | 'fade'        // 淡入淡出
  | 'dissolve'    // 叠化
  | 'wipe'        // 划像
  | 'match_cut';  // 匹配剪辑

// ============ 镜头语言完整接口 ============

export interface ShotLanguage {
  /** 景别 */
  shotSize?: ShotSize;
  /** 机位高度 */
  cameraHeight?: CameraHeight;
  /** 镜头运动 */
  cameraMovement?: CameraMovement;
  /** 镜头类型 */
  lensType?: LensType;
  /** 焦点位置描述 */
  focusPoint?: string;
  /** 景深 */
  depthOfField?: DepthOfField;
  /** 光影氛围 */
  lightingMood?: LightingMood;
  /** 构图法则 */
  compositionRule?: CompositionRule;
  /** 轴线位置 */
  axisPosition?: AxisPosition;
  /** 屏幕方向 */
  screenDirection?: ScreenDirection;
  /** 镜头时长（秒） */
  shotDuration?: number;
  /** 转场类型 */
  transitionType?: TransitionType;
}

// ============ 选项配置类型 ============

export interface ShotLanguageOption {
  value: string;
  label: string;
  description: string;
  icon?: string;
}

export interface ShotLanguageOptions {
  shotSize: ShotLanguageOption[];
  cameraHeight: ShotLanguageOption[];
  cameraMovement: ShotLanguageOption[];
  lensType: ShotLanguageOption[];
  depthOfField: ShotLanguageOption[];
  lightingMood: ShotLanguageOption[];
  compositionRule: ShotLanguageOption[];
  axisPosition: ShotLanguageOption[];
  screenDirection: ShotLanguageOption[];
  transitionType: ShotLanguageOption[];
}

// ============ 轴线检查相关类型 ============

export interface AxisIssue {
  /** 问题类型 */
  type: 'axis_violation' | 'direction_mismatch' | 'continuity_error';
  /** 严重程度 */
  severity: 'error' | 'warning' | 'info';
  /** 起始分镜ID */
  fromStoryboardId: number;
  /** 目标分镜ID */
  toStoryboardId: number;
  /** 起始分镜序号 */
  fromIndex: number;
  /** 目标分镜序号 */
  toIndex: number;
  /** 问题描述 */
  message: string;
  /** 改进建议 */
  suggestion: string;
}

export interface AxisCheckResult {
  success: boolean;
  scriptId: number;
  totalScenes: number;
  issues: AxisIssue[];
  issueCount: number;
}

// ============ API 响应类型 ============

export interface ShotLanguageResponse {
  success: boolean;
  storyboardId: number;
  shotLanguage: ShotLanguage;
}

export interface ShotLanguageUpdateResponse {
  success: boolean;
  message: string;
  storyboardId: number;
  updates: Partial<ShotLanguage>;
}

export interface ShotLanguageOptionsResponse {
  success: boolean;
  options: ShotLanguageOptions;
}

// ============ 快捷预设 ============

export interface ShotPreset {
  id: string;
  name: string;
  description: string;
  shotLanguage: ShotLanguage;
  category: 'dialogue' | 'action' | 'emotion' | 'establishing' | 'custom';
}

/** 导演常用镜头预设 */
export const DEFAULT_SHOT_PRESETS: ShotPreset[] = [
  {
    id: 'dialogue_standard',
    name: '标准对话',
    description: '中景平视，适合一般对话场景',
    category: 'dialogue',
    shotLanguage: {
      shotSize: 'medium_shot',
      cameraHeight: 'eye_level',
      cameraMovement: 'static',
      lensType: 'standard',
      depthOfField: 'medium',
      compositionRule: 'rule_of_thirds',
    },
  },
  {
    id: 'dialogue_intimate',
    name: '亲密对话',
    description: '特写近景，强调情绪交流',
    category: 'dialogue',
    shotLanguage: {
      shotSize: 'close_up',
      cameraHeight: 'eye_level',
      cameraMovement: 'static',
      lensType: 'standard',
      depthOfField: 'shallow',
      compositionRule: 'center',
    },
  },
  {
    id: 'action_dynamic',
    name: '动感动作',
    description: '中全景跟拍，展现肢体动作',
    category: 'action',
    shotLanguage: {
      shotSize: 'medium_long_shot',
      cameraHeight: 'eye_level',
      cameraMovement: 'dolly',
      lensType: 'wide',
      depthOfField: 'deep',
      compositionRule: 'leading_lines',
    },
  },
  {
    id: 'emotion_intense',
    name: '强烈情绪',
    description: '特写仰拍，强化情绪冲击',
    category: 'emotion',
    shotLanguage: {
      shotSize: 'close_up',
      cameraHeight: 'low_angle',
      cameraMovement: 'push',
      lensType: 'standard',
      depthOfField: 'shallow',
      lightingMood: 'chiaroscuro',
      compositionRule: 'center',
    },
  },
  {
    id: 'establishing_wide',
    name: '环境 establishing',
    description: '大远景俯拍，展现场景全貌',
    category: 'establishing',
    shotLanguage: {
      shotSize: 'extreme_long_shot',
      cameraHeight: 'bird_eye',
      cameraMovement: 'static',
      lensType: 'wide',
      depthOfField: 'deep',
      compositionRule: 'symmetry',
    },
  },
  {
    id: 'suspense_mystery',
    name: '悬疑神秘',
    description: '低调光影剪影，营造神秘感',
    category: 'emotion',
    shotLanguage: {
      shotSize: 'medium_shot',
      cameraHeight: 'eye_level',
      cameraMovement: 'static',
      lensType: 'telephoto',
      depthOfField: 'shallow',
      lightingMood: 'silhouette',
      compositionRule: 'rule_of_thirds',
    },
  },
];

// ============ 辅助函数 ============

/** 获取景别的中文名称 */
export function getShotSizeLabel(size?: ShotSize): string {
  const labels: Record<ShotSize, string> = {
    extreme_close_up: '大特写',
    close_up: '特写',
    medium_close_up: '中近景',
    medium_shot: '中景',
    medium_long_shot: '中全景',
    long_shot: '全景',
    extreme_long_shot: '大远景',
  };
  return size ? labels[size] : '';
}

/** 获取景别的视觉表示（用于缩略图） */
export function getShotSizeVisual(size?: ShotSize): string {
  const visuals: Record<ShotSize, string> = {
    extreme_close_up: '👁️',
    close_up: '😊',
    medium_close_up: '👤',
    medium_shot: '🧍',
    medium_long_shot: '🚶',
    long_shot: '🏞️',
    extreme_long_shot: '🌄',
  };
  return size ? visuals[size] : '';
}

/** 检查两个分镜是否越轴 */
export function isAxisViolation(
  currentAxis?: AxisPosition,
  nextAxis?: AxisPosition
): boolean {
  if (!currentAxis || !nextAxis) return false;
  if (currentAxis === 'on_axis' || nextAxis === 'on_axis') return false;
  return currentAxis !== nextAxis;
}

/** 计算镜头时长建议（基于描述长度） */
export function suggestShotDuration(description: string): number {
  // 基础时长2秒
  let duration = 2;
  
  // 根据字数增加时长（每秒约3-4个字）
  const charCount = description.length;
  if (charCount > 0) {
    duration += Math.ceil(charCount / 3.5);
  }
  
  // 限制在2-10秒之间
  return Math.max(2, Math.min(10, duration));
}
