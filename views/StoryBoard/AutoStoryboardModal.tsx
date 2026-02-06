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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              确认重新生成分镜
            </ModalHeader>
            <ModalBody>
              <p className="text-slate-700">
                重新生成分镜将<span className="text-red-500 font-semibold">覆盖当前所有分镜内容</span>，此操作不可撤销。
              </p>
              <p className="text-slate-500 text-sm mt-2">
                确定要继续吗？
              </p>
              <div className="mt-4">
                <Checkbox
                  isSelected={dontShowAgain}
                  onValueChange={onDontShowAgainChange}
                  size="sm"
                >
                  <span className="text-sm text-slate-600">本次登录不再提示</span>
                </Checkbox>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
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
