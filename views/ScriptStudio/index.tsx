import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { FileText, Film, Bot, Clapperboard } from 'lucide-react';
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
import SimpleStoryBoard from '../SimpleStoryBoard';
import VideoComposition from '../VideoComposition';
import AIModelConfigModal from '../../components/AIModelConfigModal';
import { useAIModels } from '../../hooks/useAIModels';

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
    handleCreateScript,
    handleDeleteScript,
    handleCleanOrphans
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
  const [description, setDescription] = useState('');
  const [length, setLength] = useState('短篇');
  const [selectedEpisodeForGeneration, setSelectedEpisodeForGeneration] = useState<number | null>(null);

  // 删除确认弹窗
  const { isOpen: isDeleteModalOpen, onOpen: openDeleteModal, onClose: closeDeleteModal } = useDisclosure();
  const [deleteResult, setDeleteResult] = useState<{ type: 'confirm' | 'success' | 'orphans' | 'error'; message: string }>({ type: 'confirm', message: '' });
  const [orphanCharacters, setOrphanCharacters] = useState<{ id: number; name: string; image_url?: string }[]>([]);
  const [orphanScenes, setOrphanScenes] = useState<{ id: number; name: string; image_url?: string }[]>([]);

  // 全局 AI 模型管理
  const aiModels = useAIModels(selectedProject?.id);
  const { isOpen: isModelConfigOpen, onOpen: openModelConfig, onOpenChange: onModelConfigChange } = useDisclosure();
  
  // 子标签页状态
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard' | 'composition'>(() => {
    const savedTab = localStorage.getItem(LAST_TAB_KEY);
    if (savedTab === 'storyboard' || savedTab === 'composition') return savedTab;
    return 'script';
  });
  
  const loading = scriptLoading || generationLoading;

  // 切换标签页时保存
  const handleTabChange = (key: 'script' | 'storyboard' | 'composition') => {
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
    // 打开确认弹窗
    setDeleteResult({ type: 'confirm', message: '' });
    openDeleteModal();
  };

  const confirmDelete = async () => {
    const result = await handleDeleteScript();
    if (result.success) {
      setIsEditing(false);
      const hasOrphans = (result.orphanCharacters?.length || 0) + (result.orphanScenes?.length || 0) > 0;
      if (hasOrphans) {
        setOrphanCharacters(result.orphanCharacters || []);
        setOrphanScenes(result.orphanScenes || []);
        setDeleteResult({ type: 'orphans', message: result.message });
      } else {
        setDeleteResult({ type: 'success', message: result.message });
        if (selectedProject) loadProjectScript(selectedProject.id);
      }
    } else {
      setDeleteResult({ type: 'error', message: result.message });
    }
  };

  const confirmCleanOrphans = async () => {
    const charIds = orphanCharacters.map(c => c.id);
    const sceneIds = orphanScenes.map(s => s.id);
    await handleCleanOrphans(charIds, sceneIds);
    setDeleteResult({ type: 'success', message: '剧本及多余资源已清理完毕' });
    setOrphanCharacters([]);
    setOrphanScenes([]);
    if (selectedProject) loadProjectScript(selectedProject.id);
  };

  const skipCleanOrphans = () => {
    setDeleteResult({ type: 'success', message: '剧本已删除，角色和场景已保留' });
    setOrphanCharacters([]);
    setOrphanScenes([]);
    if (selectedProject) loadProjectScript(selectedProject.id);
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
        
        {/* 子标签页 + AI 模型按钮 */}
        <div className="px-8 border-b border-slate-200 flex items-center">
          <div className="flex-1">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => handleTabChange(key as 'script' | 'storyboard' | 'composition')}
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
              <Tab
                key="composition"
                title={
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-4 h-4" />
                    <span>合成</span>
                  </div>
                }
              />
            </Tabs>
          </div>
          <Button
            size="sm"
            variant="flat"
            className="bg-blue-50 text-blue-600 font-medium"
            startContent={<Bot className="w-4 h-4" />}
            onPress={openModelConfig}
          >
            {aiModels.selected.text || 'AI 模型'}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'composition' ? (
          <VideoComposition projectId={selectedProject?.id || null} projectName={selectedProject?.name || ''} />
        ) : activeTab === 'script' ? (
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
                    title={title}
                    description={description}
                    length={length}
                    loading={loading}
                    nextEpisode={selectedEpisodeForGeneration || nextEpisode}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                    onLengthChange={setLength}
                    onGenerate={() => {
                      if (!aiModels.selected.text) {
                        alert('请先点击右上角「AI 模型」按钮选择文本模型');
                        return;
                      }
                      const episodeToGenerate = selectedEpisodeForGeneration || nextEpisode;
                      handleGenerate(episodeToGenerate, title, description, length, nextEpisode, aiModels.selected.text);
                      setSelectedEpisodeForGeneration(null);
                    }}
                    onManualSave={async (manualTitle, manualContent) => {
                      if (!selectedProject) {
                        alert('请先选择一个项目');
                        return;
                      }
                      const ep = selectedEpisodeForGeneration || nextEpisode;
                      const result = await handleCreateScript(selectedProject.id, manualTitle, manualContent, ep);
                      alert(result.message);
                      if (result.success) setSelectedEpisodeForGeneration(null);
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
          localStorage.getItem('userRole') === 'admin' ? (
            <StoryBoard 
              scriptId={scriptId}
              projectId={selectedProject?.id || null}
              episodeNumber={currentEpisode}
              scripts={scripts}
              textModel={aiModels.selected.text}
              imageModel={aiModels.selected.image}
              videoModel={aiModels.selected.video}
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
          ) : (
            <SimpleStoryBoard
              scriptId={scriptId}
              projectId={selectedProject?.id || null}
              episodeNumber={currentEpisode}
              scripts={scripts}
              textModel={aiModels.selected.text}
              imageModel={aiModels.selected.image}
              videoModel={aiModels.selected.video}
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
          )
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

      {/* AI 模型配置弹窗 */}
      <AIModelConfigModal
        isOpen={isModelConfigOpen}
        onOpenChange={onModelConfigChange}
        models={aiModels.models}
        selected={aiModels.selected}
        onSelect={aiModels.setSelected}
      />

      {/* 删除确认弹窗 */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {deleteResult.type === 'confirm' && '删除确认'}
            {deleteResult.type === 'orphans' && '发现多余资源'}
            {deleteResult.type === 'success' && '删除成功'}
            {deleteResult.type === 'error' && '删除失败'}
          </ModalHeader>
          <ModalBody>
            {deleteResult.type === 'confirm' && (
              <p className="text-slate-600">确定要删除该集剧本吗？将同时删除该集的所有分镜、帧图片和视频，此操作无法恢复。</p>
            )}
            {deleteResult.type === 'orphans' && (
              <div className="space-y-3">
                <p className="text-slate-600 text-sm">{deleteResult.message}。以下角色/场景仅在该集中出现，是否一并删除？</p>
                {orphanCharacters.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">多余角色：</p>
                    <div className="flex flex-wrap gap-2">
                      {orphanCharacters.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {orphanScenes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">多余场景：</p>
                    <div className="flex flex-wrap gap-2">
                      {orphanScenes.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {deleteResult.type === 'success' && (
              <p className="text-green-600">{deleteResult.message}</p>
            )}
            {deleteResult.type === 'error' && (
              <p className="text-red-600">{deleteResult.message}</p>
            )}
          </ModalBody>
          <ModalFooter>
            {deleteResult.type === 'confirm' && (
              <>
                <Button variant="light" onPress={closeDeleteModal}>取消</Button>
                <Button color="danger" onPress={confirmDelete} isLoading={scriptLoading}>确认删除</Button>
              </>
            )}
            {deleteResult.type === 'orphans' && (
              <>
                <Button variant="light" onPress={skipCleanOrphans}>保留资源</Button>
                <Button color="danger" onPress={confirmCleanOrphans}>一并删除</Button>
              </>
            )}
            {(deleteResult.type === 'success' || deleteResult.type === 'error') && (
              <Button color="primary" onPress={closeDeleteModal}>确定</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ScriptStudio;
