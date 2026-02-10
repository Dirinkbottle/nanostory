import React from 'react';

interface RawResponseDetailProps {
  data: any;
  defaultOpen?: boolean;
  label?: string;
}

const RawResponseDetail: React.FC<RawResponseDetailProps> = ({ data, defaultOpen = false, label = '查看原始响应' }) => {
  return (
    <details className="mt-2" open={defaultOpen}>
      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
        {label}
      </summary>
      <pre className="text-xs bg-slate-800/60 text-slate-200 p-2 rounded border border-slate-700/50 mt-1 overflow-auto max-h-48 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
};

export default RawResponseDetail;
