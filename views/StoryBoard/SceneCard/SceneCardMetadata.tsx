import React from 'react';
import { Chip } from '@heroui/react';
import { Video } from 'lucide-react';
import { StoryboardScene } from '../useSceneManager';

interface SceneCardMetadataProps {
  scene: StoryboardScene;
}

const SceneCardMetadata: React.FC<SceneCardMetadataProps> = ({ scene }) => {
  return (
    <div className="space-y-3 mt-3">
      {/* 镜头类型和场景位置 */}
      <div className="flex items-center gap-2 flex-wrap">
        {scene.shotType && (
          <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-400 text-xs font-medium">
            {scene.shotType}
          </Chip>
        )}
        {scene.location && (
          <Chip size="sm" variant="flat" className="bg-purple-500/10 text-purple-400 text-xs font-medium">
            {scene.location}
          </Chip>
        )}
        {scene.emotion && (
          <Chip size="sm" variant="flat" className="bg-pink-500/10 text-pink-400 text-xs font-medium">
            {scene.emotion}
          </Chip>
        )}
        {scene.hasAction && (
          <Chip size="sm" variant="flat" className="bg-orange-500/10 text-orange-400 text-xs font-bold">
            有动作
          </Chip>
        )}
      </div>

      {/* 首尾帧 */}
      {scene.hasAction && (scene.startFrame || scene.endFrame) && (
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-3 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-300">动作帧（用于生成视频）</span>
          </div>
          <div className="flex gap-3">
            {scene.startFrame && (
              <div className="bg-slate-800/60 rounded-md p-1.5 border border-orange-500/20">
                <span className="text-[10px] font-semibold text-emerald-400 block mb-1 text-center">首帧</span>
                <img src={scene.startFrame} alt="首帧" className="w-20 h-14 object-cover rounded" />
              </div>
            )}
            {scene.endFrame && (
              <div className="bg-slate-800/60 rounded-md p-1.5 border border-orange-500/20">
                <span className="text-[10px] font-semibold text-red-400 block mb-1 text-center">尾帧</span>
                <img src={scene.endFrame} alt="尾帧" className="w-20 h-14 object-cover rounded" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 角色列表 */}
      {scene.characters && scene.characters.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-slate-500 mb-2 block">角色</span>
          <div className="flex flex-wrap gap-2">
            {scene.characters.map((char, idx) => {
              const linked = scene.linkedCharacters?.find(lc => lc.name === char);
              return (
                <div key={idx} className="flex items-center gap-2 bg-blue-500/10 rounded-lg px-2 py-1 border border-blue-500/20">
                  {linked?.image_url ? (
                    <img src={linked.image_url} alt={char} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400">
                      {char.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-medium text-blue-400">{char}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneCardMetadata;
