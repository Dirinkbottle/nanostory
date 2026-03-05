import React from 'react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Progress } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import AIModelSelector from '../../../components/AIModelSelector';
import { TextModel } from './types';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importMode: 'ai' | 'manual';
  setImportMode: (mode: 'ai' | 'manual') => void;
  textModels: TextModel[];
  selectedTextModel: string;
  onModelChange: (model: string) => void;
  apiDoc: string;
  onApiDocChange: (doc: string) => void;
  jsonConfig: string;
  onJsonConfigChange: (config: string) => void;
  parsing: boolean;
  isParseRunning: boolean;
  parseProgress: number;
  parseJob: any;
  onSmartParse: () => void;
  onManualImport: () => void;
}

const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  importMode,
  setImportMode,
  textModels,
  selectedTextModel,
  onModelChange,
  apiDoc,
  onApiDocChange,
  jsonConfig,
  onJsonConfigChange,
  parsing,
  isParseRunning,
  parseProgress,
  parseJob,
  onSmartParse,
  onManualImport
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" classNames={{ base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50" }}>
      <ModalContent>
        <ModalHeader className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          智能添加模型
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-sm text-slate-300">
              💡 <strong>使用提示：</strong>
              {importMode === 'ai' ? '将API文档粘贴到下方，AI会自动解析并填充配置信息' : '直接粘贴完整的 JSON 配置，系统会自动清洗并导入'}
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              className={importMode === 'ai' ? 'bg-purple-500 text-white' : 'bg-slate-800/60 text-slate-400'}
              onPress={() => setImportMode('ai')}
            >
              🤖 AI 生成
            </Button>
            <Button
              size="sm"
              className={importMode === 'manual' ? 'bg-purple-500 text-white' : 'bg-slate-800/60 text-slate-400'}
              onPress={() => setImportMode('manual')}
            >
              📋 手动导入
            </Button>
          </div>

          {importMode === 'ai' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">选择解析模型</label>
                <AIModelSelector
                  models={textModels.map(m => ({ ...m, type: 'TEXT' }))}
                  selectedModel={selectedTextModel}
                  onModelChange={onModelChange}
                  filterType="TEXT"
                  placeholder="选择一个文本模型"
                  className="border-2 border-slate-600/50 hover:border-blue-500/50"
                />
              </div>

              <Textarea
                label="API 文档"
                placeholder="粘贴完整的API文档，包括请求地址、请求方法、Headers、Body格式、响应格式等..."
                value={apiDoc}
                onChange={(e) => onApiDocChange(e.target.value)}
                minRows={10}
                classNames={{
                  input: "font-mono text-sm",
                  inputWrapper: "bg-slate-800/60 border-2 border-slate-600/50"
                }}
                isRequired
              />
            </>
          )}

          {importMode === 'manual' && (
            <Textarea
              label="JSON 配置"
              placeholder='粘贴完整的 JSON 配置，例如：
{
  "name": "Gemini 3.0 Pro",
  "provider": "wuyinkeji",
  "category": "TEXT",
  "url_template": "https://api.example.com/chat",
  ...
}'
              value={jsonConfig}
              onChange={(e) => onJsonConfigChange(e.target.value)}
              minRows={15}
              classNames={{
                input: "font-mono text-xs",
                inputWrapper: "bg-slate-800/60 border-2 border-slate-600/50"
              }}
              isRequired
            />
          )}

          {/* 工作流进度指示器 */}
          {isParseRunning && parseJob && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-400">
                  AI 解析中...
                </span>
                <span className="text-xs text-blue-500">
                  {parseProgress}%
                </span>
              </div>
              <Progress
                size="sm"
                value={parseProgress}
                color="secondary"
                className="w-full"
                aria-label="解析进度"
              />
            </div>
          )}

        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            className="bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            onPress={onClose}
            isDisabled={parsing}
          >
            取消
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
            onPress={importMode === 'ai' ? onSmartParse : onManualImport}
            isLoading={parsing}
            startContent={!parsing && <Sparkles className="w-4 h-4" />}
          >
            {parsing ? '解析中...' : (importMode === 'ai' ? '开始解析' : '导入配置')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SmartImportModal;
