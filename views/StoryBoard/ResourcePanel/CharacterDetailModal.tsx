import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip } from '@heroui/react';
import { User, Wand2 } from 'lucide-react';
import { Character } from './types';

interface CharacterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  scenes?: any[];
  onGenerateImage?: () => void;
}

const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  isOpen,
  onClose,
  character,
  scenes,
  onGenerateImage
}) => {
  if (!character) return null;

  const sceneCount = scenes?.filter(s => s.characters?.includes(character.name)).length || 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent className="bg-white">
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {character.imageUrl ? (
                  <img 
                    src={character.imageUrl} 
                    alt={character.name} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">{character.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700">
                    出现 {sceneCount} 次
                  </Chip>
                  {character.source && (
                    <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600">
                      {character.source === 'ai_extracted' ? 'AI提取' : '本地'}
                    </Chip>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="space-y-6">
                {/* 角色主图 */}
                {character.imageUrl && (
                  <div className="flex justify-center">
                    <div className="w-64 h-64 bg-slate-100 rounded-lg overflow-hidden">
                      <img 
                        src={character.imageUrl} 
                        alt={character.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                )}

                {/* 三视图 */}
                {(character.frontViewUrl || character.sideViewUrl || character.backViewUrl || character.characterSheetUrl) && (
                  <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-lg p-4 border border-indigo-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                      角色三视图
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {character.frontViewUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 font-medium">正面</p>
                          <div className="aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={character.frontViewUrl} 
                              alt="正面视图" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      )}
                      {character.sideViewUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 font-medium">侧面</p>
                          <div className="aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={character.sideViewUrl} 
                              alt="侧面视图" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      )}
                      {character.backViewUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 font-medium">背面</p>
                          <div className="aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={character.backViewUrl} 
                              alt="背面视图" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      )}
                      {character.characterSheetUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 font-medium">设计稿</p>
                          <div className="aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={character.characterSheetUrl} 
                              alt="角色设计稿" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 外貌描述 */}
                {character.appearance && (
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-500 rounded"></span>
                      外貌特征
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {character.appearance}
                    </p>
                  </div>
                )}

                {/* 性格描述 */}
                {character.personality && (
                  <div className="bg-gradient-to-br from-purple-50 to-slate-50 rounded-lg p-4 border border-purple-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded"></span>
                      性格特点
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {character.personality}
                    </p>
                  </div>
                )}

                {/* 角色简介 */}
                {character.description && (
                  <div className="bg-gradient-to-br from-green-50 to-slate-50 rounded-lg p-4 border border-green-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded"></span>
                      角色简介
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {character.description}
                    </p>
                  </div>
                )}

                {/* 如果没有任何详细信息 */}
                {!character.appearance && !character.personality && !character.description && (
                  <div className="text-center py-8 text-slate-400">
                    <User className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无详细信息</p>
                    <p className="text-xs mt-1">点击"提取角色"按钮获取AI生成的详细信息</p>
                  </div>
                )}
              </div>
            </ModalBody>

            <ModalFooter className="border-t border-slate-200">
              <Button variant="light" onPress={onCloseModal}>
                关闭
              </Button>
              {onGenerateImage && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold"
                  startContent={<Wand2 className="w-4 h-4" />}
                  onPress={onGenerateImage}
                >
                  生成原画
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CharacterDetailModal;
