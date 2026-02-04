import { getAuthToken } from './auth';

export interface StoryboardItem {
  id?: number;
  index: number;
  prompt_template: string;
  variables: Record<string, unknown>;
  image_ref?: string | null;
  created_at?: string;
}

export interface StoryboardTemplate {
  id: string;
  name: string;
  prompt_template: string;
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
