import { useEffect, Dispatch, SetStateAction } from 'react';
import { getAuthToken } from '../../services/auth';
import { useTaskRunner, TaskState } from '../../hooks/useTaskRunner';
import { WorkflowJob } from '../../hooks/useWorkflow';
import { StoryboardScene } from './useSceneManager';

interface UseSceneGenerationOptions {
  projectId: number | null;
  scriptId: number | null;
  episodeNumber: number;
  scenes: StoryboardScene[];
  setScenes: Dispatch<SetStateAction<StoryboardScene[]>>;
  imageModel: string;
  textModel: string;
  videoModel: string;
}

// 从工作流 job 中提取 storyboardId，映射到 task key
function jobToTaskKey(job: WorkflowJob): string | null {
  const params = typeof job.input_params === 'string'
    ? JSON.parse(job.input_params)
    : job.input_params;
  const storyboardId = params?.storyboardId;
  if (!storyboardId) return null;

  if (job.workflow_type === 'scene_video') {
    return `vid_${storyboardId}`;
  }
  return `img_${storyboardId}`;
}

export function useSceneGeneration({ projectId, scriptId, episodeNumber, scenes, setScenes, imageModel, textModel, videoModel }: UseSceneGenerationOptions) {
  const { tasks, runTask, recoverTasks, clearTask, isRunning } = useTaskRunner({ projectId: projectId || 0 });

  // 页面加载时恢复未完成的单帧/视频任务
  useEffect(() => {
    if (!projectId) return;
    recoverTasks(
      ['frame_generation', 'single_frame_generation', 'scene_video'],
      jobToTaskKey
    );
  }, [projectId]);

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
      const sceneIdx = scenes.findIndex(s => s.id === id);
      const scene = sceneIdx >= 0 ? scenes[sceneIdx] : null;
      if (!scene) {
        return { success: false, error: '找不到分镜' };
      }

      const extraParams = {
        episodeNumber,
        storyboardIndex: sceneIdx + 1,
        isRegenerate: !!(scene.startFrame || scene.imageUrl)
      };

      // 根据是否有动作选择不同的工作流
      if (scene.hasAction) {
        // 有动作：生成首尾帧
        console.log('[useSceneGeneration] 生成首尾帧（有动作）');
        await runTask(`img_${id}`, 'frame_generation', {
          storyboardId: id,
          prompt,
          imageModel,
          textModel,
          width: 640,
          height: 360,
          ...extraParams
        });
      } else {
        // 无动作：只生成单帧
        console.log('[useSceneGeneration] 生成单帧（无动作）');
        await runTask(`img_${id}`, 'single_frame_generation', {
          storyboardId: id,
          description: prompt,
          imageModel,
          textModel,
          width: 640,
          height: 360,
          ...extraParams
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('图片生成失败:', error);
      return { success: false, error: error.message || '图片生成失败' };
    }
  };

  // 启动视频生成 workflow
  const generateVideo = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const sceneIdx = scenes.findIndex(s => s.id === id);
    const scene = sceneIdx >= 0 ? scenes[sceneIdx] : null;
    if (!scene) {
      return { success: false, error: '找不到分镜' };
    }
    if (!videoModel) {
      return { success: false, error: '请先选择视频生成模型' };
    }
    try {
      await runTask(`vid_${id}`, 'scene_video', {
        storyboardId: id,
        videoModel,
        textModel,
        duration: scene.duration || (scene.hasAction ? 3 : 2),
        episodeNumber,
        storyboardIndex: sceneIdx + 1,
        isRegenerate: !!scene.videoUrl
      });
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
