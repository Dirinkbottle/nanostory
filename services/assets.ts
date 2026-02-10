import { getAuthToken } from './auth';

export interface Character {
  id: number;
  user_id: number;
  name: string;
  description: string;
  appearance: string;
  personality: string;
  image_url: string;
  tags: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: number;
  user_id: number;
  name: string;
  description: string;
  environment: string;
  lighting: string;
  mood: string;
  image_url: string;
  reverse_image_url?: string;
  tags: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Prop {
  id: number;
  user_id: number;
  project_id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

// 角色API
export async function fetchCharacters(): Promise<Character[]> {
  const token = getAuthToken();
  const response = await fetch('/api/characters', {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('获取角色列表失败');
  }
  const data = await response.json();
  return data.characters || [];
}

export async function createCharacter(character: Partial<Character>): Promise<Character> {
  const token = getAuthToken();
  const response = await fetch('/api/characters', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(character)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '创建角色失败');
  }
  const data = await response.json();
  return data.character;
}

export async function updateCharacter(id: number, character: Partial<Character>): Promise<Character> {
  const token = getAuthToken();
  const response = await fetch(`/api/characters/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(character)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '更新角色失败');
  }
  const data = await response.json();
  return data.character;
}

export async function deleteCharacter(id: number): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`/api/characters/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '删除角色失败');
  }
}

// 场景API
export async function fetchScenes(): Promise<Scene[]> {
  const token = getAuthToken();
  const response = await fetch('/api/scenes', {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('获取场景列表失败');
  }
  const data = await response.json();
  return data.scenes || [];
}

export async function createScene(scene: Partial<Scene>): Promise<Scene> {
  const token = getAuthToken();
  const response = await fetch('/api/scenes', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(scene)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '创建场景失败');
  }
  const data = await response.json();
  return data.scene;
}

export async function updateScene(id: number, scene: Partial<Scene>): Promise<Scene> {
  const token = getAuthToken();
  const response = await fetch(`/api/scenes/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(scene)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '更新场景失败');
  }
  const data = await response.json();
  return data.scene;
}

export async function deleteScene(id: number): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`/api/scenes/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '删除场景失败');
  }
}

// 道具API
export async function fetchProps(): Promise<Prop[]> {
  const token = getAuthToken();
  const response = await fetch('/api/props', {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('获取道具列表失败');
  }
  const data = await response.json();
  return data.props || [];
}

export async function createProp(prop: Partial<Prop>): Promise<Prop> {
  const token = getAuthToken();
  const response = await fetch('/api/props', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(prop)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '创建道具失败');
  }
  const data = await response.json();
  return data.prop;
}

export async function updateProp(id: number, prop: Partial<Prop>): Promise<Prop> {
  const token = getAuthToken();
  const response = await fetch(`/api/props/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(prop)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '更新道具失败');
  }
  const data = await response.json();
  return data.prop;
}

export async function deleteProp(id: number): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`/api/props/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '删除道具失败');
  }
}
