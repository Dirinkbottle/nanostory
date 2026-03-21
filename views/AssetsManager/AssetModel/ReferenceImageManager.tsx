import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem, Tooltip } from '@heroui/react';
import { Plus, Image as ImageIcon, Trash2, GripVertical, Eye, User, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import {
  AssetReferenceImage,
  AssetReferenceType,
  ReferenceViewType,
  VIEW_TYPE_CONFIG,
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

/** 视角图标组件 */
const ViewIcon: React.FC<{ viewType: ReferenceViewType; className?: string }> = ({ viewType, className = 'w-5 h-5' }) => {
  switch (viewType) {
    case 'front':
      return <User className={className} />;
    case 'side':
      return <ArrowRight className={className} />;
    case 'back':
      return <ArrowLeft className={className} />;
    default:
      return <ImageIcon className={className} />;
  }
};

/** 三视图上传区块 */
const ViewUploadSlot: React.FC<{
  viewType: ReferenceViewType;
  image?: AssetReferenceImage;
  onUpload: (viewType: ReferenceViewType, url: string, desc?: string) => void;
  onDelete: (image: AssetReferenceImage) => void;
  onPreview: (image: AssetReferenceImage) => void;
  disabled?: boolean;
}> = ({ viewType, image, onUpload, onDelete, onPreview, disabled }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const config = VIEW_TYPE_CONFIG[viewType];

  const handleSubmit = () => {
    if (inputUrl.trim()) {
      onUpload(viewType, inputUrl.trim());
      setInputUrl('');
    }
  };

  return (
    <div 
      className="relative flex flex-col"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 标题 */}
      <div className="flex items-center gap-1.5 mb-2">
        <ViewIcon viewType={viewType} className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}图</span>
        <Tooltip content={config.desc} placement="top">
          <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
        </Tooltip>
      </div>

      {/* 图片区域 */}
      {image ? (
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-600/50 bg-slate-800/60 group">
          <img
            src={image.image_url}
            alt={`${config.label}视图`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => onPreview(image)}
          />
          {/* 悬停操作 */}
          {!disabled && isHovering && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
              <button
                onClick={() => onPreview(image)}
                className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                title="预览"
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => onDelete(image)}
                className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          {/* 视角标签 */}
          <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 ${config.color}`}>
            <p className="text-xs text-center">{config.label}</p>
          </div>
        </div>
      ) : (
        <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-600/50 bg-slate-800/30 flex flex-col items-center justify-center p-2">
          {disabled ? (
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-600" />
              <p className="text-xs text-slate-500">暂无{config.label}图</p>
            </div>
          ) : (
            <>
              <ViewIcon viewType={viewType} className={`w-8 h-8 mb-2 ${config.color} opacity-50`} />
              <Input
                size="sm"
                placeholder="粘贴图片URL"
                value={inputUrl}
                onValueChange={setInputUrl}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                classNames={{
                  input: "bg-transparent text-slate-200 text-xs",
                  inputWrapper: "bg-slate-700/40 border border-slate-600/50 h-7 min-h-7"
                }}
                className="w-full mb-1"
              />
              <Button
                size="sm"
                variant="flat"
                className="w-full h-6 text-xs bg-slate-700/50 text-slate-300"
                onPress={handleSubmit}
                isDisabled={!inputUrl.trim()}
              >
                <Plus className="w-3 h-3 mr-1" />
                添加{config.label}图
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ReferenceImageManager: React.FC<ReferenceImageManagerProps> = ({
  assetType,
  assetId,
  disabled = false
}) => {
  const [images, setImages] = useState<AssetReferenceImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageDesc, setNewImageDesc] = useState('');
  const [newViewType, setNewViewType] = useState<ReferenceViewType>('other');
  const [previewImage, setPreviewImage] = useState<AssetReferenceImage | null>(null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onOpenChange: onPreviewOpenChange } = useDisclosure();

  // 按视角类型分组图片
  const imagesByViewType = useMemo(() => {
    const grouped: Record<ReferenceViewType, AssetReferenceImage[]> = {
      front: [],
      side: [],
      back: [],
      other: []
    };
    images.forEach(img => {
      const vt = img.view_type || 'other';
      grouped[vt].push(img);
    });
    return grouped;
  }, [images]);

  // 三视图槽位（每种视角取第一张）
  const threeViewSlots = useMemo(() => ({
    front: imagesByViewType.front[0],
    side: imagesByViewType.side[0],
    back: imagesByViewType.back[0]
  }), [imagesByViewType]);

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

  // 上传参考图
  const handleUpload = async (viewType: ReferenceViewType, url: string, desc?: string) => {
    try {
      await uploadReferenceImage(assetType, assetId, url, desc, viewType);
      await loadImages();
      showToast('参考图添加成功', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // 添加其他参考图
  const handleAddOtherImage = async () => {
    if (!newImageUrl.trim()) {
      showToast('请输入图片URL', 'error');
      return;
    }
    await handleUpload(newViewType, newImageUrl.trim(), newImageDesc.trim() || undefined);
    setNewImageUrl('');
    setNewImageDesc('');
    setNewViewType('other');
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

  // 拖拽排序（仅其他参考图）
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

    const otherImages = imagesByViewType.other;
    const newOtherImages = [...otherImages];
    const [draggedImage] = newOtherImages.splice(dragIndex, 1);
    newOtherImages.splice(dropIndex, 0, draggedImage);

    // 更新服务器排序
    try {
      for (let i = 0; i < newOtherImages.length; i++) {
        await updateReferenceImage(newOtherImages[i].id, { sort_order: i });
      }
      await loadImages();
    } catch (error: any) {
      showToast(error.message, 'error');
      loadImages();
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
    <div className="space-y-6">
      {/* 三视图区域 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-slate-200">角色三视图</h4>
          <Tooltip 
            content="上传角色的正面、侧面、背面参考图，AI生成时会根据镜头角度自动选择合适的视图"
            placement="right"
          >
            <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
          </Tooltip>
        </div>
        
        {loading ? (
          <div className="text-center py-4 text-slate-400 text-sm">加载中...</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <ViewUploadSlot
              viewType="front"
              image={threeViewSlots.front}
              onUpload={handleUpload}
              onDelete={handleDeleteImage}
              onPreview={handlePreview}
              disabled={disabled}
            />
            <ViewUploadSlot
              viewType="side"
              image={threeViewSlots.side}
              onUpload={handleUpload}
              onDelete={handleDeleteImage}
              onPreview={handlePreview}
              disabled={disabled}
            />
            <ViewUploadSlot
              viewType="back"
              image={threeViewSlots.back}
              onUpload={handleUpload}
              onDelete={handleDeleteImage}
              onPreview={handlePreview}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-700/50" />

      {/* 其他参考图区域 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-slate-200">其他参考图</h4>
          <span className="text-xs text-slate-500">（补充角色细节、表情、动作等）</span>
        </div>

        {/* 添加其他参考图 */}
        {!disabled && (
          <div className="space-y-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 mb-3">
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
              <Select
                size="sm"
                selectedKeys={[newViewType]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as ReferenceViewType;
                  if (selected) setNewViewType(selected);
                }}
                classNames={{
                  trigger: "bg-slate-700/60 border border-slate-600/50 min-w-[100px]",
                  value: "text-slate-200"
                }}
                aria-label="选择视角类型"
              >
                {Object.entries(VIEW_TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} textValue={cfg.label}>
                    <span className={cfg.color}>{cfg.label}</span>
                  </SelectItem>
                ))}
              </Select>
              <Button
                size="sm"
                className="bg-blue-500 text-white shrink-0"
                onPress={handleAddOtherImage}
                isDisabled={!newImageUrl.trim()}
                startContent={<Plus className="w-4 h-4" />}
              >
                添加
              </Button>
            </div>
            <Input
              size="sm"
              placeholder="图片描述（可选，如：微笑表情、战斗姿势等）"
              value={newImageDesc}
              onValueChange={setNewImageDesc}
              classNames={{
                input: "bg-transparent text-slate-100",
                inputWrapper: "bg-slate-700/60 border border-slate-600/50"
              }}
            />
          </div>
        )}

        {/* 其他参考图列表 */}
        {imagesByViewType.other.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">暂无其他参考图</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imagesByViewType.other.map((image, index) => (
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
      </div>

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
              <ModalHeader className="text-slate-100 flex items-center gap-2">
                {previewImage && (
                  <>
                    <ViewIcon viewType={previewImage.view_type || 'other'} className="w-5 h-5" />
                    <span>{VIEW_TYPE_CONFIG[previewImage.view_type || 'other'].label}参考图</span>
                  </>
                )}
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
