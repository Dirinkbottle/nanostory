import React, { Suspense, useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { X, Loader2, HelpCircle } from 'lucide-react';
import { Tooltip } from '@heroui/react';
import SketchToolbar from './SketchToolbar';
import { useSketchEditor } from './useSketchEditor';
import { useToast } from '../../../contexts/ToastContext';
import { useTheme } from '../../../contexts/ThemeContext';

// 动态导入 Excalidraw 组件（避免增加首屏包体积）
const Excalidraw = React.lazy(() =>
  import('@excalidraw/excalidraw').then((module) => ({
    default: module.Excalidraw
  }))
);

export interface SketchEditorProps {
  storyboardId: number;
  initialData?: unknown;
  backgroundImage?: string;
  onSave: (sketchUrl: string, sketchData: unknown) => void;
  onClose: () => void;
}

// Excalidraw API 类型定义 - 使用 any 类型避免与库的具体类型耦合
interface ExcalidrawAPI {
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
  updateScene: (scene: { elements?: readonly unknown[]; appState?: Record<string, unknown> }) => void;
  resetScene: () => void;
}

// 将 Excalidraw 原生 API 转换为简化版本
const wrapExcalidrawAPI = (nativeApi: any): ExcalidrawAPI => ({
  getSceneElements: () => nativeApi.getSceneElements(),
  getAppState: () => nativeApi.getAppState(),
  getFiles: () => nativeApi.getFiles(),
  updateScene: (scene) => nativeApi.updateScene(scene),
  resetScene: () => nativeApi.resetScene()
});

// 加载指示器组件
const LoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--bg-app)]">
    <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
    <p className="text-sm text-[var(--text-muted)]">正在加载画布组件...</p>
  </div>
);

