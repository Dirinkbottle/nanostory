import React, { useState, useEffect } from 'react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from '@heroui/react';
import { Play, AlertCircle } from 'lucide-react';
import { AIModel } from '../types';
import DebugPanel from './DebugPanel';
import { useWorkflow, startWorkflow } from '../../../../hooks/useWorkflow';

interface ModelTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: AIModel | null;
}

const DEFAULT_PARAMS: Record<string, any> = {
  TEXT: {
    title: "测试剧本",
    description: "一个简短的测试故事",
    style: "现代",
    length: "短篇"
  },
  IMAGE: {
    prompt: "A cute cat sitting on a windowsill, watercolor style",
    width: 1024,
    height: 1024
  },
  VIDEO: {
    prompt: "A cat walking slowly",
    duration: 5,
    image_url: null
  }
};

const ModelTestModal: React.FC<ModelTestModalProps> = ({ isOpen, onClose, model }) => {
  const [paramsInput, setParamsInput] = useState('{}');
  const [jobId, setJobId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [hasQueryConfig, setHasQueryConfig] = useState(false);

  // 使用工作流 Hook
  const { job, isRunning, isCompleted, isFailed } = useWorkflow(jobId, {
    onCompleted: (completedJob) => {
      const task = completedJob.tasks?.[0];
      if (task?.result_data) {
        // 根据任务类型适配结果数据
        const resultData = task.result_data;
        setTestResult({
          result: resultData,
          category: model?.category,
          elapsed: null // 工作流没有单独的 elapsed 字段
        });
      }
    },
    onFailed: (failedJob) => {
      setTestResult({
        success: false,
        message: failedJob.error_message || '测试失败'
      });
    }
  });

  // 切换模型时重置
  useEffect(() => {
    if (model) {
      setTestResult(null);
      setJobId(null);
      setHasQueryConfig(false);
      const defaults = DEFAULT_PARAMS[model.category] || {};
      setParamsInput(JSON.stringify(defaults, null, 2));
    }
  }, [model?.id]);

  const handleTest = async () => {
    if (!model) return;
    let params: any;
    try {
      params = JSON.parse(paramsInput);
    } catch {
      alert('参数 JSON 格式错误');
      return;
    }

    setTestResult(null);
    setJobId(null);

    try {
      // 根据模型类别选择对应的工作流
      let workflowType: string;
      let workflowParams: any;

      switch (model.category) {
        case 'TEXT':
          workflowType = 'script_only';
          workflowParams = {
            title: params.title || '测试剧本',
            description: params.description || '测试描述',
            style: params.style || '现代',
            length: params.length || '短篇',
            modelName: model.name
          };
          break;

        case 'IMAGE':
          workflowType = 'frame_generation';
          workflowParams = {
            prompt: params.prompt || '测试图片',
            width: params.width || 1024,
            height: params.height || 1024,
            modelName: model.name
          };
          break;

        case 'VIDEO':
          workflowType = 'scene_video';
          workflowParams = {
            prompt: params.prompt || '测试视频',
            imageUrl: params.imageUrl || params.image_url || null,
            startFrame: params.startFrame || null,
            endFrame: params.endFrame || null,
            duration: params.duration || 5,
            modelName: model.name
          };
          break;

        default:
          throw new Error(`不支持的模型类别: ${model.category}`);
      }

      // 使用对应的工作流（管理后台测试，projectId 传 null）
      const result = await startWorkflow(workflowType, null as any, workflowParams);
      setJobId(result.jobId);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || '启动测试失败' });
    }
  };

  const handleClose = () => {
    setJobId(null);
    onClose();
  };

  if (!model) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="full" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <Play className="w-5 h-5 text-green-600" />
          <span>调试模型：{model.name}</span>
          <Chip size="sm" className="bg-blue-100 text-blue-700">{model.category}</Chip>
          <Chip size="sm" className="bg-slate-100 text-slate-600">{model.provider}</Chip>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="flex h-[calc(100vh-200px)]">
            {/* 左侧：参数输入和结果预览 */}
            <div className="w-1/2 border-r border-slate-200 p-6 space-y-4 overflow-y-auto">
              {/* 参数输入 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  调用参数 (JSON)
                </label>
                <Textarea
                  value={paramsInput}
                  onChange={(e) => setParamsInput(e.target.value)}
                  minRows={8}
                  maxRows={15}
                  classNames={{
                    input: "font-mono text-xs",
                    inputWrapper: "bg-slate-50 border-2 border-slate-200"
                  }}
                  placeholder='{"prompt": "...", "title": "..."}'
                />
              </div>

              {/* 工作流执行状态 */}
              {isRunning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">测试中...</span>
                  </div>
                  {job && (
                    <div className="mt-2 text-xs text-slate-600">
                      进度: {job.current_step_index + 1}/{job.total_steps}
                    </div>
                  )}
                </div>
              )}

              {/* 结果预览 */}
              {testResult && testResult.result && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">结果预览</h3>
                  
                  {/* TEXT 模型：显示文本内容 */}
                  {model.category === 'TEXT' && testResult.result.content && (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200 max-h-96 overflow-auto">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {testResult.result.content}
                      </p>
                    </div>
                  )}

                  {/* IMAGE 模型：显示图片 */}
                  {model.category === 'IMAGE' && testResult.result.image_url && (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <img 
                        src={testResult.result.image_url} 
                        alt="生成结果" 
                        className="max-w-full rounded" 
                      />
                    </div>
                  )}

                  {/* VIDEO 模型：显示视频 */}
                  {model.category === 'VIDEO' && testResult.result.video_url && (
                    <div className="bg-slate-50 rounded p-3 border border-slate-200">
                      <video 
                        src={testResult.result.video_url} 
                        controls 
                        className="max-w-full rounded" 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：详细调试信息 */}
            <div className="w-1/2 bg-slate-50">
              <DebugPanel testResult={testResult} model={model} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" className="bg-slate-100 text-slate-700" onPress={handleClose}>
            关闭
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onPress={handleTest}
            isLoading={isRunning}
            startContent={!isRunning && <Play className="w-4 h-4" />}
            isDisabled={isRunning}
          >
            {isRunning ? '测试中...' : '发送测试'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModelTestModal;
