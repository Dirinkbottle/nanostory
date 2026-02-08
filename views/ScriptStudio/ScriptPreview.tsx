import React from 'react';
import { Card, CardBody, Textarea } from '@heroui/react';
import { Sparkles } from 'lucide-react';

interface ScriptPreviewProps {
  content: string;
  isEditing: boolean;
  loadingScript: boolean;
  onContentChange: (value: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  content,
  isEditing,
  loadingScript,
  onContentChange
}) => {
  if (loadingScript) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500">加载剧本中...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-slate-300" />
          </div>
          <p className="text-slate-500 text-lg font-semibold">开始创作你的视频剧本</p>
          <p className="text-slate-400 text-sm font-medium">输入创意 → 生成剧本 → 选择模型 → 生成视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      <Card className="bg-white border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <CardBody className="p-6 flex-1 flex flex-col overflow-hidden">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="flex-1 min-h-0 w-full bg-white text-slate-800 font-medium leading-relaxed text-base border border-slate-200 rounded-lg p-4 resize-none overflow-auto outline-none focus:border-blue-500 transition-colors"
            />
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <pre className="whitespace-pre-wrap text-slate-700 font-medium leading-relaxed text-base break-words">
                {content}
              </pre>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ScriptPreview;
