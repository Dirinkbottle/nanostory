import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/auth';
import { Character } from './types';

export const useCharacterData = (projectId?: number | null) => {
  const [dbCharacters, setDbCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadCharacters();
    }
  }, [projectId]);

  const loadCharacters = async () => {
    if (!projectId) return;
    
    setIsLoadingCharacters(true);
    try {
      const token = getAuthToken();
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
