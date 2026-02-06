/**
 * 加载屏幕组件
 */

import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-slate-600">加载中...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
