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

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={(open) => !open && handleCancel()}
        size="sm"
        classNames={{
          backdrop: 'bg-black/60 backdrop-blur-sm',
          base: 'bg-gradient-to-br from-[#1a1d35] to-[#121428] border border-[rgba(255,255,255,0.08)] shadow-2xl',
          header: 'border-b border-[rgba(255,255,255,0.06)]',
          body: 'py-6',
          footer: 'border-t border-[rgba(255,255,255,0.06)]',
          closeButton: 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/10'
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${options?.type === 'danger' ? 'bg-red-500/20 text-red-400' : ''}
                  ${options?.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : ''}
                  ${options?.type === 'info' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                `}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[#e8e4dc] font-bold text-lg">
                  {options?.title || '确认操作'}
                </span>
              </ModalHeader>
              <ModalBody>
                <p className="text-[#a8a29e] whitespace-pre-wrap leading-relaxed">
                  {options?.message}
                </p>
              </ModalBody>
              <ModalFooter className="gap-2">
                <Button 
                  variant="flat" 
                  className="bg-white/5 text-[#a8a29e] hover:bg-white/10 border border-white/10 cursor-pointer"
                  onPress={handleCancel}
                >
                  {options?.cancelText || '取消'}
                </Button>
                <Button 
                  className={`
                    font-semibold cursor-pointer transition-all
                    ${options?.type === 'danger' 
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50' 
                      : options?.type === 'warning'
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-[#1a1d35] shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
                        : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
                    }
                  `}
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
