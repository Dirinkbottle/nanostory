import React, { useState, useMemo } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
import { Play, AlertTriangle, CheckCircle, Info } from 'lucide-react';

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

  // 重置集数当对话框打开时
  React.useEffect(() => {
    if (isOpen) {
      setTargetEpisode(nextEpisode.toString());
    }
  }, [isOpen, nextEpisode]);

  // 计算缺失的集数
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
      alert('请输入有效的集数（大于等于 1）');
      return;
    }
    
    onConfirm(episodeNumber);
  };

  const handleQuickSelect = (episode: number) => {
    setTargetEpisode(episode.toString());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          <span>选择生成集数</span>
        </ModalHeader>
        
        <ModalBody className="space-y-6">
          {/* 集数输入 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
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
                input: "text-lg font-semibold",
                inputWrapper: "border-2 border-slate-200 hover:border-blue-400"
              }}
              startContent={<span className="text-slate-500 text-sm">第</span>}
              endContent={<span className="text-slate-500 text-sm">集</span>}
            />
          </div>

          {/* 快速选择 */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">快速选择：</p>
            <div className="flex gap-2 flex-wrap">
              {/* 下一集 */}
              <button
                onClick={() => handleQuickSelect(nextEpisode)}
                className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border-2 border-blue-200 transition-all font-medium text-sm"
              >
                下一集（第 {nextEpisode} 集）
              </button>
              
              {/* 缺失的集数 */}
              {missingEpisodes.slice(0, 5).map(ep => (
                <button
                  key={ep}
                  onClick={() => handleQuickSelect(ep)}
                  className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border-2 border-amber-200 transition-all font-medium text-sm"
                >
                  第 {ep} 集（缺失）
                </button>
              ))}
            </div>
          </div>

          {/* 状态提示 */}
          <div className="space-y-3">
            {/* 缺失集数警告 - 禁止跳过 */}
            {missingEpisodes.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      无法跳过集数生成
                    </p>
                    <p className="text-sm text-red-700">
                      缺失第 {missingEpisodes.slice(0, 10).join('、')} 集
                      {missingEpisodes.length > 10 && ` 等 ${missingEpisodes.length} 集`}
                    </p>
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      ⚠️ 请先生成第 {missingEpisodes[0]} 集，不能跳过集数
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 已存在警告 */}
            {hasExisting && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      第 {targetEpisode} 集已存在
                    </p>
                    <p className="text-sm text-red-700">
                      该集已存在，请选择其他集数或删除后重新生成
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 正常提示 */}
            {!hasExisting && missingEpisodes.length === 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      准备生成第 {targetEpisode} 集
                    </p>
                    <p className="text-sm text-green-700">
                      前面的集数都已完整，可以继续创作
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 已有集数概览 */}
          {scripts.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">已有集数概览</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {scripts.map(s => (
                  <div
                    key={s.id}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      s.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : s.status === 'generating'
                        ? 'bg-blue-100 text-blue-700 animate-pulse'
                        : 'bg-red-100 text-red-700'
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
            className="bg-slate-100 text-slate-700"
          >
            取消
          </Button>
          <Button
            color="primary"
            onPress={handleConfirm}
            isDisabled={hasExisting || missingEpisodes.length > 0}
            startContent={<Play className="w-4 h-4" />}
            className="bg-blue-600 text-white">
            确认生成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EpisodeSelectModal;
