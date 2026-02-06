import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { TestResult } from './types';
import RawResponseDetail from './RawResponseDetail';

interface TextModelResultProps {
  testResult: TestResult;
}

const TextModelResult: React.FC<TextModelResultProps> = ({ testResult }) => {
  // testResult 结构：{ result: { content, tokens, provider }, category, elapsed } 或 { success: false, message }
  const isSuccess = testResult.result && !testResult.success;
  const actualResult = testResult.result;

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSuccess 
            ? <CheckCircle className="w-4 h-4 text-green-600" /> 
            : <XCircle className="w-4 h-4 text-red-600" />
          }
          <span className={`text-sm font-medium ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {isSuccess ? '测试成功' : '测试失败'}
          </span>
        </div>
        {actualResult?.provider && (
          <div className="text-xs text-slate-500">
            Provider: {actualResult.provider}
          </div>
        )}
      </div>

      {/* Text 模型：显示生成的剧本内容 */}
      {isSuccess && actualResult?.content && (
        <div className="bg-white rounded-md p-3 border border-slate-200 mt-2">
          <p className="text-sm font-medium text-slate-600 mb-2">生成内容：</p>
          <div className="text-sm text-slate-800 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {actualResult.content}
          </div>
          {actualResult.tokens && (
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200">
              Tokens: {actualResult.tokens}
            </p>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {!isSuccess && testResult.message && (
        <p className="text-sm text-red-600">{testResult.message}</p>
      )}

      <RawResponseDetail data={actualResult} />
    </div>
  );
};

export default TextModelResult;
