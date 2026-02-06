import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@heroui/react';

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
        base: "bg-white border border-slate-200 shadow-xl",
        header: "border-b border-slate-200",
        body: "py-6"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-slate-800 font-bold">
              {editMode ? '编辑' : '新建'}道具
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="名称"
                placeholder="输入道具名称"
                value={formData.name}
                onValueChange={(val) => setFormData({ ...formData, name: val })}
                classNames={{
                  input: "bg-white text-slate-800 placeholder:text-slate-400",
                  label: "text-slate-600 font-medium",
                  inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                }}
              />
              
              <Textarea
                label="描述"
                placeholder="输入详细描述"
                value={formData.description}
                onValueChange={(val) => setFormData({ ...formData, description: val })}
                minRows={3}
                classNames={{
                  input: "bg-white text-slate-800 placeholder:text-slate-400",
                  label: "text-slate-600 font-medium",
                  inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                }}
              />

              <Input
                label="道具分类"
                placeholder="如：武器、工具、装饰品等"
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
                classNames={{
                  input: "bg-white text-slate-800 placeholder:text-slate-400",
                  label: "text-slate-600 font-medium",
                  inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                }}
              />

              <Input
                label="图片URL"
                placeholder="图片地址（选填）"
                value={formData.image_url}
                onValueChange={(val) => setFormData({ ...formData, image_url: val })}
                classNames={{
                  input: "bg-white text-slate-800 placeholder:text-slate-400",
                  label: "text-slate-600 font-medium",
                  inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                }}
              />

              <Input
                label="标签"
                placeholder="多个标签用逗号分隔"
                value={formData.tags}
                onValueChange={(val) => setFormData({ ...formData, tags: val })}
                classNames={{
                  input: "bg-white text-slate-800 placeholder:text-slate-400",
                  label: "text-slate-600 font-medium",
                  inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                }}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="font-semibold">
                取消
              </Button>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold" 
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
