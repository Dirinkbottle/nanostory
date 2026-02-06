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
              videoUrl: vars.videoUrl || undefined,
              characters: vars.characters || [],
              props: vars.props || [],
              location: vars.location || '',
              shotType: vars.shotType || '',
              emotion: vars.emotion || '',
              hasAction: vars.hasAction || false,
              startFrame: vars.startFrame || '',
              endFrame: vars.endFrame || ''
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

  const addScene = () => {
    const newScene: StoryboardScene = {
      id: Date.now(),
      order: scenes.length + 1,
      description: '',
      dialogue: '',
      duration: 5,
      characters: [],
      props: [],
      location: ''
    };
    setScenes([...scenes, newScene]);
  };

  const deleteScene = (id: number) => {
    setScenes(scenes.filter(s => s.id !== id));
  };

  const moveScene = (id: number, direction: 'up' | 'down') => {
    const index = scenes.findIndex(s => s.id === id);
    if (direction === 'up' && index > 0) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index - 1]] = [newScenes[index - 1], newScenes[index]];
      setScenes(newScenes);
    } else if (direction === 'down' && index < scenes.length - 1) {
      const newScenes = [...scenes];
      [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
      setScenes(newScenes);
    }
  };

  const updateDescription = (id: number, description: string) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, description } : s));
  };

  const reorderScenes = (newScenes: StoryboardScene[]) => {
    setScenes(newScenes);
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
