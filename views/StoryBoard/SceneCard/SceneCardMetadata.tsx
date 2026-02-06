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
          <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700 text-xs font-medium">
            🎬 {scene.shotType}
          </Chip>
        )}
        {scene.location && (
          <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-700 text-xs font-medium">
            📍 {scene.location}
          </Chip>
        )}
        <Chip size="sm" variant="flat" className="bg-green-100 text-green-700 text-xs font-medium">
          ⏱️ {scene.duration}s
        </Chip>
        {scene.emotion && (
          <Chip size="sm" variant="flat" className="bg-pink-100 text-pink-700 text-xs font-medium">
            💫 {scene.emotion}
          </Chip>
        )}
        {scene.hasAction && (
          <Chip size="sm" variant="flat" className="bg-orange-100 text-orange-700 text-xs font-bold">
            🎭 有动作
          </Chip>
        )}
      </div>

      {/* 首尾帧 */}
      {scene.hasAction && (scene.startFrame || scene.endFrame) && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-700">动作帧（用于生成视频）</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {scene.startFrame && (
              <div className="bg-white rounded-md p-2 border border-orange-100">
                <span className="text-xs font-semibold text-green-600 block mb-1">▶ 首帧</span>
                <p className="text-xs text-slate-600">{scene.startFrame}</p>
              </div>
            )}
            {scene.endFrame && (
              <div className="bg-white rounded-md p-2 border border-orange-100">
                <span className="text-xs font-semibold text-red-600 block mb-1">◼ 尾帧</span>
                <p className="text-xs text-slate-600">{scene.endFrame}</p>
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
            {scene.characters.map((char, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                  👤
                </div>
                <span className="text-xs font-medium text-blue-700">{char}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneCardMetadata;
