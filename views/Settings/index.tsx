import React from 'react';
import { Settings as SettingsIcon, Moon, Sun, Eye, Check } from 'lucide-react';
import { useTheme, ThemeType } from '../../contexts/ThemeContext';

interface ThemePreset {
  key: ThemeType;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: {
    bg: string;
    nav: string;
    card: string;
    text: string;
    accent: string;
    border: string;
  };
}

const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'dark',
    name: '深色模式',
    description: '暗色背景搭配柔和文字，适合夜间使用，减轻视觉疲劳',
    icon: <Moon className="w-5 h-5" />,
    preview: {
      bg: '#0a0a0f',
      nav: '#0f172a',
      card: '#1e293b',
      text: '#e2e8f0',
      accent: '#6366f1',
      border: '#334155',
    },
  },
  {
    key: 'light',
    name: '浅色模式',
    description: '明亮背景搭配深色文字，适合日间使用，视觉清爽',
    icon: <Sun className="w-5 h-5" />,
    preview: {
      bg: '#f8fafc',
      nav: '#ffffff',
      card: '#f1f5f9',
      text: '#1e293b',
      accent: '#4f46e5',
      border: '#cbd5e1',
    },
  },
  {
    key: 'high-contrast',
    name: '高对比度',
    description: '纯黑背景搭配纯白文字，最高对比度，提升可读性',
    icon: <Eye className="w-5 h-5" />,
    preview: {
      bg: '#000000',
      nav: '#0a0a0a',
      card: '#111111',
      text: '#ffffff',
      accent: '#79b8ff',
      border: '#555555',
    },
  },
];

const ThemePreviewMini: React.FC<{ preset: ThemePreset; isActive: boolean }> = ({ preset, isActive }) => {
  const p = preset.preview;
  return (
    <div
      className="w-full aspect-[16/10] rounded-lg overflow-hidden relative border-2 transition-all"
      style={{
        backgroundColor: p.bg,
        borderColor: isActive ? p.accent : p.border,
        boxShadow: isActive ? `0 0 16px ${p.accent}44` : 'none',
      }}
    >
      {/* Mini nav */}
      <div
        className="h-[14%] flex items-center px-3 gap-1.5"
        style={{ backgroundColor: p.nav, borderBottom: `1px solid ${p.border}` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.accent }} />
        <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: p.text, opacity: 0.5 }} />
        <div className="ml-auto flex gap-1">
          <div className="w-6 h-1.5 rounded" style={{ backgroundColor: p.text, opacity: 0.2 }} />
          <div className="w-6 h-1.5 rounded" style={{ backgroundColor: p.text, opacity: 0.2 }} />
        </div>
      </div>
      {/* Mini body */}
      <div className="p-2 flex gap-1.5 h-[86%]">
        {/* Sidebar */}
        <div className="w-[25%] rounded-md p-1 space-y-1" style={{ backgroundColor: p.card }}>
          <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: p.text, opacity: 0.4 }} />
          <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: p.accent, opacity: 0.5 }} />
          <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: p.text, opacity: 0.2 }} />
        </div>
        {/* Main content */}
        <div className="flex-1 rounded-md p-1.5 space-y-1.5" style={{ backgroundColor: p.card }}>
          <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: p.text, opacity: 0.5 }} />
          <div className="flex gap-1">
            <div className="flex-1 h-6 rounded" style={{ backgroundColor: p.bg }} />
            <div className="flex-1 h-6 rounded" style={{ backgroundColor: p.bg }} />
          </div>
          <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: p.text, opacity: 0.2 }} />
          <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: p.text, opacity: 0.15 }} />
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: p.accent }}
        >
          <Check className="w-3 h-3" style={{ color: p.bg }} />
        </div>
      )}
    </div>
  );
};

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <SettingsIcon className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>自定义你的工作环境</p>
          </div>
        </div>

        {/* 开发界面选项 Section */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: `0 4px 24px var(--shadow-color)`,
          }}
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              界面风格
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              选择你偏好的 UI 风格，切换后即时生效
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isActive = theme === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => setTheme(preset.key)}
                  className="text-left rounded-xl p-4 transition-all group"
                  style={{
                    backgroundColor: isActive ? `${preset.preview.accent}15` : 'var(--bg-card-hover)',
                    border: `2px solid ${isActive ? preset.preview.accent : 'var(--border-subtle)'}`,
                    boxShadow: isActive ? `0 0 20px ${preset.preview.accent}22` : 'none',
                  }}
                >
                  {/* Preview */}
                  <ThemePreviewMini preset={preset} isActive={isActive} />

                  {/* Info */}
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="p-1.5 rounded-lg"
                      style={{
                        backgroundColor: isActive ? `${preset.preview.accent}25` : 'var(--bg-input)',
                        color: isActive ? preset.preview.accent : 'var(--text-secondary)',
                      }}
                    >
                      {preset.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {preset.name}
                        {isActive && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${preset.preview.accent}25`, color: preset.preview.accent }}
                          >
                            当前
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 未来扩展占位 */}
        <div
          className="rounded-2xl p-6 opacity-50"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px dashed var(--border-color)',
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            更多设置即将推出...
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            语言、快捷键、编辑器偏好等
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
