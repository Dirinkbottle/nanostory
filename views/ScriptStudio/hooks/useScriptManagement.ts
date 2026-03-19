/**
 * 剧本管理 Hook
 * 负责加载、保存、删除剧本
 */

import { useState } from 'react';
import { getAuthToken } from '../../../services/auth';

export interface Script {
  id: number;
  episode_number: number;
  title: string;
  content: string;
  draft_description?: string;
  draft_length?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  created_at: string;
}

interface UseScriptManagementOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useScriptManagement(options: UseScriptManagementOptions = {}) {
  const { onSuccess, onError } = options;
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [nextEpisode, setNextEpisode] = useState(1);
  const [scriptId, setScriptId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载项目的所有剧本
  const loadProjectScript = async (projectId: number, episode?: number) => {
    try {
      setLoadingScript(true);
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/project/${projectId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts || []);
        setNextEpisode(data.nextEpisode || 1);
        
        // 选择指定集或默认第一集
        const targetEpisode = episode || (data.scripts.length > 0 ? data.scripts[0].episode_number : 1);
        setCurrentEpisode(targetEpisode);
        
        const currentScript = data.scripts.find((s: any) => s.episode_number === targetEpisode);
        if (currentScript) {
          setScriptId(currentScript.id);
          setTitle(currentScript.title || '');
          setContent(currentScript.content);
        } else {
          setScriptId(null);
          setTitle('');
          setContent('');
        }
      }
    } catch (error) {
      console.error('加载剧本失败:', error);
    } finally {
      setLoadingScript(false);
    }
  };

  // 切换集数
  const handleEpisodeChange = (episode: number) => {
    const script = scripts.find(s => s.episode_number === episode);
    setCurrentEpisode(episode);
    if (script) {
      setScriptId(script.id);
      setTitle(script.title || '');
      setContent(script.content);
    } else {
      setScriptId(null);
      setTitle('');
      setContent('');
    }
  };

  // 保存剧本
  const handleSaveScript = async () => {
    if (!scriptId || !content) {
      onError?.('没有可保存的内容');
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title, content })
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess?.('剧本保存成功！');
        return true;
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error: any) {
      onError?.(error.message || '保存失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 删除某集（分镜+剧本+返回孤立资源）
  interface OrphanResource { id: number; name: string; image_url?: string; }
  interface DeleteEpisodeResult {
    success: boolean;
    message: string;
    orphanCharacters?: OrphanResource[];
    orphanScenes?: OrphanResource[];
  }

  const handleDeleteScript = async (): Promise<DeleteEpisodeResult> => {
    if (!scriptId) return { success: false, message: '没有可删除的剧本' };

    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/${scriptId}/episode`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (res.ok) {
        setScriptId(null);
        setTitle('');
        setContent('');
        return {
          success: true,
          message: data.message || '剧本删除成功！',
          orphanCharacters: data.orphanCharacters || [],
          orphanScenes: data.orphanScenes || []
        };
      } else {
        return { success: false, message: data.message || '删除失败' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' };
    } finally {
      setLoading(false);
    }
  };

  // 清理孤立角色/场景
  const handleCleanOrphans = async (characterIds: number[], sceneIds: number[]): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/scripts/clean-orphans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ characterIds, sceneIds })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // 手动创建剧本
  const handleCreateScript = async (projectId: number, scriptTitle: string, scriptContent: string, episodeNumber: number) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/scripts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectId,
          title: scriptTitle || `第${episodeNumber}集`,
          content: scriptContent,
          episodeNumber
        })
      });
      const data = await res.json();
      if (res.ok) {
        await loadProjectScript(projectId, data.episodeNumber);
        return { success: true, message: data.message || '剧本保存成功' };
      } else {
        return { success: false, message: data.message || '保存失败' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || '保存失败' };
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新草稿
  const handleCreateDraft = async (projectId: number, episodeNumber: number, draftTitle?: string, description?: string, length?: string, content?: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/scripts/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectId,
          episodeNumber,
          title: draftTitle || `第${episodeNumber}集`,
          description: description || '',
          length: length || '短篇',
          content: content || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        // 重新加载剧本列表以显示草稿
        await loadProjectScript(projectId);
        return { success: true, scriptId: data.scriptId, message: data.message };
      } else {
        return { success: false, message: data.message || '创建草稿失败' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || '创建草稿失败' };
    }
  };

  // 保存草稿内容
  const handleSaveDraft = async (draftScriptId: number, draftTitle?: string, draftContent?: string, description?: string, length?: string) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/draft/${draftScriptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: draftTitle,
          content: draftContent,
          description,
          length
        })
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message, savedAt: data.savedAt };
      } else {
        return { success: false, message: data.message || '保存草稿失败' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || '保存草稿失败' };
    } finally {
      setLoading(false);
    }
  };

  // 删除草稿
  const handleDeleteDraft = async (draftScriptId: number) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/draft/${draftScriptId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      return res.ok ? { success: true, message: data.message } : { success: false, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message || '删除草稿失败' };
    }
  };

  return {
    // 状态
    scripts,
    currentEpisode,
    nextEpisode,
    scriptId,
    title,
    content,
    loadingScript,
    loading,
    // Setters
    setTitle,
    setContent,
    setCurrentEpisode,
    setScriptId,
    // 方法
    loadProjectScript,
    handleEpisodeChange,
    handleSaveScript,
    handleCreateScript,
    handleCreateDraft,
    handleSaveDraft,
    handleDeleteDraft,
    handleDeleteScript,
    handleCleanOrphans
  };
}
