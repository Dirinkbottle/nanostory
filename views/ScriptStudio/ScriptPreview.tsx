import React from 'react';
import { Card, CardBody, Textarea } from '@heroui/react';
import { Sparkles } from 'lucide-react';

interface ScriptPreviewProps {
  content: string;
  isEditing: boolean;
  loadingScript: boolean;
  onContentChange: (value: string) => void;
}

// 剧本内容渲染器：将 Markdown 格式的剧本转换为美化的 HTML
const renderScriptContent = (content: string) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // 场景标题: ## 场景X：XXX
    if (trimmedLine.startsWith('## ')) {
      const title = trimmedLine.substring(3);
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-blue-400 mt-8 mb-4 pb-2 border-b border-slate-600/50 first:mt-0">
          {title}
        </h2>
      );
      return;
    }

    // 分隔线: ---
    if (trimmedLine === '---') {
      elements.push(
        <hr key={key++} className="my-6 border-t border-slate-600/30" />
      );
      return;
    }

    // 场景描述: *...*
    if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*') && trimmedLine.length > 2) {
      const desc = trimmedLine.slice(1, -1);
      elements.push(
        <p key={key++} className="text-slate-400 italic my-4 pl-4 border-l-2 border-slate-600/50 leading-relaxed">
          {desc}
        </p>
      );
      return;
    }

    // 角色对白: **角色名**：“...” 或 **角色名**："..."
    const dialogueMatch = trimmedLine.match(/^\*\*(.+?)\*\*[:：]\s*[\u201c"](.+)[\u201d"]$/);
    if (dialogueMatch) {
      const [, characterName, dialogue] = dialogueMatch;
      elements.push(
        <div key={key++} className="my-3 flex items-start gap-3">
          <span className="font-bold text-emerald-400 whitespace-nowrap min-w-[4rem]">{characterName}</span>
          <span className="text-slate-200 leading-relaxed">“{dialogue}”</span>
        </div>
      );
      return;
    }

    // 动作指示: （...） 或 (...)
    if ((trimmedLine.startsWith('（') && trimmedLine.endsWith('）')) ||
        (trimmedLine.startsWith('(') && trimmedLine.endsWith(')'))) {
      const action = trimmedLine.slice(1, -1);
      elements.push(
        <p key={key++} className="text-amber-400/80 text-sm my-2 pl-6 italic">
          （{action}）
        </p>
      );
      return;
    }

    // 空行
    if (trimmedLine === '') {
      elements.push(<div key={key++} className="h-2" />);
      return;
    }

    // 普通文本
    elements.push(
      <p key={key++} className="text-slate-300 my-2 leading-relaxed">
        {line}
      </p>
    );
  });

  return elements;
};

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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-500">加载剧本中...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700/30">
            <Sparkles className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-slate-400 text-lg font-semibold">开始创作你的视频剧本</p>
          <p className="text-slate-600 text-sm font-medium">输入创意 → 生成剧本 → 选择模型 → 生成视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      <Card className="bg-slate-900/80 border border-slate-700/50 shadow-lg shadow-black/20 flex-1 flex flex-col overflow-hidden rounded-2xl">
        <CardBody className="p-6 flex-1 flex flex-col overflow-hidden">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="flex-1 min-h-0 w-full bg-slate-800/60 text-slate-200 font-medium leading-relaxed text-base border border-slate-600/50 rounded-lg p-4 resize-none overflow-auto outline-none focus:border-blue-500/70 transition-colors font-mono"
            />
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 script-content">
              {renderScriptContent(content)}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ScriptPreview;
