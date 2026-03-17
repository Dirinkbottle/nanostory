import React, { useState, useEffect } from 'react';
import { Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip } from '@heroui/react';
import { Check, Edit2, Trash2, Mic, Play, Lock, Unlock, Image, Clapperboard } from 'lucide-react';
import { StoryboardScene } from '../StoryBoard/useSceneManager';
import { Character } from '../StoryBoard/ResourcePanel/types';
import { Scene } from '../StoryBoard/ResourcePanel/useSceneData';
import AvatarSlot, { AddSlot } from './AvatarSlot';
import { DirectorAssistantModal, DirectorParams, DEFAULT_DIRECTOR_PARAMS } from './DirectorAssistant';

interface StoryboardRowProps {
  scene: StoryboardScene;
  index: number;
  dbCharacters: Character[];
  dbScenes: Scene[];
  onUpdateDescription: (id: number, desc: string) => Promise<boolean>;
  onDelete: (id: number) => void;
  onCharacterClick: (charName: string) => void;
  onSceneClick: (sceneName: string) => void;
  onPropClick: (propName: string) => void;
  onAddCharacter: (sceneId: number) => void;
  onAddScene: (sceneId: number) => void;
  onGenerateVideo: (id: number) => void;
  onGenerateImage: (id: number) => void;
  onUpdateDirectorParams?: (id: number, params: DirectorParams) => void;
  isGeneratingImage?: boolean;
  isGeneratingVideo?: boolean;
  isDragOver?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const StoryboardRow: React.FC<StoryboardRowProps> = ({
  scene,
  index,
  dbCharacters,
  dbScenes,
  onUpdateDescription,
  onDelete,
  onCharacterClick,
  onSceneClick,
  onPropClick,
  onAddCharacter,
  onAddScene,
  onGenerateVideo,
  onGenerateImage,
  onUpdateDirectorParams,
  isGeneratingImage,
  isGeneratingVideo,
  isDragOver,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scene.description);
  const [isSaving, setIsSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showDirectorAssistant, setShowDirectorAssistant] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(scene.description);
    }
  }, [scene.description, editing]);

  // 获取当前分镜的导演参数
  const currentDirectorParams: DirectorParams = scene.directorParams || DEFAULT_DIRECTOR_PARAMS;
  const hasDirectorParams = !!scene.directorParams;

  const save = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    const success = await onUpdateDescription(scene.id, draft);
    setIsSaving(false);

    if (success) {
      setEditing(false);
    }
  };

  // 匹配角色图片（优先用 linkedCharacters，回退到名字匹配）
  const getCharImage = (name: string) => {
    const linked = scene.linkedCharacters?.find(lc => lc.name === name);
    if (linked?.image_url) return linked.image_url;
    const c = dbCharacters.find(ch => ch.name === name);
    return c?.imageUrl || c?.frontViewUrl || undefined;
  };

  // 匹配场景图片（优先用 linkedScenes，回退到名字匹配）
  const getSceneImage = (name: string) => {
    const linked = scene.linkedScenes?.find(ls => ls.name === name);
    if (linked?.image_url) return linked.image_url;
    const s = dbScenes.find(sc => sc.name === name);
    return s?.image_url || undefined;
  };

  return (
    <>
    <tr
      className={`border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors group ${isDragOver ? 'bg-cyan-900/20' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* 序号 + 锁定 */}
      <td className="px-3 py-3 w-16 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 text-cyan-400 text-sm font-bold">
            {index + 1}
          </span>
          <button
            onClick={() => setLocked(!locked)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title={locked ? '解锁' : '锁定'}
          >
            {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
          </button>
        </div>
      </td>

      {/* 描述 */}
      <td className="px-3 py-3 min-w-[240px] max-w-[360px]">
        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onValueChange={setDraft}
              minRows={2}
              maxRows={5}
              classNames={{
                input: 'text-xs text-slate-200 bg-transparent',
                inputWrapper: 'bg-slate-800 border border-cyan-500/30 min-h-0',
              }}
            />
            <button
              onClick={save}
              disabled={isSaving}
              className="px-2 py-0.5 bg-cyan-600 text-white text-[10px] rounded flex items-center gap-1 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-3 h-3" /> {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        ) : (
          <div className="relative group/desc">
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
              {scene.description || '暂无描述'}
            </p>
            {scene.dialogue && (
              <p className="text-[10px] text-slate-500 mt-1 italic truncate">💬 {scene.dialogue}</p>
            )}
            <button
              onClick={() => { setDraft(scene.description); setEditing(true); }}
              className="absolute top-0 right-0 p-1 text-slate-500 hover:text-cyan-400 opacity-0 group-hover/desc:opacity-100 transition-opacity"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>

      {/* 首/尾帧 */}
      <td className="px-3 py-3 w-[140px]">
        <div className="flex gap-1.5">
          {scene.startFrame ? (
            <div className="relative">
              <img src={scene.startFrame} alt="首帧" className="w-16 h-10 object-cover rounded border border-slate-600" />
              <span className="absolute bottom-0 left-0 bg-emerald-600/80 text-[8px] text-white px-1 rounded-tr">首</span>
            </div>
          ) : (
            <div className="w-16 h-10 rounded border border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-[10px]">首帧</div>
          )}
          {scene.endFrame ? (
            <div className="relative">
              <img src={scene.endFrame} alt="尾帧" className="w-16 h-10 object-cover rounded border border-slate-600" />
              <span className="absolute bottom-0 left-0 bg-rose-600/80 text-[8px] text-white px-1 rounded-tr">尾</span>
            </div>
          ) : (
            <div className="w-16 h-10 rounded border border-dashed border-slate-600 flex items-center justify-center text-slate-600 text-[10px]">尾帧</div>
          )}
          {!scene.startFrame && !scene.endFrame && (
            <button
              onClick={() => onGenerateImage(scene.id)}
              disabled={isGeneratingImage}
              className="w-8 h-10 rounded border border-dashed border-cyan-500/30 flex items-center justify-center text-cyan-500 hover:bg-cyan-900/20 transition-all disabled:opacity-40"
              title="生成首尾帧"
            >
              {isGeneratingImage ? <span className="text-[10px]">...</span> : <Image className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </td>

      {/* 出场人物 */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(scene.characters || []).map((name, i) => (
            <AvatarSlot key={i} type="character" name={name} imageUrl={getCharImage(name)} onClick={() => onCharacterClick(name)} />
          ))}
          <AddSlot type="character" onClick={() => onAddCharacter(scene.id)} />
        </div>
      </td>

      {/* 场景 */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          {scene.location ? (
            <AvatarSlot type="scene" name={scene.location} imageUrl={getSceneImage(scene.location)} onClick={() => onSceneClick(scene.location)} />
          ) : (
            <AddSlot type="scene" onClick={() => onAddScene(scene.id)} />
          )}
        </div>
      </td>

      {/* 道具 */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(scene.props || []).length > 0 ? (
            scene.props.map((p, i) => (
              <AvatarSlot key={i} type="prop" name={p} onClick={() => onPropClick(p)} />
            ))
          ) : (
            <span className="text-[10px] text-slate-600">—</span>
          )}
        </div>
      </td>

      {/* 配音 */}
      <td className="px-3 py-3 w-16 text-center">
        <div className="flex flex-col gap-1 items-center">
          <button className="p-2 rounded-lg bg-slate-700/60 text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-all" title="配音">
            <Mic className="w-4 h-4" />
          </button>
          <Tooltip content={hasDirectorParams ? '编辑导演参数' : '添加导演参数'}>
            <button
              onClick={() => setShowDirectorAssistant(true)}
              className={`p-2 rounded-lg transition-all ${
                hasDirectorParams 
                  ? 'bg-amber-900/40 text-amber-400 hover:bg-amber-800/50' 
                  : 'bg-slate-700/60 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
              }`}
              title="导演助手"
            >
              <Clapperboard className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </td>

      {/* 视频 */}
      <td className="px-3 py-3 w-20 text-center">
        {scene.videoUrl ? (
          <button onClick={() => setShowVideoPreview(true)} className="inline-flex p-2 rounded-lg bg-emerald-900/40 text-emerald-400 hover:bg-emerald-800/50 transition-all" title="播放视频">
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onGenerateVideo(scene.id)}
            disabled={isGeneratingVideo}
            className="px-2 py-1.5 text-[10px] rounded-lg bg-slate-700/60 text-slate-400 hover:text-orange-400 hover:bg-slate-700 transition-all disabled:opacity-40"
            title="生成视频"
          >
            {isGeneratingVideo ? '...' : '生成'}
          </button>
        )}
      </td>

      {/* 操作 */}
      <td className="px-3 py-3 w-12 text-center">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-all opacity-0 group-hover:opacity-100"
          title="删除分镜"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>

    {/* 视频预览 */}
    <Modal isOpen={showVideoPreview} onOpenChange={setShowVideoPreview} size="2xl" classNames={{ base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50" }}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-slate-100">
              <Play className="w-5 h-5 text-blue-400" />
              视频预览 - 分镜 {index + 1}
            </ModalHeader>
            <ModalBody>
              {scene.videoUrl ? (
                <video
                  src={scene.videoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                  style={{ maxHeight: '60vh' }}
                />
              ) : (
                <div className="text-center py-10 text-slate-500">暂无视频</div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" className="bg-slate-800/80 text-slate-300" onPress={onClose}>关闭</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    {/* 删除确认 */}
    <Modal isOpen={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} size="sm">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-red-500">删除分镜</ModalHeader>
            <ModalBody>
              <p className="text-sm text-slate-600">确定要删除分镜 <span className="font-bold">#{index + 1}</span> 吗？此操作不可撤销。</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" size="sm" onPress={onClose}>取消</Button>
              <Button size="sm" className="bg-red-500 text-white font-semibold" onPress={() => { onClose(); onDelete(scene.id); }}>确认删除</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    {/* 导演助手 */}
    <DirectorAssistantModal
      isOpen={showDirectorAssistant}
      onClose={() => setShowDirectorAssistant(false)}
      initialParams={currentDirectorParams}
      sceneDescription={scene.description}
      onSave={(params) => {
        if (onUpdateDirectorParams) {
          onUpdateDirectorParams(scene.id, params);
        }
      }}
    />
    </>
  );
};

export default StoryboardRow;
