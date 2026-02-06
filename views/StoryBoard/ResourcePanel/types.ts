export interface Character {
  id: number;
  name: string;
  appearance?: string;
  personality?: string;
  description?: string;
  imageUrl?: string;
  source?: string;  // 'ai_extracted' | 'storyboard'
  frontViewUrl?: string;  // 正面视图
  sideViewUrl?: string;   // 侧面视图
  backViewUrl?: string;   // 背面视图
  characterSheetUrl?: string;  // 角色设计稿
  generationPrompt?: string;  // 三视图生成提示词（JSON字符串）
  generationStatus?: string;  // 生成状态
}

export interface ResourceItem {
  name: string;
  count?: number;
  imageUrl?: string;
  frontViewUrl?: string;
  sideViewUrl?: string;
  backViewUrl?: string;
  characterSheetUrl?: string;
  generationStatus?: string;
}

export interface ResourcePanelProps {
  characters: string[];
  locations: string[];
  props: string[];
  projectId?: number | null;
  scriptId?: number | null;
  scenes?: any[];
  onExtractResources?: () => void;
}

export type TabType = 'characters' | 'locations' | 'props';
