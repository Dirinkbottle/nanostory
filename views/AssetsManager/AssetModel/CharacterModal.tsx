import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@heroui/react';

interface CharacterModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  editMode: boolean;
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
}

const CharacterModal: React.FC<CharacterModalProps> = ({
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
      size="3xl"
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
              {editMode ? '编辑' : '新建'}角色
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：表单 */}
                <div className="space-y-4">
                  <Input
                    label="名称"
                    placeholder="输入角色名称"
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
                    label="外貌"
                    placeholder="外貌特征"
                    value={formData.appearance}
                    onValueChange={(val) => setFormData({ ...formData, appearance: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                    }}
                  />

                  <Input
                    label="性格"
                    placeholder="性格特点"
                    value={formData.personality}
                    onValueChange={(val) => setFormData({ ...formData, personality: val })}
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
                </div>

                {/* 右侧：图片显示 */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">角色图片</label>
                    {formData.image_url ? (
                      <div className="relative group">
                        <img 
                          src={formData.image_url} 
                          alt={formData.name || '角色图片'} 
                          className="w-full h-64 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white"
                            onPress={() => setFormData({ ...formData, image_url: '' })}
                          >
                            移除图片
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-64 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-sm">暂无图片</p>
                        <p className="text-xs mt-1">可通过三视图生成功能添加</p>
                      </div>
                    )}
                  </div>

                  {/* 三视图预览（如果有） */}
                  {(formData.front_view_url || formData.side_view_url || formData.back_view_url) && (
                    <div>
                      <label className="text-sm font-medium text-slate-600 mb-2 block">三视图</label>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.front_view_url && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">正面</p>
                            <img src={formData.front_view_url} alt="正面" className="w-full h-24 object-cover rounded border" />
                          </div>
                        )}
                        {formData.side_view_url && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">侧面</p>
                            <img src={formData.side_view_url} alt="侧面" className="w-full h-24 object-cover rounded border" />
                          </div>
                        )}
                        {formData.back_view_url && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">背面</p>
                            <img src={formData.back_view_url} alt="背面" className="w-full h-24 object-cover rounded border" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

export default CharacterModal;
