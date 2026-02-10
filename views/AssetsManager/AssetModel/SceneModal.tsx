import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@heroui/react';

interface SceneModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  editMode: boolean;
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
}

const SceneModal: React.FC<SceneModalProps> = ({
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
        base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/40",
        header: "border-b border-slate-700/50",
        body: "py-6"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-slate-100 font-bold">
              {editMode ? '编辑' : '新建'}场景
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="名称"
                placeholder="输入场景名称"
                value={formData.name}
                onValueChange={(val) => setFormData({ ...formData, name: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />
              
              <Textarea
                label="描述"
                placeholder="输入详细描述"
                value={formData.description}
                onValueChange={(val) => setFormData({ ...formData, description: val })}
                minRows={3}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />

              <Input
                label="环境"
                placeholder="环境描述"
                value={formData.environment}
                onValueChange={(val) => setFormData({ ...formData, environment: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />

              <Input
                label="光线"
                placeholder="光线效果"
                value={formData.lighting}
                onValueChange={(val) => setFormData({ ...formData, lighting: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />

              <Input
                label="氛围"
                placeholder="氛围感觉"
                value={formData.mood}
                onValueChange={(val) => setFormData({ ...formData, mood: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />

              <Input
                label="图片URL"
                placeholder="图片地址（选填）"
                value={formData.image_url}
                onValueChange={(val) => setFormData({ ...formData, image_url: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />

              <Input
                label="标签"
                placeholder="多个标签用逗号分隔"
                value={formData.tags}
                onValueChange={(val) => setFormData({ ...formData, tags: val })}
                classNames={{
                  input: "bg-transparent text-slate-100 placeholder:text-slate-500",
                  label: "text-slate-400 font-medium",
                  inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
                }}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="font-semibold text-slate-400">
                取消
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20"
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

export default SceneModal;
