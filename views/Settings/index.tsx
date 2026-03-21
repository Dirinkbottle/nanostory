import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Moon, Sun, Eye, Check, Send, 
  Palette, MessageSquare, Info, ChevronRight, Sparkles
} from 'lucide-react';
import { useTheme, ThemeType } from '../../contexts/ThemeContext';
import { getAuthToken } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

const typeLabels: Record<FeedbackType, string> = {
  bug: 'Bug反馈',
  feature: '功能建议',
  improvement: '体验优化',
  other: '其他反馈',
};

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

// 设置分组配置
interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SETTING_SECTIONS: SettingSection[] = [
  { id: 'appearance', title: '外观', description: '界面主题与风格', icon: <Palette className="w-4 h-4" /> },
  { id: 'feedback', title: '反馈', description: '帮助我们改进', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'about', title: '关于', description: '版本与信息', icon: <Info className="w-4 h-4" /> },
];

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('appearance');

  // 反馈功能状态
  const [type, setType] = useState<FeedbackType>('feature');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type, content: content.trim(), contact: contact.trim() || undefined })
      });
      if (res.ok) {
        showToast('感谢您的反馈！', 'success');
        setContent('');
        setContact('');
        setType('feature');
      } else {
        showToast('提交失败，请稍后重试', 'error');
      }
    } catch {
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染外观设置区域
  const renderAppearanceSection = () => (
    <div className="space-y-6">
      {/* 主题选择 */}
      <div>
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          选择主题
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = theme === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => {
                  setTheme(preset.key);
                  showToast(`已切换到${preset.name}`, 'success');
                }}
                className="group relative rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: isActive ? `${preset.preview.accent}12` : 'var(--bg-card-hover)',
                  border: `2px solid ${isActive ? preset.preview.accent : 'transparent'}`,
                  boxShadow: isActive ? `0 0 24px ${preset.preview.accent}20` : 'none',
                }}
              >
                {/* 预览图 */}
                <ThemePreviewMini preset={preset} isActive={isActive} />
                
                {/* 信息 */}
                <div className="mt-4 flex items-start gap-3">
                  <div 
                    className="p-2 rounded-xl shrink-0 transition-colors"
                    style={{ 
                      backgroundColor: isActive ? `${preset.preview.accent}20` : 'var(--bg-input)',
                      color: isActive ? preset.preview.accent : 'var(--text-secondary)'
                    }}
                  >
                    {preset.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {preset.name}
                      </span>
                      {isActive && (
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${preset.preview.accent}25`, color: preset.preview.accent }}
                        >
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // 渲染反馈区域
  const renderFeedbackSection = () => (
    <div className="space-y-6">
      {/* 反馈类型 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          反馈类型
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(typeLabels) as FeedbackType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="p-3 rounded-xl text-sm font-medium transition-all text-center"
              style={{
                backgroundColor: type === t ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: type === t ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${type === t ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              }}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 反馈内容 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          详细描述
        </h3>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="请详细描述您遇到的问题或建议..."
          rows={5}
          maxLength={5000}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none transition-all"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            描述越详细，我们能更好地帮助您
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {content.length}/5000
          </span>
        </div>
      </div>

      {/* 联系方式 */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          联系方式
          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(可选)</span>
        </h3>
        <input
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="邮箱或其他联系方式"
          className="w-full rounded-xl px-4 py-3 text-sm transition-all"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || submitting}
        className="w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
        }}
      >
        <Send className="w-4 h-4" />
        {submitting ? '提交中...' : '提交反馈'}
      </button>
    </div>
  );

  // 渲染关于区域
  const renderAboutSection = () => (
    <div className="space-y-6">
      {/* 应用信息 */}
      <div 
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            🥟
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              饺子动漫
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              AI Video Studio
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>版本</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>1.0.0</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>技术栈</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>React + Vite + Express</span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI 引擎</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>ComfyUI + ControlNet</span>
          </div>
        </div>
      </div>

      {/* 即将推出 */}
      <div 
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-input)', border: '1px dashed var(--border-color)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>即将推出</h3>
        </div>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            多语言支持
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            自定义快捷键
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            编辑器偏好设置
          </li>
        </ul>
      </div>
    </div>
  );

  // 渲染当前激活的区域
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'appearance': return renderAppearanceSection();
      case 'feedback': return renderFeedbackSection();
      case 'about': return renderAboutSection();
      default: return renderAppearanceSection();
    }
  };

  const currentSection = SETTING_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg-body)', color: 'var(--text-primary)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>设置</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>自定义您的工作环境</p>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧导航 */}
          <div className="lg:w-56 shrink-0">
            <div 
              className="rounded-2xl p-2 lg:sticky lg:top-6"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <nav className="flex lg:flex-col gap-1">
                {SETTING_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all w-full"
                    style={{
                      backgroundColor: activeSection === section.id ? 'var(--accent-primary)' : 'transparent',
                      color: activeSection === section.id ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <span className={activeSection === section.id ? 'opacity-100' : 'opacity-60'}>
                      {section.icon}
                    </span>
                    <div className="hidden lg:block">
                      <div className="text-sm font-medium">{section.title}</div>
                      <div className="text-xs opacity-70">{section.description}</div>
                    </div>
                    <span className="lg:hidden text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 min-w-0">
            <div 
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              {/* 区域标题 */}
              <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {currentSection?.title}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {currentSection?.description}
                </p>
              </div>
              
              {/* 区域内容 */}
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
