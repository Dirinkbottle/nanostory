import React from 'react';
import { Modal, ModalContent, ModalBody, ModalFooter, Button } from '@heroui/react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onClose}
      size="4xl"
      classNames={{
        base: "bg-black/95",
        closeButton: "text-white hover:bg-white/20"
      }}
    >
      <ModalContent>
        {(onCloseModal) => (
          <>
            <ModalBody className="p-4">
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="预览大图" 
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg" 
                />
              )}
            </ModalBody>
            <ModalFooter className="border-t border-white/10">
              <Button 
                variant="light" 
                onPress={onCloseModal}
                className="text-white font-semibold"
              >
                关闭
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ImagePreviewModal;
