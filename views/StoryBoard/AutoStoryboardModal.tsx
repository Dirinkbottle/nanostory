import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Checkbox } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

interface AutoStoryboardModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dontShowAgain: boolean;
  onDontShowAgainChange: (val: boolean) => void;
  onConfirm: () => void;
}

const AutoStoryboardModal: React.FC<AutoStoryboardModalProps> = ({
  isOpen,
  onOpenChange,
  dontShowAgain,
  onDontShowAgainChange,
  onConfirm
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange} 
      size="md"
      classNames={{
        base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/40",
        header: "border-b border-slate-700/50",
        footer: "border-t border-slate-700/50"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              确认重新生成分镜
            </ModalHeader>
            <ModalBody>
              <p className="text-slate-300">
                重新生成分镜将<span className="text-red-400 font-semibold">删除当前所有分镜</span>，以及仅被本集使用的<span className="text-red-400 font-semibold">角色和场景</span>，此操作不可撤销。
              </p>
              <p className="text-slate-500 text-sm mt-2">
                跨集共享的角色和场景不会被删除。确定要继续吗？
              </p>
              <div className="mt-4">
                <Checkbox
                  isSelected={dontShowAgain}
                  onValueChange={onDontShowAgainChange}
                  size="sm"
                >
                  <span className="text-sm text-slate-400">本次登录不再提示</span>
                </Checkbox>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} className="text-slate-400">
                取消
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                onPress={onConfirm}
              >
                确认重新生成
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AutoStoryboardModal;
