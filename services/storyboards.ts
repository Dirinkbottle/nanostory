import { getAuthToken } from './auth';

// 分镜空间描述接口
export interface CharacterPosition {
  name: string;
  position: string;      // 如"前景左侧"
  depth?: string;        // foreground/midground/background
  facing?: string;       // 如"面向右方"
}

export interface SpatialDescription {
  characterPositions?: CharacterPosition[];
  cameraAngle?: string;          // 如"中景平拍"
  spatialRelationship?: string;  // 如"角色A在角色B的左后方"
  environmentDepth?: string;     // 如"三层纵深：前景桌椅-中景过道-远景窗户"
}

export interface StoryboardItem {
  id?: number;
  index: number;
  prompt_template: string;
  variables: Record<string, unknown>;
  image_ref?: string | null;
  spatial_description?: SpatialDescription | null;
  created_at?: string;
}

export interface StoryboardTemplate {
  id: string;
  name: string;
  prompt_template: string;
  category: string;
}

function authHeaders() {
  const token = getAuthToken();
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function fetchStoryboardTemplates(): Promise<StoryboardTemplate[]> {
  const res = await fetch('/api/storyboards/templates', {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Failed to load storyboard templates');
  }

  return (await res.json()) as StoryboardTemplate[];
}

export async function fetchStoryboards(scriptId: number): Promise<StoryboardItem[]> {
  const res = await fetch(`/api/storyboards/${scriptId}`, {
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Failed to load storyboards');
  }

  return (await res.json()) as StoryboardItem[];
}

export async function saveStoryboards(scriptId: number, items: StoryboardItem[]): Promise<void> {
  const res = await fetch(`/api/storyboards/${scriptId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ items }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to save storyboards');
  }
}

export interface BatchValidationResult {
  sceneId: number;
  ready: boolean;
  blockingIssues: string[];
  warningIssues: string[];
}

export async function batchValidateScenes(
  sceneIds: number[],
  scriptId: number,
  type: 'frame' | 'video'
): Promise<{ results: BatchValidationResult[] }> {
  const res = await fetch('/api/storyboards/batch-validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ sceneIds, scriptId, type }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Failed to batch validate scenes');
  }

  return data as { results: BatchValidationResult[] };
}

/**
 * 更新分镜的空间描述
 */
export async function updateSpatialDescription(
  storyboardId: number,
  spatialDescription: SpatialDescription | null
): Promise<void> {
  const res = await fetch(`/api/storyboards/${storyboardId}/content`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ spatial_description: spatialDescription }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to update spatial description');
  }
}
