import React, { useState, useRef, useEffect } from 'react';
import { Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from '@heroui/react';
import { Play } from 'lucide-react';
import { getAuthToken } from '../../../../services/auth';
import { AIModel } from '../types';
import { TestResult, QueryResult } from './types';
import TextModelResult from './TextModelResult';
import AsyncModelResult from './AsyncModelResult';

interface ModelTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: AIModel | null;
}

const DEFAULT_PARAMS: Record<string, any> = {
  TEXT: {
    messages: [{ role: "user", content: "你好，请简短介绍一下你自己" }],
    maxTokens: 200,
    temperature: 0.7
  },
  IMAGE: {
    prompt: "A cute cat sitting on a windowsill, watercolor style",
    width: 512,
    height: 512
  },
  VIDEO: {
    prompt: "A cat walking slowly",
    duration: 5,
    aspectRatio: "16:9"
  }
};

const ModelTestModal: React.FC<ModelTestModalProps> = ({ isOpen, onClose, model }) => {
  const [paramsInput, setParamsInput] = useState('{}');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 异步轮询相关
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 切换模型时重置
  useEffect(() => {
    if (model) {
      setTestResult(null);
      setQueryResult(null);
      stopPolling();
      const defaults = DEFAULT_PARAMS[model.category] || {};
      setParamsInput(JSON.stringify(defaults, null, 2));
    }
  }, [model?.id]);

  useEffect(() => {
    return () => { stopPolling(); };
  }, []);

  const stopPolling = () => {
    setPolling(false);
    setPollCount(0);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startPolling = (modelId: number, submitResult: any) => {
    setPolling(true);
    setPollCount(0);
    setQueryResult(null);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const pollFn = async () => {
      setPollCount(prev => prev + 1);
      try {
        const token = getAuthToken();
        const res = await fetch(`/api/admin/ai-models/${modelId}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ submitResult })
        });
        const data: QueryResult = await res.json();
        setQueryResult(data);

        const raw = data.raw || {};
        const status = raw.status || raw.data?.task_status || raw.data?.status || data.result?.status;
        const s = String(status).toLowerCase();
        if (['succeed', 'completed', 'success', 'done', 'failed', 'error'].includes(s)) {
          setPolling(false);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (err) {
        console.error('轮询失败:', err);
      }
    };

    setTimeout(pollFn, 1000);
    pollTimerRef.current = setInterval(pollFn, 1000);
  };

  const handleTest = async () => {
    if (!model) return;
    let params: any;
    try {
      params = JSON.parse(paramsInput);
    } catch {
      alert('参数 JSON 格式错误');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setQueryResult(null);
    stopPolling();

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/ai-models/${model.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ params })
      });
      const data: TestResult = await res.json();
      setTestResult(data);

      if (data.success && data.hasQueryConfig && data.result) {
        startPolling(model.id, data.result);
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || '请求失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  if (!model) return null;

  const isAsync = model.category !== 'TEXT';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <Play className="w-5 h-5 text-green-600" />
          <span>调试模型：{model.name}</span>
          <Chip size="sm" className="bg-blue-100 text-blue-700">{model.category}</Chip>
          <Chip size="sm" className="bg-slate-100 text-slate-600">{model.provider}</Chip>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* 参数输入 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              调用参数 (JSON)
            </label>
            <Textarea
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              minRows={6}
              maxRows={12}
              classNames={{
                input: "font-mono text-xs",
                inputWrapper: "bg-slate-50 border-2 border-slate-200"
              }}
              placeholder='{"prompt": "...", "messages": [...]}'
            />
          </div>

          {/* 结果展示：按模型分类分发 */}
          {testResult && !isAsync && (
            <TextModelResult testResult={testResult} />
          )}

          {testResult && isAsync && (
            <AsyncModelResult
              category={model.category}
              testResult={testResult}
              polling={polling}
              pollCount={pollCount}
              queryResult={queryResult}
              onStopPolling={stopPolling}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" className="bg-slate-100 text-slate-700" onPress={handleClose}>
            关闭
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onPress={handleTest}
            isLoading={testing}
            startContent={!testing && <Play className="w-4 h-4" />}
            isDisabled={polling}
          >
            {testing ? '调用中...' : '发送测试'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModelTestModal;
