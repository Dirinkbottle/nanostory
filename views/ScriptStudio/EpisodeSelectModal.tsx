import React, { useState, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
import { Play, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  content: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
}

interface EpisodeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: Script[];
  nextEpisode: number;
  onConfirm: (episodeNumber: number) => void;
}

const EpisodeSelectModal: React.FC<EpisodeSelectModalProps> = ({
  isOpen,
  onClose,
  scripts,
  nextEpisode,
  onConfirm
}) => {
  const [targetEpisode, setTargetEpisode] = useState(nextEpisode.toString());
  const { showToast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setTargetEpisode(nextEpisode.toString());
    }
  }, [isOpen, nextEpisode]);

  const { missingEpisodes, hasExisting } = useMemo(() => {
    const episodeNumber = parseInt(targetEpisode) || nextEpisode;
    const existingNumbers = scripts.map(s => s.episode_number).sort((a, b) => a - b);
    const missing: number[] = [];
    
    for (let i = 1; i < episodeNumber; i++) {
      if (!existingNumbers.includes(i)) {
        missing.push(i);
      }
    }
    
    const exists = existingNumbers.includes(episodeNumber);
    
    return {
      missingEpisodes: missing,
      hasExisting: exists
    };
  }, [targetEpisode, scripts, nextEpisode]);

  const handleConfirm = () => {
    const episodeNumber = parseInt(targetEpisode);
    if (isNaN(episodeNumber) || episodeNumber < 1) {
      showToast('请输入有效的集数（大于等于 1）', 'warning');
      return;
    }
    
    onConfirm(episodeNumber);
  };

  const handleQuickSelect = (episode: number) => {
    setTargetEpisode(episode.toString());
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="2xl"
      classNames={{
        base: "bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-2xl",
        header: "border-b border-[var(--border-color)]",
        body: "py-6",
        footer: "border-t border-[var(--border-color)]"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-[var(--text-primary)]">
          <Play className="w-5 h-5 text-[var(--accent-light)]" />
          <span>选择生成集数</span>
        </ModalHeader>
        
        <ModalBody className="space-y-6">
          {/* 集数输入 */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
              选择要生成的集数
            </label>
            <Input
              type="number"
              min="1"
              value={targetEpisode}
              onChange={(e) => setTargetEpisode(e.target.value)}
              placeholder="输入集数"
              size="lg"
              classNames={{
                input: "text-lg font-semibold bg-transparent text-[var(--text-primary)]",
                inputWrapper: "bg-[var(--bg-input)] border-2 border-[var(--border-color)] hover:border-[var(--accent)]/50 data-[focus=true]:border-[var(--accent)]"
              }}
              startContent={<span className="text-[var(--text-secondary)] text-sm">第</span>}
              endContent={<span className="text-[var(--text-secondary)] text-sm">集</span>}
            />
          </div>

          {/* 快速选择 */}
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">快速选择：</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleQuickSelect(nextEpisode)}
                className="px-4 py-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent-light)] hover:bg-[var(--accent)]/20 border-2 border-[var(--accent)]/30 transition-all font-medium text-sm"
              >
                下一集（第 {nextEpisode} 集）
              </button>
              
              {missingEpisodes.slice(0, 5).map(ep => (
                <button
                  key={ep}
                  onClick={() => handleQuickSelect(ep)}
                  className="px-4 py-2 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 border-2 border-[var(--warning)]/30 transition-all font-medium text-sm"
                >
                  第 {ep} 集（缺失）
                </button>
              ))}
            </div>
          </div>

          {/* 状态提示 */}
          <div className="space-y-3">
            {missingEpisodes.length > 0 && (
              <div className="bg-[var(--danger)]/10 border-2 border-[var(--danger)]/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--danger)] mb-1">
                      无法跳过集数生成
                    </p>
                    <p className="text-sm text-[var(--danger)]/80">
                      缺失第 {missingEpisodes.slice(0, 10).join('、')} 集
                      {missingEpisodes.length > 10 && ` 等 ${missingEpisodes.length} 集`}
                    </p>
                    <p className="text-xs text-[var(--danger)]/60 mt-2 font-medium">
                      请先生成第 {missingEpisodes[0]} 集，不能跳过集数
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasExisting && (
              <div className="bg-[var(--danger)]/10 border-2 border-[var(--danger)]/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--danger)] mb-1">
                      第 {targetEpisode} 集已存在
                    </p>
                    <p className="text-sm text-[var(--danger)]/80">
                      该集已存在，请选择其他集数或删除后重新生成
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!hasExisting && missingEpisodes.length === 0 && (
              <div className="bg-[var(--success)]/10 border-2 border-[var(--success)]/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--success)] mb-1">
                      准备生成第 {targetEpisode} 集
                    </p>
                    <p className="text-sm text-[var(--success)]/80">
                      前面的集数都已完整，可以继续创作
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 已有集数概览 */}
          {scripts.length > 0 && (
            <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[var(--text-secondary)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">已有集数概览</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {scripts.map(s => (
                  <div
                    key={s.id}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      s.status === 'completed'
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : s.status === 'generating'
                        ? 'bg-[var(--accent)]/15 text-[var(--accent-light)] animate-pulse'
                        : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                    }`}
                  >
                    第 {s.episode_number} 集
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="flat"
            onPress={onClose}
            className="pro-btn"
          >
            取消
          </Button>
          <Button
            onPress={handleConfirm}
            isDisabled={hasExisting || missingEpisodes.length > 0}
            startContent={<Play className="w-4 h-4" />}
            className="pro-btn-primary"
          >
            确认生成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EpisodeSelectModal;
