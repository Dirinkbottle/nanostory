import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';

export interface Scene {
  id: number;
  name: string;
  description?: string;
  environment?: string;
  lighting?: string;
  mood?: string;
  image_url?: string;
  generation_status?: string;
  tags?: string;
}

export const useSceneData = (projectId?: number | null) => {
  const [dbScenes, setDbScenes] = useState<Scene[]>([]);
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadScenes();
    }
  }, [projectId]);

  const loadScenes = async () => {
    if (!projectId) return;
    
    setIsLoadingScenes(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/scenes/project/${projectId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDbScenes(data.scenes || []);
        console.log('[ResourcePanel] 加载了', data.scenes?.length || 0, '个场景');
      }
    } catch (error) {
      console.error('[ResourcePanel] 加载场景失败:', error);
    } finally {
      setIsLoadingScenes(false);
    }
  };

  return { dbScenes, isLoadingScenes, loadScenes };
};
