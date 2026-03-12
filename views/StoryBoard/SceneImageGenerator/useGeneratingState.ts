import { useState, useEffect, useCallback } from 'react';

const GENERATING_KEY = 'nanostory_generating_images';
const GENERATING_TIMEOUT = 120000; // 2分钟自动过期

interface GeneratingItem {
  id: number;
  startTime: number;
}

export const useGeneratingState = (sceneId: number, hasImages: boolean) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Check localStorage on mount and periodically
  useEffect(() => {
    const checkState = () => {
      const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
      const now = Date.now();
      const validItems = items.filter(item => now - item.startTime < GENERATING_TIMEOUT);

      if (validItems.length !== items.length) {
        localStorage.setItem(GENERATING_KEY, JSON.stringify(validItems));
      }

      const isActive = validItems.some(item => item.id === sceneId) && !hasImages;
      setIsGenerating(isActive);
    };

    checkState();
    // Periodically re-check to catch external state changes (e.g. completion from useSceneGeneration)
    const interval = setInterval(checkState, 2000);
    return () => clearInterval(interval);
  }, [sceneId, hasImages]);

  // Clear generating state when images arrive
  useEffect(() => {
    if (hasImages && isGenerating) {
      setIsGenerating(false);
      removeGeneratingId(sceneId);
    }
  }, [hasImages, isGenerating, sceneId]);

  const addGeneratingId = (id: number) => {
    const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
    if (!items.some(item => item.id === id)) {
      items.push({ id, startTime: Date.now() });
      localStorage.setItem(GENERATING_KEY, JSON.stringify(items));
    }
  };

  const removeGeneratingId = (id: number) => {
    const items: GeneratingItem[] = JSON.parse(localStorage.getItem(GENERATING_KEY) || '[]');
    const newItems = items.filter(item => item.id !== id);
    localStorage.setItem(GENERATING_KEY, JSON.stringify(newItems));
  };

  return { isGenerating, setIsGenerating, addGeneratingId, removeGeneratingId };
};
