import { useState, useEffect } from 'react';
import { getAuthToken } from '../../services/auth';

export interface StoryboardScene {
  id: number;
  order: number;
  description: string;
  dialogue: string;
  duration: number;
  imageUrl?: string;
  videoUrl?: string;
  characters: string[];
  props: string[];
  location: string;
  shotType?: string;
  emotion?: string;
  hasAction?: boolean;
  startFrame?: string;
  endFrame?: string;
  startFrameDesc?: string;
  endFrameDesc?: string;
}

export const useSceneManager = (scriptId: number | null, projectId?: number | null) => {
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // scriptId 变化时重新加载
  useEffect(() => {
    if (scriptId) {
      loadStoryboards(scriptId);
    } else {
      setScenes([]);
    }
  }, [scriptId]);

  const loadStoryboards = async (targetScriptId: number) => {
    if (!targetScriptId) return;

    setIsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${targetScriptId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[useSceneManager] 加载分镜数据，原始数据:', data.length, '条');
        console.log('[useSceneManager] 第一条原始数据:', data[0]);
        
        if (data && data.length > 0) {
          const loadedScenes: StoryboardScene[] = data.map((item: any, index: number) => {
            const vars = item.variables || {};
            
            // Debug: 检查 variables 字段
            if (index === 0) {
              console.log('[useSceneManager] 第一条 variables 字段:', vars);
              console.log('[useSceneManager] characters 字段类型:', typeof vars.characters, '值:', vars.characters);
            }
            
            return {
              id: item.id || Date.now() + index,
              order: item.index || index + 1,
              description: item.prompt_template || '',
              dialogue: vars.dialogue || '',
              duration: vars.duration || 3,
              imageUrl: item.image_ref || undefined,
              videoUrl: item.video_url || vars.videoUrl || undefined,
              characters: vars.characters || [],
              props: vars.props || [],
              location: vars.location || '',
              shotType: vars.shotType || '',
              emotion: vars.emotion || '',
              hasAction: vars.hasAction || false,
              startFrame: item.first_frame_url || undefined,
              endFrame: item.last_frame_url || undefined,
              startFrameDesc: vars.startFrame || undefined,
              endFrameDesc: vars.endFrame || undefined
            };
          });
          
          console.log('[useSceneManager] 解析后的分镜数据，前3条角色:', loadedScenes.slice(0, 3).map(s => s.characters));
          
          setScenes(loadedScenes);
          if (loadedScenes.length > 0) {
            setSelectedScene(loadedScenes[0].id);
          }

          // 自动保存分镜中的角色到数据库
          const allCharacters = [...new Set(loadedScenes.flatMap(s => s.characters || []))];
          if (allCharacters.length > 0 && projectId) {
            console.log('[useSceneManager] 自动保存角色到数据库:', allCharacters);
            
            fetch('/api/characters/batch-save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                projectId,
                scriptId: targetScriptId,
                characters: allCharacters
              })
            }).then(async (batchRes) => {
              if (batchRes.ok) {
                const batchData = await batchRes.json();
                console.log('[useSceneManager] 角色自动保存成功:', batchData);
              }
            }).catch(err => {
              console.error('[useSceneManager] 角色自动保存失败:', err);
            });
          }
        } else {
          setScenes([]);
        }
      }
    } catch (error) {
      console.error('加载分镜失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addScene = async () => {
    const idx = scenes.length;
    const variables_json = {
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: '',
      shotType: '中景',
      emotion: ''
    };

    // 先用临时 ID 立即显示，再替换为真实 ID
    const tempId = Date.now();
    const newScene: StoryboardScene = {
      id: tempId,
      order: idx + 1,
      description: '',
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: ''
    };
    setScenes(prev => [...prev, newScene]);

    if (scriptId) {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/storyboards/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ scriptId, idx, prompt_template: '', variables_json })
        });
        if (res.ok) {
          const data = await res.json();
          // 用真实 DB ID 替换临时 ID
          setScenes(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
          console.log('[useSceneManager] 分镜已保存到数据库, id:', data.id);
        } else {
          console.error('[useSceneManager] 保存分镜失败:', await res.text());
        }
      } catch (err) {
        console.error('[useSceneManager] 保存分镜网络错误:', err);
      }
    }
  };

  const deleteScene = async (id: number) => {
    console.log('[useSceneManager] deleteScene 调用, id:', id, 'type:', typeof id, 'scriptId:', scriptId);
    // 本地新增的分镜（Date.now() 生成的 ID 远大于数据库自增 ID）无需调用后端
    const isLocalOnly = id > 1_000_000_000;
    console.log('[useSceneManager] isLocalOnly:', isLocalOnly);
    if (!isLocalOnly) {
      try {
        const token = getAuthToken();
        const url = `/api/storyboards/scene/${id}`;
        console.log('[useSceneManager] DELETE 请求:', url, 'token:', token ? '有' : '无');
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        console.log('[useSceneManager] DELETE 响应: status=', res.status, 'statusText=', res.statusText);
        if (!res.ok && res.status !== 404) {
          const data = await res.json().catch(() => ({}));
          console.error('[useSceneManager] 删除分镜失败: status=', res.status, 'body=', JSON.stringify(data));
          return;
        }
        if (res.status === 404) {
          console.warn('[useSceneManager] 分镜在服务端已不存在, id:', id);
        } else {
          const resData = await res.json().catch(() => ({}));
          console.log('[useSceneManager] 删除成功, 响应:', JSON.stringify(resData));
        }
      } catch (err) {
        console.error('[useSceneManager] 删除分镜网络错误:', err);
        return;
      }
    } else {
      console.log('[useSceneManager] 删除本地分镜:', id);
    }
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const moveScene = (id: number, direction: 'up' | 'down') => {
    const index = scenes.findIndex(s => s.id === id);
    let newScenes: StoryboardScene[] | null = null;
    if (direction === 'up' && index > 0) {
      newScenes = [...scenes];
      [newScenes[index], newScenes[index - 1]] = [newScenes[index - 1], newScenes[index]];
    } else if (direction === 'down' && index < scenes.length - 1) {
      newScenes = [...scenes];
      [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
    }
    if (newScenes) {
      setScenes(newScenes);
      persistReorder(newScenes);
    }
  };

  const updateDescription = (id: number, description: string) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, description } : s));
  };

  const reorderScenes = (newScenes: StoryboardScene[]) => {
    setScenes(newScenes);
    persistReorder(newScenes);
  };

  // 将排序持久化到后端
  const persistReorder = async (orderedScenes: StoryboardScene[]) => {
    if (!scriptId) return;
    try {
      const token = getAuthToken();
      const order = orderedScenes.map((s, i) => ({ id: s.id, idx: i }));
      const res = await fetch('/api/storyboards/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ scriptId, order })
      });
      if (res.ok) {
        console.log('[useSceneManager] 排序已保存到数据库');
      } else {
        console.error('[useSceneManager] 保存排序失败:', res.statusText);
      }
    } catch (err) {
      console.error('[useSceneManager] 保存排序网络错误:', err);
    }
  };

  return {
    scenes,
    setScenes,
    selectedScene,
    setSelectedScene,
    isLoading,
    loadStoryboards,
    addScene,
    deleteScene,
    moveScene,
    updateDescription,
    reorderScenes
  };
}
