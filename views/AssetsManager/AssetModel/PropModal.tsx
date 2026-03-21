import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, Divider } from '@heroui/react';
import { Image as ImageIcon } from 'lucide-react';
import ReferenceImageManager from './ReferenceImageManager';

interface PropModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  editMode: boolean;
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
}

const PropModal: React.FC<PropModalProps> = ({
  isOpen,
  onOpenChange,
  editMode,
  formData,
  setFormData,
  onSave
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-[var(--bg-elevated)] backdrop-blur-xl border border-[var(--border-color)] shadow-2xl shadow-black/40",
        header: "border-b border-[var(--border-color)]",
        body: "py-6"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-[var(--text-primary)] font-bold">
              {editMode ? '编辑' : '新建'}道具
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：表单 */}
                <div className="space-y-4">
                  <Input
                    label="名称"
                    placeholder="输入道具名称"
                    value={formData.name}
                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 shadow-sm"
                    }}
                  />
                  
                  <Textarea
                    label="描述"
                    placeholder="输入详细描述"
                    value={formData.description}
                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                    minRows={3}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 shadow-sm"
                    }}
                  />

                  <Input
                    label="道具分类"
                    placeholder="如：武器、工具、装饰品等"
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 shadow-sm"
                    }}
                  />

                  <Input
                    label="图片URL"
                    placeholder="图片地址（选填）"
                    value={formData.image_url}
                    onValueChange={(val) => setFormData({ ...formData, image_url: val })}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 shadow-sm"
                    }}
                  />

                  <Input
                    label="标签"
                    placeholder="多个标签用逗号分隔"
                    value={formData.tags}
                    onValueChange={(val) => setFormData({ ...formData, tags: val })}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 shadow-sm"
                    }}
                  />
                </div>

                {/* 右侧：参考图管理 */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      参考图
                    </label>
                    {editMode && formData.id ? (
                      <ReferenceImageManager
                        assetType="prop"
                        assetId={formData.id}
                      />
                    ) : (
                      <div className="text-center py-8 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]" />
                        <p className="text-sm text-[var(--text-muted)]">保存道具后可管理参考图</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="font-semibold text-[var(--text-secondary)]">
                取消
              </Button>
              <Button 
                className="pro-btn-primary"
                onPress={onSave}
              >
                保存
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default PropModal;
