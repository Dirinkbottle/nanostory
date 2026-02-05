import React from 'react';
import { Button, Spinner, Image } from '@heroui/react';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { TestResult, QueryResult, extractMediaUrl } from './types';
import RawResponseDetail from './RawResponseDetail';

interface AsyncModelResultProps {
  category: string;
  testResult: TestResult;
  polling: boolean;
  pollCount: number;
  queryResult: QueryResult | null;
  onStopPolling: () => void;
}

const AsyncModelResult: React.FC<AsyncModelResultProps> = ({
  category,
  testResult,
  polling,
  pollCount,
  queryResult,
  onStopPolling
}) => {
  const mediaUrl = extractMediaUrl(queryResult?.result || queryResult?.raw || testResult?.result);

  return (
    <div className="space-y-4">
      {/* 提交结果 */}
      <div className={`rounded-lg border p-4 space-y-2 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {testResult.success 
              ? <CheckCircle className="w-4 h-4 text-green-600" /> 
              : <XCircle className="w-4 h-4 text-red-600" />
            }
            <span className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.success ? '任务已提交' : '提交失败'}
            </span>
          </div>
          {testResult.elapsed && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {testResult.elapsed}ms
            </div>
          )}
        </div>

        {/* 显示提交返回的映射字段（用于查询接口的占位符参数） */}
        {testResult.success && testResult.result && (() => {
          const { _raw, _model, ...mapped } = testResult.result;
          const entries = Object.entries(mapped).filter(([, v]) => v != null);
          if (entries.length === 0) return null;
          return (
            <div className="bg-white rounded-md p-3 border border-slate-200 mt-2">
              <p className="text-xs text-slate-500 mb-1">映射字段（自动传入查询接口）：</p>
              {entries.map(([key, value]) => (
                <p key={key} className="text-xs text-slate-600">
                  <span className="font-medium">{key}</span>: <code className="bg-slate-100 px-1 rounded">{String(value)}</code>
                </p>
              ))}
            </div>
          );
        })()}

        {/* 错误信息 */}
        {!testResult.success && (
          <p className="text-sm text-red-600">{testResult.message || testResult.error}</p>
        )}

        <RawResponseDetail data={testResult.result} />
      </div>

      {/* 轮询状态 */}
      {(polling || queryResult) && (
        <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {polling ? (
                <>
                  <Spinner size="sm" color="primary" />
                  <span className="text-sm font-medium text-blue-700">
                    查询中... (第 {pollCount} 次)
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">查询完成</span>
                </>
              )}
            </div>
            {polling && (
              <Button size="sm" variant="flat" className="bg-red-100 text-red-600" onPress={onStopPolling}>
                停止轮询
              </Button>
            )}
          </div>

          {/* 媒体预览 */}
          {mediaUrl && (
            <div className="bg-white rounded-md p-3 border border-slate-200 mt-2">
              <p className="text-xs text-slate-500 mb-2">生成结果预览：</p>
              {category === 'VIDEO' ? (
                <video src={mediaUrl} controls className="max-w-full max-h-64 rounded" />
              ) : (
                <Image src={mediaUrl} alt="生成结果" className="max-w-full max-h-64 rounded" />
              )}
              <p className="text-xs text-slate-400 mt-1 break-all">{mediaUrl}</p>
            </div>
          )}

          {queryResult && (
            <RawResponseDetail data={queryResult} defaultOpen={!polling} label="查看查询响应" />
          )}
        </div>
      )}
    </div>
  );
};

export default AsyncModelResult;
