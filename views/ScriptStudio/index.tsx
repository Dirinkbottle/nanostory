import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab } from '@heroui/react';
import { FileText, Film } from 'lucide-react';
import { useProjectInit } from './hooks/useProjectInit';
import { useScriptManagement } from './hooks/useScriptManagement';
import { useScriptGeneration } from './hooks/useScriptGeneration';
import ProjectInfo from './ProjectInfo';
import ScriptActions from './ScriptActions';
import ScriptGeneratorForm from './ScriptGeneratorForm';
import ScriptPreview from './ScriptPreview';
import EpisodeSelectModal from './EpisodeSelectModal';
import EpisodeSelector from './EpisodeSelector';
import LoadingScreen from './LoadingScreen';
import StoryBoard from '../StoryBoard';

const LAST_TAB_KEY = 'nanostory_last_tab';

const ScriptStudio: React.FC = () => {
  const navigate = useNavigate();
  
  // 使用自定义 hooks
  const { selectedProject, setSelectedProject, initLoading } = useProjectInit();
  
  const {
    scripts,
    currentEpisode,
    nextEpisode,
    scriptId,
    title,
    content,
    loadingScript,
    loading: scriptLoading,
    setTitle,
    setContent,
    setCurrentEpisode,
    setScriptId,
    loadProjectScript,
    handleEpisodeChange,
    handleSaveScript,
    handleDeleteScript
  } = useScriptManagement();
  
  const {
    loading: generationLoading,
    showEpisodeModal,
    setShowEpisodeModal,
    handleGenerateClick,
    handleGenerate
  } = useScriptGeneration({
    selectedProject,
    setSelectedProject,
    loadProjectScript
  });
  
  // 表单状态
  const [isEditing, setIsEditing] = useState(false);
  const [creationType, setCreationType] = useState<'script' | 'comic'>('script');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('电影感');
  const [length, setLength] = useState('短篇');
  const [selectedEpisodeForGeneration, setSelectedEpisodeForGeneration] = useState<number | null>(null);
  
  // 子标签页状态
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard'>(() => {
    const savedTab = localStorage.getItem(LAST_TAB_KEY);
    return savedTab === 'storyboard' ? 'storyboard' : 'script';
  });
  
  const loading = scriptLoading || generationLoading;

  // 切换标签页时保存
  const handleTabChange = (key: 'script' | 'storyboard') => {
    setActiveTab(key);
    localStorage.setItem(LAST_TAB_KEY, key);
  };
  
  // 加载项目剧本
  useEffect(() => {
    if (selectedProject) {
      loadProjectScript(selectedProject.id);
    }
  }, [selectedProject]);

  const handleBackToProjects = () => {
    navigate('/projects');
  };
  
  const handleSave = async () => {
    const success = await handleSaveScript();
    if (success) {
      setIsEditing(false);
    }
  };
  
  const handleDelete = async () => {
    const success = await handleDeleteScript();
    if (success) {
      setIsEditing(false);
    }
  };

  if (initLoading) {
    return <LoadingScreen />;
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
                <EpisodeSelector
                  scripts={scripts}
                  currentEpisode={currentEpisode}
                  nextEpisode={nextEpisode}
                  loading={loading}
                  onEpisodeChange={handleEpisodeChange}
                  onNewEpisode={() => setShowEpisodeModal(true)}
                />

                <ScriptActions
                  scriptId={scriptId}
                  isEditing={isEditing}
                  loading={loading}
                  loadingScript={loadingScript}
                  onEdit={() => setIsEditing(true)}
                  onSave={handleSave}
                  onDelete={handleDelete}
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
                    nextEpisode={selectedEpisodeForGeneration || nextEpisode}
                    onCreationTypeChange={setCreationType}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onStyleChange={setStyle}
                    onLengthChange={setLength}
                    onGenerate={() => {
                      // 直接生成，使用选中的集数
                      const episodeToGenerate = selectedEpisodeForGeneration || nextEpisode;
                      handleGenerate(episodeToGenerate, title, description, style, length, nextEpisode);
                      setSelectedEpisodeForGeneration(null);
                    }}
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
            projectId={selectedProject?.id || null}
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

      {/* 集数选择对话框 */}
      <EpisodeSelectModal
        isOpen={showEpisodeModal}
        onClose={() => setShowEpisodeModal(false)}
        scripts={scripts}
        nextEpisode={nextEpisode}
        onConfirm={(episodeNumber) => {
          // 选择集数后，关闭对话框并显示表单
          setShowEpisodeModal(false);
          setSelectedEpisodeForGeneration(episodeNumber);
          // 清空当前剧本，显示生成表单
          setScriptId(null);
          setContent('');
          setIsEditing(false);
        }}
      />
    </div>
  );
};

export default ScriptStudio;
