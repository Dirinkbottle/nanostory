import React, { useState, useEffect, useRef } from 'react';
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
import { useToast } from '../../contexts/ToastContext';

const LAST_TAB_KEY = 'nanostory_last_tab';

const ScriptStudio: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 可调整大小的分隔条状态
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // 百分比
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
  } = useScriptManagement({
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error')
  });
  
  const {
    loading: generationLoading,
    showEpisodeModal,
    setShowEpisodeModal,
    handleGenerateClick,
    handleGenerate,
    generationProgress
  } = useScriptGeneration({
    selectedProject,
    setSelectedProject,
    loadProjectScript,
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error')
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

  // 拖拽调整大小处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

      // 限制宽度范围：30% - 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setRightPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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
    <div className="h-full bg-[#0c0e1a] overflow-hidden flex flex-col">
      {/* 项目信息和子标签页 */}
      <div className="bg-[rgba(18,20,40,0.9)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-8 pt-4">
          {selectedProject && (
            <ProjectInfo 
              project={selectedProject} 
              onBackToProjects={handleBackToProjects} 
            />
          )}
        </div>
        
        {/* 子标签页 + AI 模型按钮 */}
        <div className="px-8 flex items-center">
          <div className="flex-1">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => handleTabChange(key as 'script' | 'storyboard' | 'composition')}
              variant="underlined"
              classNames={{
                tabList: "gap-8 w-full relative p-0 border-b-0",
                cursor: "w-full bg-gradient-to-r from-amber-400 to-yellow-500 h-0.5 shadow-[0_0_10px_rgba(230,200,122,0.5)]",
                tab: "max-w-fit px-0 h-12 data-[hover-unselected=true]:opacity-80",
                tabContent: "group-data-[selected=true]:text-[#e6c87a] group-data-[selected=false]:text-[#6b6561] font-semibold transition-colors"
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
              {/* <Tab
                key="composition"
                title={
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-4 h-4" />
                    <span>合成</span>
                  </div>
                }
              /> */}
            </Tabs>
          </div>
          <Button
            size="sm"
            variant="flat"
            className="bg-[rgba(230,200,122,0.15)] text-[#e6c87a] font-semibold border border-[rgba(230,200,122,0.3)] hover:border-[rgba(230,200,122,0.5)] hover:shadow-[0_0_15px_rgba(230,200,122,0.2)] transition-all cursor-pointer"
            startContent={<Bot className="w-4 h-4" />}
            onPress={openModelConfig}
          >
            模型选择
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'composition' ? (
          <VideoComposition projectId={selectedProject?.id || null} projectName={selectedProject?.name || ''} />
        ) : activeTab === 'script' ? (
          <div ref={containerRef} className="h-full flex relative">
            {/* 左侧：创作区 */}
            <div
              className="border-r border-[rgba(255,255,255,0.06)] flex flex-col bg-[rgba(18,20,40,0.6)] overflow-hidden"
              style={{ width: `${100 - rightPanelWidth}%` }}
            >
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
                    generationProgress={generationProgress}
                    onGenerate={() => {
                      if (!aiModels.selected.text) {
                        showToast('请先点击右上角「AI 模型」按钮选择文本模型', 'warning');
                        return;
                      }
                      const episodeToGenerate = selectedEpisodeForGeneration || nextEpisode;
                      handleGenerate(episodeToGenerate, title, description, length, nextEpisode, aiModels.selected.text);
                      setSelectedEpisodeForGeneration(null);
                    }}
                    onManualSave={async (manualTitle, manualContent) => {
                      if (!selectedProject) {
                        showToast('请先选择一个项目', 'warning');
                        return;
                      }
                      const ep = selectedEpisodeForGeneration || nextEpisode;
                      const result = await handleCreateScript(selectedProject.id, manualTitle, manualContent, ep);
                      if (result.success) {
                        showToast(result.message, 'success');
                        setSelectedEpisodeForGeneration(null);
                      } else {
                        showToast(result.message, 'error');
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {/* 可拖拽的分隔条 */}
            <div
              className="w-1 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(230,200,122,0.4)] cursor-col-resize transition-colors relative group"
              onMouseDown={() => setIsResizing(true)}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            {/* 右侧：预览区 */}
            <div
              className="flex flex-col bg-[#0c0e1a] overflow-hidden"
              style={{ width: `${rightPanelWidth}%` }}
            >
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
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={closeDeleteModal} 
        size="md"
        classNames={{
          backdrop: 'bg-black/60 backdrop-blur-sm',
          base: 'bg-gradient-to-br from-[#1a1d35] to-[#121428] border border-[rgba(255,255,255,0.08)] shadow-2xl',
          header: 'border-b border-[rgba(255,255,255,0.06)]',
          body: 'py-4',
          footer: 'border-t border-[rgba(255,255,255,0.06)]',
          closeButton: 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/10'
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-[#e8e4dc] font-bold">
              {deleteResult.type === 'confirm' && '删除确认'}
              {deleteResult.type === 'orphans' && '发现多余资源'}
              {deleteResult.type === 'success' && '删除成功'}
              {deleteResult.type === 'error' && '删除失败'}
            </span>
          </ModalHeader>
          <ModalBody>
            {deleteResult.type === 'confirm' && (
              <p className="text-[#a8a29e]">确定要删除该集剧本吗？将同时删除该集的所有分镜、帧图片和视频，此操作无法恢复。</p>
            )}
            {deleteResult.type === 'orphans' && (
              <div className="space-y-3">
                <p className="text-[#a8a29e] text-sm">{deleteResult.message}。以下角色/场景仅在该集中出现，是否一并删除？</p>
                {orphanCharacters.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#e6c87a] mb-1">多余角色：</p>
                    <div className="flex flex-wrap gap-2">
                      {orphanCharacters.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {orphanScenes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#4fc3f7] mb-1">多余场景：</p>
                    <div className="flex flex-wrap gap-2">
                      {orphanScenes.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-sm text-cyan-400">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {deleteResult.type === 'success' && (
              <p className="text-emerald-400">{deleteResult.message}</p>
            )}
            {deleteResult.type === 'error' && (
              <p className="text-red-400">{deleteResult.message}</p>
            )}
          </ModalBody>
          <ModalFooter className="gap-2">
            {deleteResult.type === 'confirm' && (
              <>
                <Button variant="flat" className="bg-white/5 text-[#a8a29e] hover:bg-white/10 border border-white/10 cursor-pointer" onPress={closeDeleteModal}>取消</Button>
                <Button className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 cursor-pointer" onPress={confirmDelete} isLoading={scriptLoading}>确认删除</Button>
              </>
            )}
            {deleteResult.type === 'orphans' && (
              <>
                <Button variant="flat" className="bg-white/5 text-[#a8a29e] hover:bg-white/10 border border-white/10 cursor-pointer" onPress={skipCleanOrphans}>保留资源</Button>
                <Button className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 cursor-pointer" onPress={confirmCleanOrphans}>一并删除</Button>
              </>
            )}
            {(deleteResult.type === 'success' || deleteResult.type === 'error') && (
              <Button className="bg-gradient-to-br from-amber-400 to-yellow-500 text-[#1a1d35] font-semibold shadow-lg shadow-amber-500/30 cursor-pointer" onPress={closeDeleteModal}>确定</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ScriptStudio;
