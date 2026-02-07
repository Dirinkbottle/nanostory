import { useState } from 'react';
import { useDisclosure } from '@heroui/react';
import { getAuthToken } from '../../../services/auth';
import { ResourceItem } from './types';

export const useResourceModals = () => {
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<any>(null);
  const { isOpen: isViewsModalOpen, onOpen: openViewsModal, onOpenChange: onViewsModalChange } = useDisclosure();
  const { isOpen: isPreviewModalOpen, onOpen: openPreviewModal, onOpenChange: onPreviewModalChange } = useDisclosure();

  const handleGenerateViews = async (charName: string, imageModel: string, textModel: string, characterId?: number) => {
    // 如果是从角色卡片点击进来（没有 imageModel），先从数据库获取三视图数据
    if (!imageModel && !textModel && characterId) {
      try {
        const token = getAuthToken();
        
        // 从数据库获取角色的三视图数据
        const res = await fetch(`/api/characters/${characterId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const character = await res.json();
          console.log('[Generate Views] 角色数据:', character);
          
          // 设置角色数据，包含三视图 URL
          setSelectedResource({
            name: charName,
            frontViewUrl: character.front_view_url,
            sideViewUrl: character.side_view_url,
            backViewUrl: character.back_view_url,
            characterSheetUrl: character.character_sheet_url,
            generationStatus: character.generation_status
          });
        } else {
          // 获取失败，只设置名称
          setSelectedResource({ name: charName });
        }
      } catch (error) {
        console.error('[Generate Views] 获取角色数据失败:', error);
        setSelectedResource({ name: charName });
      }
      
      setGeneratedPrompts(null);
      openViewsModal();
      return;
    }

    // 如果是从弹窗内点击生成按钮，验证模型并启动工作流
    if (!imageModel) {
      alert('请选择图片生成模型');
      return;
    }

    if (!characterId) {
      alert('缺少角色 ID');
      return;
    }

    setIsGenerating(true);

    try {
      const token = getAuthToken();
      
      // 调用后端 API 启动三视图生成工作流
      const res = await fetch(`/api/characters/${characterId}/generate-views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          style: '动漫风格',
          imageModel,
          textModel
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '生成失败');
      }

      const data = await res.json();
      console.log('[Generate Views] 工作流已启动:', data);
      
      alert(`三视图生成已启动（工作流 ID: ${data.jobId}），请稍后刷新查看`);
      setGeneratedPrompts({ status: 'generating', jobId: data.jobId });
      
      // 关闭弹窗
      closeViewsModal();
    } catch (error: any) {
      alert('生成失败: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (resource: ResourceItem) => {
    setSelectedResource(resource);
    openPreviewModal();
  };

  const closeViewsModal = () => {
    onViewsModalChange();
  };

  const closePreviewModal = () => {
    onPreviewModalChange();
  };

  return {
    selectedResource,
    isGenerating,
    generatedPrompts,
    isViewsModalOpen,
    isPreviewModalOpen,
    handleGenerateViews,
    handlePreview,
    closeViewsModal,
    closePreviewModal
  };
};