const SketchEditor: React.FC<SketchEditorProps> = ({
  storyboardId,
  initialData,
  backgroundImage,
  onSave,
  onClose
}) => {
  const excalidrawRef = useRef<ExcalidrawAPI | null>(null);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false);
  
  // 根据当前主题设置 Excalidraw 主题
  const excalidrawTheme = useMemo(() => {
    return theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  const {
    sketchType,
    controlStrength,
    showBackground,
    backgroundType,
    saving,
    setSketchType,
    setControlStrength,
    toggleBackground,
    setBackgroundType,
    setSaving,
    exportAndUpload,
    saveSketchData
  } = useSketchEditor();

  // 处理 Excalidraw 初始化完成
  const handleExcalidrawMount = useCallback((nativeApi: any) => {
    const api = wrapExcalidrawAPI(nativeApi);
    excalidrawRef.current = api;
    setIsExcalidrawReady(true);

    // 如果有初始数据，恢复到画布
    if (initialData && typeof initialData === 'object') {
      const data = initialData as { elements?: readonly unknown[]; appState?: Record<string, unknown> };
      if (data.elements) {
        api.updateScene({
          elements: data.elements,
          appState: data.appState
        });
      }
    }
  }, [initialData]);

  // 保存草图
  const handleSave = useCallback(async () => {
    if (!excalidrawRef.current) {
      showToast('画布组件未就绪', 'error');
      return;
    }

    setSaving(true);

    try {
      // 获取画布数据
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      const files = excalidrawRef.current.getFiles();

      // 动态导入 exportToBlob 函数
      const { exportToBlob: exportToBlobFn } = await import('@excalidraw/excalidraw');

      // 导出为 PNG Blob
      const blob = await exportToBlobFn({
        elements: elements as Parameters<typeof exportToBlobFn>[0]['elements'],
        appState: {
          ...(appState as object),
          exportBackground: backgroundType === 'white',
          viewBackgroundColor: backgroundType === 'white' ? '#ffffff' : 'transparent'
        } as Parameters<typeof exportToBlobFn>[0]['appState'],
        files: files as Parameters<typeof exportToBlobFn>[0]['files'],
        mimeType: 'image/png',
        quality: 1
      });

      // 上传 PNG 到服务器
      const sketchUrl = await exportAndUpload(blob, storyboardId, sketchType, controlStrength);

      // 保存矢量数据（用于后续回显编辑）
      const sketchData = {
        elements,
        appState: {
          viewBackgroundColor: backgroundType === 'white' ? '#ffffff' : 'transparent'
        },
        files
      };
      await saveSketchData(storyboardId, sketchData);

      showToast('草图保存成功', 'success');
      onSave(sketchUrl, sketchData);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败';
      showToast(message, 'error');
      console.error('[SketchEditor] 保存失败:', error);
    } finally {
      setSaving(false);
    }
  }, [
    storyboardId,
    sketchType,
    controlStrength,
    backgroundType,
    exportAndUpload,
    saveSketchData,
    onSave,
    setSaving,
    showToast
  ]);

  // 清空画布
  const handleClear = useCallback(() => {
    if (!excalidrawRef.current) return;
    
    // 重置画布场景
    excalidrawRef.current.resetScene();
    showToast('画布已清空', 'success');
  }, [showToast]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-app)]">
      {/* 顶部工具栏 */}
      <SketchToolbar
        sketchType={sketchType}
        controlStrength={controlStrength}
        showBackground={showBackground}
        backgroundType={backgroundType}
        onSketchTypeChange={setSketchType}
        onControlStrengthChange={setControlStrength}
        onToggleBackground={toggleBackground}
        onBackgroundTypeChange={setBackgroundType}
        onSave={handleSave}
        onCancel={onClose}
        onClear={handleClear}
        saving={saving}
        hasBackgroundImage={!!backgroundImage}
      />

      {/* 画布区域 */}
      <div className="flex-1 relative">
        {/* 背景图层（底图参考） */}
        {backgroundImage && showBackground && (
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-30"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}

        {/* Excalidraw 画布 */}
        <div className="absolute inset-0 z-10">
          <Suspense fallback={<LoadingFallback />}>
            <Excalidraw
              excalidrawAPI={handleExcalidrawMount}
              initialData={{
                appState: {
                  viewBackgroundColor: backgroundType === 'white' ? '#ffffff' : 'transparent',
                  currentItemStrokeColor: excalidrawTheme === 'light' ? '#1e1e1e' : '#ffffff',
                  currentItemBackgroundColor: 'transparent',
                  currentItemFillStyle: 'solid',
                  currentItemStrokeWidth: 2,
                  currentItemRoughness: 1, // 手绘风格
                  theme: excalidrawTheme,
                  gridSize: undefined
                }
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  export: false,
                  saveAsImage: false
                }
              }}
              langCode="zh-CN"
              theme={excalidrawTheme}
            />
          </Suspense>
        </div>

        {/* 关闭按钮（移动端可见） */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors sm:hidden"
          disabled={saving}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 帮助提示 */}
        <div className="absolute bottom-4 left-4 z-20">
          <Tooltip 
            content={
              <div className="text-xs space-y-1 p-1">
                <p><strong>快捷键提示：</strong></p>
                <p>• V - 选择工具</p>
                <p>• P - 铅笔工具</p>
                <p>• L - 线条工具</p>
                <p>• R - 矩形工具</p>
                <p>• O - 椭圆工具</p>
                <p>• E - 橡皮擦</p>
                <p>• Ctrl+Z - 撤销</p>
                <p>• ESC - 退出编辑器</p>
              </div>
            }
            placement="top"
            classNames={{ content: "bg-[var(--bg-card)] border border-[var(--border-color)]" }}
          >
            <button className="p-2 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default SketchEditor;

// 导出子组件，方便外部单独使用
export { default as SketchTypeSelector } from './SketchTypeSelector';
export { default as SketchToolbar } from './SketchToolbar';
export { default as SketchUploader } from './SketchUploader';
export { useSketchEditor } from './useSketchEditor';
export type { SketchType, BackgroundType } from './useSketchEditor';
