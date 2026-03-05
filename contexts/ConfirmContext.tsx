import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

interface ConfirmProviderProps {
  children: ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef?.(true);
    setIsOpen(false);
    setOptions(null);
    setResolveRef(null);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    resolveRef?.(false);
    setIsOpen(false);
    setOptions(null);
    setResolveRef(null);
  }, [resolveRef]);

  const getButtonStyle = () => {
    switch (options?.type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  };

  const getIconColor = () => {
    switch (options?.type) {
      case 'danger':
        return 'text-red-400';
      case 'warning':
        return 'text-amber-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={(open) => !open && handleCancel()}
        size="sm"
        classNames={{
          base: "bg-slate-900 border border-slate-700/50",
          header: "border-b border-slate-700/50",
          footer: "border-t border-slate-700/50"
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 ${getIconColor()}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-slate-100 font-semibold">
                  {options?.title || '确认操作'}
                </span>
              </ModalHeader>
              <ModalBody className="py-6">
                <p className="text-slate-300 whitespace-pre-wrap">
                  {options?.message}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button 
                  variant="flat" 
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700"
                  onPress={handleCancel}
                >
                  {options?.cancelText || '取消'}
                </Button>
                <Button 
                  className={getButtonStyle()}
                  onPress={handleConfirm}
                >
                  {options?.confirmText || '确定'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </ConfirmContext.Provider>
  );
};
