import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import { Plus, X, Image as ImageIcon, Link, Trash2, GripVertical } from 'lucide-react';
import {
  AssetReferenceImage,
  AssetReferenceType,
  fetchReferenceImages,
  uploadReferenceImage,
  deleteReferenceImage,
  updateReferenceImage
} from '../../../services/assets';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirm } from '../../../contexts/ConfirmContext';

interface ReferenceImageManagerProps {
  assetType: AssetReferenceType;
  assetId: number;
  disabled?: boolean;
}

const ReferenceImageManager: React.FC<ReferenceImageManagerProps> = ({
  assetType,
  assetId,
  disabled = false
}) => {
  const [images, setImages] = useState<AssetReferenceImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageDesc, setNewImageDesc] = useState('');
  const [previewImage, setPreviewImage] = useState<AssetReferenceImage | null>(null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onOpenChange: onPreviewOpenChange } = useDisclosure();

  // 加载参考图
  const loadImages = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const data = await fetchReferenceImages(assetType, assetId);
      setImages(data);
    } catch (error: any) {
      console.error('加载参考图失败:', error);
    } finally {
      setLoading(false);
    }
  }, [assetType, assetId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // 添加参考图
  const handleAddImage = async () => {
    if (!newImageUrl.trim()) {
      showToast('请输入图片URL', 'error');
      return;
    }

    try {
      await uploadReferenceImage(assetType, assetId, newImageUrl.trim(), newImageDesc.trim() || undefined);
      setNewImageUrl('');
      setNewImageDesc('');
      await loadImages();
      showToast('参考图添加成功', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // 删除参考图
  const handleDeleteImage = async (image: AssetReferenceImage) => {
    const confirmed = await confirm({
      title: '删除确认',
      message: '确定要删除这张参考图吗？',
      type: 'danger',
      confirmText: '删除'
    });
    if (!confirmed) return;

    try {
      await deleteReferenceImage(image.id);
      await loadImages();
      showToast('参考图删除成功', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // 预览图片
  const handlePreview = (image: AssetReferenceImage) => {
    setPreviewImage(image);
    onPreviewOpen();
  };

  // 拖拽排序
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // 更新本地状态
    setImages(newImages);

    // 更新服务器排序
    try {
      const orders = newImages.map((img, idx) => ({
        id: img.id,
        sort_order: idx
      }));
      
      // 逐个更新排序
      for (const order of orders) {
        await updateReferenceImage(order.id, { sort_order: order.sort_order });
      }
    } catch (error: any) {
      showToast(error.message, 'error');
      loadImages(); // 恢复原状
    }
  };

  if (!assetId) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        请先保存资产后再管理参考图
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 添加参考图 */}
      {!disabled && (
        <div className="space-y-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
          <div className="flex gap-2">
            <Input
              size="sm"
              placeholder="输入图片URL"
              value={newImageUrl}
              onValueChange={setNewImageUrl}
              classNames={{
                input: "bg-transparent text-slate-100",
                inputWrapper: "bg-slate-700/60 border border-slate-600/50"
              }}
              className="flex-1"
            />
            <Button
              size="sm"
              className="bg-blue-500 text-white shrink-0"
              onPress={handleAddImage}
              isDisabled={!newImageUrl.trim()}
              startContent={<Plus className="w-4 h-4" />}
            >
              添加
            </Button>
          </div>
          <Input
            size="sm"
            placeholder="图片描述（可选）"
            value={newImageDesc}
            onValueChange={setNewImageDesc}
            classNames={{
              input: "bg-transparent text-slate-100",
              inputWrapper: "bg-slate-700/60 border border-slate-600/50"
            }}
          />
        </div>
      )}

      {/* 图片列表 */}
      {loading ? (
        <div className="text-center py-4 text-slate-400 text-sm">
          加载中...
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-6 text-slate-500">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无参考图</p>
          {!disabled && (
            <p className="text-xs mt-1">输入图片URL添加参考图</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="relative group rounded-lg overflow-hidden border border-slate-700/50 bg-slate-800/40 cursor-pointer"
              onClick={() => handlePreview(image)}
            >
              {/* 拖拽手柄 */}
              {!disabled && (
                <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1 bg-black/50 rounded cursor-grab">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
              
              {/* 删除按钮 */}
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image);
                  }}
                  className="absolute top-1 right-1 z-10 p-1 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              )}

              {/* 图片 */}
              <div className="aspect-square">
                <img
                  src={image.image_url}
                  alt={image.description || '参考图'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 描述 */}
              {image.description && (
                <div className="p-1.5 bg-slate-900/80">
                  <p className="text-xs text-slate-300 truncate">{image.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 预览弹窗 */}
      <Modal
        isOpen={isPreviewOpen}
        onOpenChange={onPreviewOpenChange}
        size="3xl"
        classNames={{
          base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50",
          header: "border-b border-slate-700/50",
          body: "p-0"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-100">
                参考图预览
              </ModalHeader>
              <ModalBody>
                {previewImage && (
                  <div className="relative">
                    <img
                      src={previewImage.image_url}
                      alt={previewImage.description || '参考图'}
                      className="w-full max-h-[70vh] object-contain"
                    />
                    {previewImage.description && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
                        <p className="text-sm text-slate-200">{previewImage.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-slate-400">
                  关闭
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ReferenceImageManager;
