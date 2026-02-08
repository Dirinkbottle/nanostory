import React, { useState } from 'react';
import { Button, Input, Textarea } from '@heroui/react';
import { PenLine } from 'lucide-react';

interface ManualScriptFormProps {
  nextEpisode: number;
  loading: boolean;
  onSave: (title: string, content: string) => void;
}

const ManualScriptForm: React.FC<ManualScriptFormProps> = ({
  nextEpisode,
  loading,
  onSave
}) => {
  const isFirstEpisode = nextEpisode === 1;
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  return (
    <>
      <Input
        label={isFirstEpisode ? "剧本标题" : "本集标题"}
        placeholder={isFirstEpisode ? "输入剧本标题" : `第${nextEpisode}集的标题`}
        value={manualTitle}
        onValueChange={setManualTitle}
        classNames={{
          input: "bg-white text-slate-800 font-semibold placeholder:text-slate-400",
          label: "text-slate-600 font-medium",
          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-emerald-500 shadow-sm"
        }}
      />

      <Textarea
        label="剧本内容"
        placeholder={`在这里编写你的剧本内容...\n\n例如：\n## 场景1：清晨的咖啡馆\n\n（镜头缓缓推入，暖色调灯光映照在木质桌面上）\n\n**主角**：（独白）每天早上，我都会来这家咖啡馆...`}
        value={manualContent}
        onValueChange={setManualContent}
        minRows={10}
        classNames={{
          input: "bg-white text-slate-800 font-medium placeholder:text-slate-400",
          label: "text-slate-600 font-medium",
          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-emerald-500 shadow-sm"
        }}
      />

      <Button
        className="w-full text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25"
        size="lg"
        startContent={<PenLine className="w-5 h-5" />}
        isLoading={loading}
        isDisabled={!manualContent.trim()}
        onPress={() => onSave(manualTitle, manualContent)}
      >
        {loading ? '保存中...' : `保存第${nextEpisode}集`}
      </Button>
    </>
  );
};

export default ManualScriptForm;
