import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip, Select, SelectItem } from '@heroui/react';
import { User, Wand2, Layers, Volume2 } from 'lucide-react';
import { Character, CharacterState } from './types';
import { fetchCharacterStates } from '../../../services/assets';
import { getAuthToken } from '../../../services/auth';
import CharacterVoiceModal, { VoiceConfig } from './CharacterVoiceModal';

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
  const [states, setStates] = useState<CharacterState[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // 加载角色状态
  useEffect(() => {
    if (character?.id && isOpen) {
      fetchCharacterStates(character.id)
        .then(setStates)
        .catch(err => console.error('加载角色状态失败:', err));
      
      // 加载声音配置
      fetchVoiceConfig(character.id);
    } else {
      setStates([]);
      setSelectedStateId(null);
      setVoiceConfig(null);
    }
  }, [character?.id, isOpen]);

  // 获取声音配置
  const fetchVoiceConfig = async (characterId: number) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/characters/${characterId}/voice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVoiceConfig(data.voiceConfig);
      }
    } catch (err) {
      console.error('加载声音配置失败:', err);
    }
  };

  // 获取当前显示的状态
  const currentState = selectedStateId 
    ? states.find(s => s.id === selectedStateId) 
    : null;

  if (!character) return null;

  const sceneCount = scenes?.filter(s => s.characters?.includes(character.name)).length || 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                {character.imageUrl ? (
                  <img 
                    src={character.imageUrl} 
                    alt={character.name} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <User className="w-6 h-6 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100">{character.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-400">
                    出现 {sceneCount} 次
                  </Chip>
                  {character.source && (
                    <Chip size="sm" variant="flat" className="bg-slate-700/50 text-slate-400">
                      {character.source === 'ai_extracted' ? 'AI提取' : '本地'}
                    </Chip>
                  )}
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="space-y-6">
                {/* 状态选择器 */}
                {states.length > 0 && (
                  <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-slate-300">角色状态</h4>
                      <Chip size="sm" variant="flat" className="bg-purple-500/10 text-purple-400">
                        {states.length} 个状态
                      </Chip>
                    </div>
                    <Select
                      size="sm"
                      placeholder="选择状态查看"
                      selectedKeys={selectedStateId ? [selectedStateId.toString()] : []}
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string;
                        setSelectedStateId(key ? parseInt(key) : null);
                      }}
                      classNames={{
                        trigger: "bg-slate-800/60 border border-slate-700/50",
                        value: "text-slate-100"
                      }}
                    >
                      {[
                        <SelectItem key="default" textValue="默认状态">
                          默认状态
                        </SelectItem>,
                        ...states.map((state) => (
                          <SelectItem key={state.id.toString()} textValue={state.name}>
                            {state.name}
                          </SelectItem>
                        ))
                      ]}
                    </Select>
                    {currentState && (
                      <div className="mt-2 text-xs text-slate-400">
                        {currentState.description && (
                          <p className="mb-1">{currentState.description}</p>
                        )}
                        {currentState.appearance && (
                          <p className="text-slate-500">外貌：{currentState.appearance}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 角色主图 */}
                {(currentState?.image_url || character.imageUrl) && (
                  <div className="flex justify-center">
                    <div className="w-64 h-64 bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
                      <img 
                        src={currentState?.image_url || character.imageUrl} 
                        alt={character.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                )}

                {/* 三视图 */}
                {(character.frontViewUrl || character.sideViewUrl || character.backViewUrl || character.characterSheetUrl) && (
                  <div className="bg-indigo-500/5 rounded-lg p-4 border border-indigo-500/20">
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                      角色三视图
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {character.frontViewUrl && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400 font-medium">正面</p>
                          <div className="aspect-square bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
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
                          <p className="text-xs text-slate-400 font-medium">侧面</p>
                          <div className="aspect-square bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
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
                          <p className="text-xs text-slate-400 font-medium">背面</p>
                          <div className="aspect-square bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
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
                          <p className="text-xs text-slate-400 font-medium">设计稿</p>
                          <div className="aspect-square bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
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

                {/* 声音配置 */}
                <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded"></span>
                      角色声音
                    </h4>
                    <Button
                      size="sm"
                      variant="flat"
                      className="bg-purple-500/20 text-purple-400"
                      startContent={<Volume2 className="w-3 h-3" />}
                      onPress={() => setShowVoiceModal(true)}
                    >
                      {voiceConfig ? '修改' : '设置'}
                    </Button>
                  </div>
                  {voiceConfig ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-300">{voiceConfig.voiceName}</p>
                        <p className="text-xs text-slate-400">{voiceConfig.description}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">未设置声音，点击上方按钮配置角色专属声音</p>
                  )}
                </div>

                {/* 外貌描述 */}
                {character.appearance && (
                  <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                    <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-500 rounded"></span>
                      外貌特征
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {character.appearance}
                    </p>
                  </div>
                )}

                {/* 性格描述 */}
                {character.personality && (
                  <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/20">
                    <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-500 rounded"></span>
                      性格特点
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {character.personality}
                    </p>
                  </div>
                )}

                {/* 角色简介 */}
                {character.description && (
                  <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
                    <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded"></span>
                      角色简介
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
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

            <ModalFooter className="border-t border-slate-700/50">
              <Button variant="light" onPress={onCloseModal} className="text-slate-400">
                关闭
              </Button>
              {onGenerateImage && (
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20"
                  startContent={<Wand2 className="w-4 h-4" />}
                  onPress={onGenerateImage}
                >
                  生成原画
                </Button>
              )}
            </ModalFooter>

            {/* 声音设置弹窗 */}
            <CharacterVoiceModal
              isOpen={showVoiceModal}
              onClose={() => setShowVoiceModal(false)}
              characterId={character.id}
              characterName={character.name}
              characterImageUrl={character.imageUrl}
              initialVoiceConfig={voiceConfig}
              onSave={(newConfig) => setVoiceConfig(newConfig)}
            />
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CharacterDetailModal;
