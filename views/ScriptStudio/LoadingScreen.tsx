/**
 * 加载屏幕组件
 */

import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-slate-400">加载中...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
