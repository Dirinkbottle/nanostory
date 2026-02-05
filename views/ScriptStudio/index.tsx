import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Progress } from '@heroui/react';
import { getAuthToken } from '../../services/auth';
import { Project } from '../../services/projects';
import ProjectSelector from '../../components/ProjectSelector';
import ProjectInfo from './ProjectInfo';
import ScriptActions from './ScriptActions';
import ScriptGeneratorForm from './ScriptGeneratorForm';
import ScriptPreview from './ScriptPreview';
import StoryBoard from '../StoryBoard';
import { FileText, Film } from 'lucide-react';
import { useWorkflow, startWorkflow, getActiveWorkflows, consumeWorkflow } from '../../hooks/useWorkflow';

interface VideoModel {
  id: string;
  displayName: string;
  tier: string;
  description: string;
  pricing: {
    perSecond: number;
  };
  features: string[];
}

const ScriptStudio: React.FC = () => {
  // 流程控制
  const [showProjectSelector, setShowProjectSelector] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // 剧本相关状态
  const [scriptId, setScriptId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [creationType, setCreationType] = useState<'script' | 'comic'>('script');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('电影感');
  const [length, setLength] = useState('短篇');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  
  // 模型相关状态
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [textModels, setTextModels] = useState<any[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState('');
  
  // 子标签页状态
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard'>('script');

  // 工作流轮询
  const { job: workflowJob, isRunning: isWorkflowRunning, overallProgress } = useWorkflow(currentJobId, {
    onCompleted: async (completedJob) => {
      // 标记已消费
      try { await consumeWorkflow(completedJob.id); } catch(e) {}
      setCurrentJobId(null);
      // 从工作流的 script 步骤中获取结果
      const scriptTask = completedJob.tasks?.find(t => t.task_type === 'script');
      if (scriptTask?.result_data?.content && selectedProject) {
        try {
          // 调用保存接口，处理副作用（存库 + 扣费）
          const token = getAuthToken();
          const saveRes = await fetch('/api/scripts/save-from-workflow', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              projectId: selectedProject.id,
              title,
              content: scriptTask.result_data.content,
              tokens: scriptTask.result_data.tokens,
              provider: scriptTask.result_data.provider
            })
          });
          const saveData = await saveRes.json();
          if (saveRes.ok) {
            setScriptId(saveData.id);
            setContent(scriptTask.result_data.content);
            setIsEditing(false);
            alert('剧本生成并保存成功！');
          } else {
            setContent(scriptTask.result_data.content);
            alert('剧本已生成但保存失败：' + (saveData.message || '未知错误') + '\n内容已显示在预览区，请手动保存。');
          }
        } catch (err: any) {
          setContent(scriptTask.result_data.content);
          alert('剧本已生成但保存出错：' + err.message + '\n内容已显示在预览区。');
        }
      }
      setLoading(false);
    },
    onFailed: async (failedJob) => {
      // 标记已消费
      try { await consumeWorkflow(failedJob.id); } catch(e) {}
      setLoading(false);
      setCurrentJobId(null);
      alert('生成失败：' + (failedJob.error_message || '未知错误'));
    }
  });

  // 进入项目时检查是否有未消费的活跃工作流
  const checkActiveWorkflows = async (projectId: number) => {
    try {
      const { jobs } = await getActiveWorkflows(projectId);
      if (jobs && jobs.length > 0) {
        // 取最新的一个活跃工作流
        const activeJob = jobs[0];
        if (activeJob.status === 'running' || activeJob.status === 'pending') {
          // 正在运行，恢复轮询
          setCurrentJobId(activeJob.id);
          setLoading(true);
        } else if (activeJob.status === 'completed') {
          // 已完成但未消费，触发轮询让 onCompleted 处理
          setCurrentJobId(activeJob.id);
          setLoading(true);
        }
        // failed 且未消费的也触发，让 onFailed 处理
        else if (activeJob.status === 'failed') {
          setCurrentJobId(activeJob.id);
        }
      }
    } catch (err) {
      console.error('检查活跃工作流失败:', err);
    }
  };

  useEffect(() => {
    fetchTextModels();
  }, []);

  const fetchTextModels = async () => {
    try {
      const res = await fetch('/api/scripts/models');
      if (res.ok) {
        const data = await res.json();
        setTextModels(data.models || []);
        if (data.models.length > 0) {
          setSelectedTextModel(data.models[0]?.name || '');
        }
      }
    } catch (error) {
      console.error('获取文本模型列表失败:', error);
    }
  };

  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setShowProjectSelector(false);
    await loadProjectScript(project.id);
    // 检查是否有未消费的活跃工作流（中途退出后恢复）
    await checkActiveWorkflows(project.id);
  };

  const loadProjectScript = async (projectId: number) => {
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
        if (data.script) {
          setScriptId(data.script.id);
          setTitle(data.script.title || '');
          setContent(data.script.content);
          setIsEditing(false);
        } else {
          setScriptId(null);
          setTitle('');
          setContent('');
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('加载剧本失败:', error);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleBackToProjects = () => {
    setShowProjectSelector(true);
    setScriptId(null);
    setTitle('');
    setDescription('');
    setContent('');
    setIsEditing(false);
  };

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
        setIsEditing(false);
      } else {
        throw new Error(data.message || '保存失败');
      }
    } catch (error: any) {
      alert(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

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
        setIsEditing(false);
      } else {
        throw new Error(data.message || '删除失败');
      }
    } catch (error: any) {
      alert(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedProject) {
      alert('请先选择项目');
      return;
    }

    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }

    setLoading(true);
    try {
      // 使用工作流系统启动异步任务
      const result = await startWorkflow('script_only', selectedProject.id, {
        title,
        description,
        style,
        length,
        modelName: selectedTextModel
      });

      // 设置 jobId，开始轮询
      setCurrentJobId(result.jobId);
    } catch (error: any) {
      setLoading(false);
      alert(error.message || '创建生成任务失败');
    }
  };

  if (showProjectSelector) {
    return <ProjectSelector onSelectProject={handleSelectProject} />;
  }

  return (
    <div className="h-full bg-slate-50 overflow-hidden flex flex-col">
      {/* 项目信息和子标签页 */}
      <div className="bg-white">
        <div className="px-8 pt-4">
          {selectedProject && (
            <ProjectInfo 
              project={selectedProject} 
              onBackToProjects={handleBackToProjects} 
            />
          )}
        </div>
        
        {/* 子标签页 */}
        <div className="px-8 border-b border-slate-200">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as 'script' | 'storyboard')}
            variant="underlined"
            classNames={{
              tabList: "gap-8 w-full relative p-0",
              cursor: "w-full bg-blue-600 h-0.5",
              tab: "max-w-fit px-0 h-12 data-[hover-unselected=true]:opacity-80",
              tabContent: "group-data-[selected=true]:text-blue-600 group-data-[selected=false]:text-slate-600 font-medium"
            }}
          >
            <Tab
              key="script"
              title={
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>剧本生成</span>
                </div>
              }
            />
            <Tab
              key="storyboard"
              title={
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  <span>分镜</span>
                </div>
              }
            />
          </Tabs>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'script' ? (
          <div className="h-full flex">
            {/* 左侧：创作区 */}
            <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
              <div className="p-8 space-y-6 overflow-auto">
                <ScriptActions
                  scriptId={scriptId}
                  isEditing={isEditing}
                  loading={loading}
                  loadingScript={loadingScript}
                  onEdit={() => setIsEditing(true)}
                  onSave={handleSaveScript}
                  onDelete={handleDeleteScript}
                  onGenerateVideo={() => {}}
                />

                {/* 工作流进度指示器 */}
                {isWorkflowRunning && workflowJob && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">
                        {workflowJob.workflowName || '任务'} 执行中...
                      </span>
                      <span className="text-xs text-blue-500">
                        步骤 {workflowJob.current_step_index + 1}/{workflowJob.total_steps}
                      </span>
                    </div>
                    <Progress
                      size="sm"
                      value={overallProgress}
                      color="primary"
                      className="w-full"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {workflowJob.tasks?.map((t, i) => (
                        <span
                          key={t.id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            t.status === 'completed' ? 'bg-green-100 text-green-700' :
                            t.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                            t.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.task_type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!scriptId && !loadingScript && !isWorkflowRunning && (
                  <ScriptGeneratorForm
                    creationType={creationType}
                    title={title}
                    description={description}
                    style={style}
                    length={length}
                    selectedTextModel={selectedTextModel}
                    textModels={textModels}
                    loading={loading}
                    onCreationTypeChange={setCreationType}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onStyleChange={setStyle}
                    onLengthChange={setLength}
                    onModelChange={setSelectedTextModel}
                    onGenerate={handleGenerate}
                  />
                )}
              </div>
            </div>

            {/* 右侧：预览区 */}
            <div className="flex-1 flex flex-col bg-slate-50">
              <ScriptPreview
                content={content}
                isEditing={isEditing}
                loadingScript={loadingScript}
                onContentChange={setContent}
              />
            </div>
          </div>
        ) : (
          <StoryBoard />
        )}
      </div>
    </div>
  );
};

export default ScriptStudio;
