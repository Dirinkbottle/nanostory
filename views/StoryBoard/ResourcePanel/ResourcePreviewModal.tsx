import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { Wand2 } from 'lucide-react';
import { ResourceItem } from './types';

interface ResourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedResource: ResourceItem | null;
}

const ResourcePreviewModal: React.FC<ResourcePreviewModalProps> = ({
  isOpen,
  onClose,
  selectedResource
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
      <ModalContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
        {(onCloseModal) => (
          <>
            <ModalHeader className="text-slate-100 font-bold">
              预览 - {selectedResource?.name}
            </ModalHeader>
            <ModalBody>
              <div className="flex items-center justify-center py-8">
                <div className="w-64 h-64 bg-slate-800/60 rounded-lg flex items-center justify-center">
                  {selectedResource?.imageUrl ? (
                    <img src={selectedResource.imageUrl} alt={selectedResource.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <span className="text-6xl block mb-2">🖼️</span>
                      <p className="text-sm">暂无原画</p>
                      <p className="text-xs mt-1">点击生成按钮创建</p>
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onCloseModal}>关闭</Button>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20"
                startContent={<Wand2 className="w-4 h-4" />}
              >
                生成原画
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ResourcePreviewModal;
