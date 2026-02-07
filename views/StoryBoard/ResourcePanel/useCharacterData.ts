import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { Character } from './types';

export const useCharacterData = (projectId?: number | null, scriptId?: number | null) => {
  const [dbCharacters, setDbCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadCharacters();
    } else {
      setDbCharacters([]);
    }
  }, [projectId]);

  const loadCharacters = async () => {
    if (!projectId) {
      console.log('[ResourcePanel] 缺少 projectId，跳过加载角色');
      return;
    }
    
    setIsLoadingCharacters(true);
    try {
      const token = getAuthToken();
      // 获取项目所有角色（不按集数过滤，因为同一角色可能出现在多集）
      const res = await fetch(`/api/characters/project/${projectId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDbCharacters(data.characters || []);
        console.log('[ResourcePanel] 加载了', data.characters?.length || 0, '个角色');
      }
    } catch (error) {
      console.error('[ResourcePanel] 加载角色失败:', error);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  return { dbCharacters, isLoadingCharacters, loadCharacters };
};
