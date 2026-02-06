import { useEffect, Dispatch, SetStateAction } from 'react';
import { getAuthToken } from '../../services/auth';
import { useTaskRunner, TaskState } from '../../hooks/useTaskRunner';
import { StoryboardScene } from './useSceneManager';

interface UseSceneGenerationOptions {
  projectId: number | null;
  scriptId: number | null;
  scenes: StoryboardScene[];
  setScenes: Dispatch<SetStateAction<StoryboardScene[]>>;
}

export function useSceneGeneration({ projectId, scriptId, scenes, setScenes }: UseSceneGenerationOptions) {
  const { tasks, runTask, clearTask, isRunning } = useTaskRunner({ projectId: projectId || 0 });

  // 监听任务完成 → 更新 scene 状态 + 保存数据库
  useEffect(() => {
    for (const [key, task] of Object.entries(tasks) as [string, TaskState][]) {
      if (!key.startsWith('img_') && !key.startsWith('vid_')) continue;
      if (task.status !== 'completed' || !task.result) continue;

      const sceneId = Number(key.split('_')[1]);
      const token = getAuthToken();

      if (key.startsWith('img_')) {
        const { startFrame, endFrame } = task.result;
        if (startFrame) {
          setScenes(prev => prev.map(s =>
            s.id === sceneId
              ? { ...s, startFrame, endFrame, imageUrl: startFrame }
              : s
          ));
          fetch(`/api/storyboards/${sceneId}/media`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ imageUrl: startFrame, startFrame, endFrame })
          }).catch(err => console.error('保存图片失败:', err));
        }
      } else if (key.startsWith('vid_')) {
        const videoUrl = task.result.video_url || task.result.videoUrl;
        if (videoUrl) {
          setScenes(prev => prev.map(s =>
            s.id === sceneId ? { ...s, videoUrl } : s
          ));
          fetch(`/api/storyboards/${sceneId}/media`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ videoUrl })
          }).catch(err => console.error('保存视频失败:', err));
        }
      }

      clearTask(key);
    }
  }, [tasks, clearTask, setScenes]);

  // 启动首尾帧生成 workflow
  const generateImage = async (id: number, prompt: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await runTask(`img_${id}`, 'frame_generation', {
        prompt,
        width: 640,
        height: 360
      });
      return { success: true };
    } catch (error: any) {
      console.error('图片生成失败:', error);
      return { success: false, error: error.message || '图片生成失败' };
    }
  };

  // 启动视频生成 workflow
  const generateVideo = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const scene = scenes.find(s => s.id === id);
    if (!scene || !scene.imageUrl) {
      return { success: false, error: '请先生成图片' };
    }
    try {
      const params = scene.hasAction && scene.startFrame && scene.endFrame
        ? { prompt: scene.description, startFrame: scene.startFrame, endFrame: scene.endFrame, imageUrl: scene.imageUrl, duration: scene.duration || 3 }
        : { prompt: scene.description, imageUrl: scene.imageUrl, duration: scene.duration || 2 };
      await runTask(`vid_${id}`, 'scene_video', params);
      return { success: true };
    } catch (error: any) {
      console.error('视频生成失败:', error);
      return { success: false, error: error.message || '视频生成失败' };
    }
  };

  return {
    tasks,
    isRunning,
    generateImage,
    generateVideo
  };
}
