import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab } from '@heroui/react';
import { getAuthToken } from '../../services/auth';
import { Project, fetchProject, createProject } from '../../services/projects';
import ProjectInfo from './ProjectInfo';
import ScriptActions from './ScriptActions';
import ScriptGeneratorForm from './ScriptGeneratorForm';
import ScriptPreview from './ScriptPreview';
import StoryBoard from '../StoryBoard';
import { FileText, Film } from 'lucide-react';

const LAST_PROJECT_KEY = 'nanostory_last_project_id';
const LAST_TAB_KEY = 'nanostory_last_tab';

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
  const navigate = useNavigate();
  
  // 流程控制
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  
  // 多集剧本状态
  interface Script {
    id: number;
    episode_number: number;
    title: string;
    content: string;
    status: 'generating' | 'completed' | 'failed';
    created_at: string;
  }
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [nextEpisode, setNextEpisode] = useState(1);
  
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
  
  // 模型相关状态（保留但不使用）
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [textModels, setTextModels] = useState<any[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState('');
  
  // 子标签页状态 - 从 localStorage 恢复
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard'>(() => {
    const savedTab = localStorage.getItem(LAST_TAB_KEY);
    return savedTab === 'storyboard' ? 'storyboard' : 'script';
  });

  // 切换标签页时保存
  const handleTabChange = (key: 'script' | 'storyboard') => {
    setActiveTab(key);
    localStorage.setItem(LAST_TAB_KEY, key);
  };

  // 初始化：检查是否有上次选择的工程
  useEffect(() => {
    initializeProject();
  }, []);

  const initializeProject = async () => {
    try {
      const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
      if (lastProjectId) {
        const project = await fetchProject(parseInt(lastProjectId));
        if (project) {
          setSelectedProject(project);
          await loadProjectScript(project.id);
        }
      }
    } catch (error) {
      console.error('加载上次工程失败:', error);
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
    // 无论有没有工程，直接进入工作台
    setShowProjectSelector(false);
    setInitLoading(false);
  };

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
    // 保存到 localStorage
    localStorage.setItem(LAST_PROJECT_KEY, project.id.toString());
    await loadProjectScript(project.id);
  };

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

  // 切换集数
  const handleEpisodeChange = (episode: number) => {
    const script = scripts.find(s => s.episode_number === episode);
    setCurrentEpisode(episode);
    if (script) {
      setScriptId(script.id);
      setTitle(script.title || '');
      setContent(script.content);
      setIsEditing(false);
    } else {
      setScriptId(null);
      setTitle('');
      setContent('');
    }
  };

  const handleBackToProjects = () => {
    navigate('/projects');
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
    if (!description && !title) {
      alert('请至少填写标题或故事概述');
      return;
    }

    let projectToUse = selectedProject;

    // 如果没有选择工程，自动创建一个
    if (!projectToUse) {
      try {
        const projectName = title || `新工程_${new Date().toLocaleDateString('zh-CN')}`;
        const newProject = await createProject({
          name: projectName,
          description: description || '',
          type: 'comic',
          status: 'draft'
        });
        projectToUse = newProject;
        setSelectedProject(newProject);
        localStorage.setItem(LAST_PROJECT_KEY, newProject.id.toString());
      } catch (error: any) {
        alert('自动创建工程失败: ' + error.message);
        return;
      }
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          projectId: projectToUse.id,
          title: title || `第${nextEpisode}集`, 
          description, 
          style, 
          length
        })
      });

      const data = await res.json();

      if (res.status === 402) {
        alert(`余额不足！需要: ¥${data.required.toFixed(4)}, 当前: ¥${data.current.toFixed(2)}`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || '生成失败');
      }

      // 生成成功，刷新剧本列表
      await loadProjectScript(projectToUse.id, data.episodeNumber);
      alert(data.message || `第${data.episodeNumber}集生成成功！`);
    } catch (error: any) {
      alert(error.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载中
  if (initLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
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
            onSelectionChange={(key) => handleTabChange(key as 'script' | 'storyboard')}
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
                {/* 集数选择器 */}
                {scripts.length > 0 && (
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <span className="text-sm text-slate-500 font-medium">集数:</span>
                    <div className="flex gap-2 flex-wrap flex-1">
                      {scripts.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleEpisodeChange(s.episode_number)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            currentEpisode === s.episode_number
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          } ${s.status === 'generating' ? 'animate-pulse' : ''}`}
                        >
                          第{s.episode_number}集
                          {s.status === 'generating' && ' (生成中)'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setScriptId(null);
                        setContent('');
                        setIsEditing(false);
                      }}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <span className="text-lg leading-none">+</span> 生成第{nextEpisode}集
                    </button>
                  </div>
                )}

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

                {!scriptId && !loadingScript && (
                  <ScriptGeneratorForm
                    creationType={creationType}
                    title={title}
                    description={description}
                    style={style}
                    length={length}
                    loading={loading}
                    nextEpisode={nextEpisode}
                    onCreationTypeChange={setCreationType}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onStyleChange={setStyle}
                    onLengthChange={setLength}
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
          <StoryBoard 
            scriptId={scriptId} 
            episodeNumber={currentEpisode}
            scripts={scripts}
            onEpisodeChange={(ep, sid) => {
              setCurrentEpisode(ep);
              const targetScript = scripts.find(s => s.id === sid);
              if (targetScript) {
                setScriptId(sid);
                setContent(targetScript.content);
                setTitle(targetScript.title);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ScriptStudio;
