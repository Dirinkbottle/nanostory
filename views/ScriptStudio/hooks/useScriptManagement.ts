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
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
}

export function useScriptManagement() {
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
      alert('没有可保存的内容');
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
        alert('剧本保存成功！');
        return true;
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error: any) {
      alert(error.message || '保存失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 删除剧本
  const handleDeleteScript = async () => {
    if (!scriptId) return;

    if (!confirm('确定要删除这个剧本吗？删除后无法恢复。')) {
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (res.ok) {
        alert('剧本删除成功！');
        setScriptId(null);
        setTitle('');
        setContent('');
        return true;
      } else {
        throw new Error(data.message || '删除失败');
      }
    } catch (error: any) {
      alert(error.message || '删除失败');
      return false;
    } finally {
      setLoading(false);
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
    handleDeleteScript
  };
}
