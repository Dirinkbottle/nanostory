import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from '@heroui/react';
import { getAuthToken } from '../../services/auth';
import { Project } from '../../services/projects';
import ProjectSelector from '../../components/ProjectSelector';
import ProjectInfo from './ProjectInfo';
import ScriptActions from './ScriptActions';
import ScriptGeneratorForm from './ScriptGeneratorForm';
import ScriptPreview from './ScriptPreview';
import StoryBoard from '../StoryBoard';
import { FileText, Film } from 'lucide-react';

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
  
  // 模型相关状态
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [textModels, setTextModels] = useState<any[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState('');
  
  // 子标签页状态
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard'>('script');

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
      const token = getAuthToken();
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          projectId: selectedProject.id,
          title, 
          description, 
          style, 
          length,
          modelName: selectedTextModel
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

      setScriptId(data.id);
      setContent(data.content);
      setIsEditing(false);
      alert(`生成成功！`);
    } catch (error: any) {
      alert(error.message || '生成失败');
    } finally {
      setLoading(false);
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

                {!scriptId && !loadingScript && (
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
