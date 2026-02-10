import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { FileText, PenLine, Sparkles } from 'lucide-react';
import ManualScriptForm from './ManualScriptForm';

interface ScriptGeneratorFormProps {
  title: string;
  description: string;
  length: string;
  loading: boolean;
  nextEpisode: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onGenerate: () => void;
  onManualSave: (title: string, content: string) => void;
}

const ScriptGeneratorForm: React.FC<ScriptGeneratorFormProps> = ({
  title,
  description,
  length,
  loading,
  nextEpisode,
  onTitleChange,
  onDescriptionChange,
  onLengthChange,
  onGenerate,
  onManualSave
}) => {
  const isFirstEpisode = nextEpisode === 1;
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  
  return (
    <Card className="bg-slate-900/80 border border-slate-700/50 shadow-lg shadow-black/20 rounded-2xl">
      <CardBody className="p-6 space-y-5">
        {/* 标题 + Tab 切换 */}
        <div className="mb-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold text-slate-100">
              {isFirstEpisode ? '创作你的故事' : `创作第${nextEpisode}集`}
            </h2>
            <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/30">
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  mode === 'ai'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                AI 生成
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  mode === 'manual'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PenLine className="w-3 h-3" />
                手动编写
              </button>
            </div>
          </div>
          <div className={`w-12 h-1 rounded-full ${mode === 'ai' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}></div>
          {mode === 'ai' && !isFirstEpisode && (
            <p className="text-xs text-slate-500 mt-2">
              AI 将基于前面的剧情继续创作，您的输入会影响剧情走向
            </p>
          )}
          {mode === 'manual' && (
            <p className="text-xs text-slate-500 mt-2">
              直接编写剧本内容，保存后即可使用
            </p>
          )}
        </div>

        {mode === 'ai' ? (
          <>
            <Input
              label={isFirstEpisode ? "剧本标题" : "本集标题"}
              placeholder={isFirstEpisode ? "输入你的创意标题" : `第${nextEpisode}集的标题（可选）`}
              value={title}
              onValueChange={onTitleChange}
              classNames={{
                input: "bg-transparent text-slate-100 font-semibold placeholder:text-slate-500",
                label: "text-slate-400 font-medium",
                inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 data-[focus=true]:border-blue-500 shadow-sm"
              }}
            />

            <Textarea
              label={isFirstEpisode ? "故事概述" : "故事走向"}
              placeholder={isFirstEpisode 
                ? "描述你的故事创意..." 
                : "描述你希望剧情如何发展，例如：主角发现了隐藏的真相..."
              }
              value={description}
              onValueChange={onDescriptionChange}
              minRows={4}
              classNames={{
                input: "bg-transparent text-slate-100 font-medium placeholder:text-slate-500",
                label: "text-slate-400 font-medium",
                inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 data-[focus=true]:border-blue-500 shadow-sm"
              }}
            />

            <div className="pt-2">
              <Select
                label="长度"
                selectedKeys={[length]}
                onChange={(e) => onLengthChange(e.target.value)}
                classNames={{
                  trigger: "bg-slate-800/60 border border-slate-600/50 text-slate-100 font-semibold hover:border-blue-500/50 shadow-sm",
                  label: "text-slate-400 font-medium",
                  value: "text-slate-100 font-semibold",
                  selectorIcon: "text-slate-400"
                }}
                popoverProps={{
                  classNames: {
                    content: "bg-slate-900 border border-slate-700/50 shadow-lg shadow-black/30"
                  }
                }}
              >
                <SelectItem key="短篇" className="text-slate-200 data-[hover=true]:bg-slate-800">短篇 (1-3分钟)</SelectItem>
                <SelectItem key="中篇" className="text-slate-200 data-[hover=true]:bg-slate-800">中篇 (3-5分钟)</SelectItem>
                <SelectItem key="长篇" className="text-slate-200 data-[hover=true]:bg-slate-800">长篇 (5-10分钟)</SelectItem>
              </Select>
            </div>

            <Button
              className="w-full text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-blue-500/20"
              size="lg"
              startContent={<FileText className="w-5 h-5" />}
              isLoading={loading}
              onPress={onGenerate}
            >
              {loading ? '生成中...' : `生成第${nextEpisode}集`}
            </Button>
          </>
        ) : (
          <ManualScriptForm
            nextEpisode={nextEpisode}
            loading={loading}
            onSave={onManualSave}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default ScriptGeneratorForm;
