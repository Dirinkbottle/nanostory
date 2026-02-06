import React from 'react';
import { Card, CardBody, Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { FileText } from 'lucide-react';

interface ScriptGeneratorFormProps {
  creationType: 'script' | 'comic';
  title: string;
  description: string;
  style: string;
  length: string;
  loading: boolean;
  nextEpisode: number;
  onCreationTypeChange: (type: 'script' | 'comic') => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onGenerate: () => void;
}

const ScriptGeneratorForm: React.FC<ScriptGeneratorFormProps> = ({
  creationType,
  title,
  description,
  style,
  length,
  loading,
  nextEpisode,
  onCreationTypeChange,
  onTitleChange,
  onDescriptionChange,
  onStyleChange,
  onLengthChange,
  onGenerate
}) => {
  // 根据是否是第一集显示不同的标签
  const isFirstEpisode = nextEpisode === 1;
  
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardBody className="p-6 space-y-5">
        <div className="mb-1">
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {isFirstEpisode ? '创作你的故事' : `创作第${nextEpisode}集`}
          </h2>
          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
          {!isFirstEpisode && (
            <p className="text-xs text-slate-500 mt-2">
              AI 将基于前面的剧情继续创作，您的输入会影响剧情走向
            </p>
          )}
        </div>


        <Input
          label={isFirstEpisode ? "剧本标题" : "本集标题"}
          placeholder={isFirstEpisode ? "输入你的创意标题" : `第${nextEpisode}集的标题（可选）`}
          value={title}
          onValueChange={onTitleChange}
          classNames={{
            input: "bg-white text-slate-800 font-semibold placeholder:text-slate-400",
            label: "text-slate-600 font-medium",
            inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm"
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
            input: "bg-white text-slate-800 font-medium placeholder:text-slate-400",
            label: "text-slate-600 font-medium",
            inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm"
          }}
        />

        <div className="grid grid-cols-2 gap-5 pt-2">
          <Select
            label="风格"
            selectedKeys={[style]}
            onChange={(e) => onStyleChange(e.target.value)}
            classNames={{
              trigger: "bg-white border border-slate-200 text-slate-800 font-semibold hover:border-blue-300 shadow-sm",
              label: "text-slate-600 font-medium",
              value: "text-slate-800 font-semibold",
              selectorIcon: "text-slate-500"
            }}
            popoverProps={{
              classNames: {
                content: "bg-white border border-slate-200 shadow-lg"
              }
            }}
          >
            <SelectItem key="电影感" value="电影感" className="text-slate-800 hover:bg-slate-100">电影感</SelectItem>
            <SelectItem key="科幻" value="科幻" className="text-slate-800 hover:bg-slate-100">科幻</SelectItem>
            <SelectItem key="悬疑" value="悬疑" className="text-slate-800 hover:bg-slate-100">悬疑</SelectItem>
            <SelectItem key="治愈" value="治愈" className="text-slate-800 hover:bg-slate-100">治愈</SelectItem>
          </Select>

          <Select
            label="长度"
            selectedKeys={[length]}
            onChange={(e) => onLengthChange(e.target.value)}
            classNames={{
              trigger: "bg-white border border-slate-200 text-slate-800 font-semibold hover:border-blue-300 shadow-sm",
              label: "text-slate-600 font-medium",
              value: "text-slate-800 font-semibold",
              selectorIcon: "text-slate-500"
            }}
            popoverProps={{
              classNames: {
                content: "bg-white border border-slate-200 shadow-lg"
              }
            }}
          >
            <SelectItem key="短篇" value="短篇" className="text-slate-800 hover:bg-slate-100">短篇 (1-3分钟)</SelectItem>
            <SelectItem key="中篇" value="中篇" className="text-slate-800 hover:bg-slate-100">中篇 (3-5分钟)</SelectItem>
            <SelectItem key="长篇" value="长篇" className="text-slate-800 hover:bg-slate-100">长篇 (5-10分钟)</SelectItem>
          </Select>
        </div>

        <Button
          className="w-full text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25"
          size="lg"
          startContent={<FileText className="w-5 h-5" />}
          isLoading={loading}
          onPress={onGenerate}
        >
          {loading ? '生成中...' : `生成第${nextEpisode}集`}
        </Button>
      </CardBody>
    </Card>
  );
};

export default ScriptGeneratorForm;
