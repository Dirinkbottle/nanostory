import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { TestResult } from './types';
import RawResponseDetail from './RawResponseDetail';

interface TextModelResultProps {
  testResult: TestResult;
}

const TextModelResult: React.FC<TextModelResultProps> = ({ testResult }) => {
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {testResult.success 
            ? <CheckCircle className="w-4 h-4 text-green-600" /> 
            : <XCircle className="w-4 h-4 text-red-600" />
          }
          <span className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.success ? '请求成功' : '请求失败'}
          </span>
        </div>
        {testResult.elapsed && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {testResult.elapsed}ms
          </div>
        )}
      </div>

      {/* Text 模型：直接显示内容 */}
      {testResult.success && testResult.result?.content && (
        <div className="bg-white rounded-md p-3 border border-slate-200 mt-2">
          <p className="text-sm font-medium text-slate-600 mb-1">AI 回复：</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{testResult.result.content}</p>
          {testResult.result.tokens && (
            <p className="text-xs text-slate-400 mt-2">Tokens: {testResult.result.tokens}</p>
          )}
        </div>
      )}

      {/* 业务层错误：HTTP 成功但 content 为空，显示 _raw 中的错误 */}
      {testResult.success && !testResult.result?.content && testResult.result?._raw && (
        <div className="bg-amber-50 rounded-md p-3 border border-amber-200 mt-2">
          <p className="text-sm font-medium text-amber-700 mb-1">⚠️ 接口返回异常：</p>
          <p className="text-sm text-amber-800">
            {testResult.result._raw.msg || testResult.result._raw.message || testResult.result._raw.error?.message || '未返回有效内容'}
          </p>
          {testResult.result._raw.code !== undefined && (
            <p className="text-xs text-amber-500 mt-1">业务状态码: {testResult.result._raw.code}</p>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {!testResult.success && (
        <p className="text-sm text-red-600">{testResult.message || testResult.error}</p>
      )}

      <RawResponseDetail data={testResult.result} />
    </div>
  );
};

export default TextModelResult;
