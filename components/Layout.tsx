import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Film, User, Package, LogOut, FolderOpen, Settings, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { motion } from 'framer-motion';
import { getAuthToken, logout } from '../services/auth';
import { useKeyboardShortcuts, ShortcutConfig, GLOBAL_SHORTCUTS_CONFIG } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

interface LayoutProps {
  children: React.ReactNode;
}

// 导航项配置
const navItems = [
  { path: '/', icon: Film, label: '创作工作台' },
  { path: '/assets', icon: Package, label: '资产管理' },
  { path: '/projects', icon: FolderOpen, label: '我的工程' },
  { path: '/settings', icon: Settings, label: '设置' },
];

// 页面标题映射
const pageTitles: Record<string, string> = {
  '/': '创作工作台',
  '/assets': '资产管理',
  '/projects': '我的工程',
  '/settings': '设置',
  '/user-center': '个人中心',
};

// 响应式断点 Hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = location.pathname === '/auth';
  const isLoggedIn = !!getAuthToken();
  const [isConnected, setIsConnected] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // 响应式断点
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1280px)');

  // 模拟连接状态检测
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };
    
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // 全局快捷键
  const globalShortcuts = useMemo<ShortcutConfig[]>(() => [
    {
      ...GLOBAL_SHORTCUTS_CONFIG.NAVIGATE_WORKSPACE,
      action: () => navigate('/'),
    },
    {
      ...GLOBAL_SHORTCUTS_CONFIG.NAVIGATE_ASSETS,
      action: () => navigate('/assets'),
    },
    {
      ...GLOBAL_SHORTCUTS_CONFIG.NAVIGATE_PROJECTS,
      action: () => navigate('/projects'),
    },
    {
      ...GLOBAL_SHORTCUTS_CONFIG.NAVIGATE_SETTINGS,
      action: () => navigate('/settings'),
    },
    {
      ...GLOBAL_SHORTCUTS_CONFIG.SHOW_HELP,
      action: () => setShowShortcutsHelp(true),
    },
  ], [navigate]);

  // 注册全局快捷键（非登录页面生效）
  useKeyboardShortcuts(globalShortcuts, !isAuth);

  const handleAccountClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate('/auth');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    window.location.reload();
  };

  const currentPageTitle = pageTitles[location.pathname] || '饺子动漫';

  // Auth 页面不显示导航
  if (isAuth) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
      {/* 左侧侧边栏 - 小屏隐藏 */}
      <aside className={`pro-sidebar flex flex-col bg-[var(--bg-nav)] border-r border-[var(--border-color)] hide-on-mobile ${isTablet ? 'w-12' : 'w-14'}`}>
        {/* Logo */}
        <div className={`${isTablet ? 'h-12' : 'h-14'} flex items-center justify-center border-b border-[var(--border-color)]`}>
          <Link to="/" className="group relative" tabIndex={0}>
            <div className={`relative ${isTablet ? 'p-1.5' : 'p-2'} bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg transition-all duration-200 group-hover:shadow-blue-500/30 group-hover:scale-105`}>
              <Sparkles className={`${isTablet ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
            </div>
          </Link>
        </div>

        {/* 导航图标列表 */}
        <nav className="flex-1 py-2 flex flex-col gap-1" role="navigation" aria-label="主导航">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                tabIndex={0}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`pro-nav-item group relative mx-2 ${isTablet ? 'p-2.5' : 'p-3'} rounded-lg flex items-center justify-center transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
              >
                {/* 激活态左侧指示条 - 带动画 */}
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon className={`${isTablet ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </motion.div>
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs font-medium text-[var(--text-primary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                  {item.label}
                  <span className="ml-2 text-[var(--text-muted)]">
                    Ctrl+{index + 1}
                  </span>
                  {/* 小三角 */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[var(--bg-card)] border-l border-b border-[var(--border-color)] rotate-45" />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 底部用户菜单 */}
        <div className="py-2 border-t border-[var(--border-color)]">
          {isLoggedIn ? (
            <Dropdown placement="right-end">
              <DropdownTrigger>
                <button 
                  className={`pro-nav-item group relative mx-2 ${isTablet ? 'p-2.5' : 'p-3'} rounded-lg flex items-center justify-center transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 ${isTablet ? 'w-8' : 'w-10'}`}
                  aria-label="我的账户"
                >
                  <User className={`${isTablet ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs font-medium text-[var(--text-primary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                    我的账户
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[var(--bg-card)] border-l border-b border-[var(--border-color)] rotate-45" />
                  </div>
                </button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="用户菜单"
                classNames={{
                  base: "bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-xl shadow-black/50 rounded-lg min-w-[140px]",
                  list: "bg-transparent"
                }}
              >
                <DropdownItem
                  key="profile"
                  className="text-[var(--text-primary)] hover:bg-white/10 rounded-md"
                  startContent={<User className="w-4 h-4" />}
                  onPress={() => navigate('/user-center')}
                >
                  个人中心
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  className="text-red-400 hover:bg-red-500/10 rounded-md"
                  color="danger"
                  startContent={<LogOut className="w-4 h-4" />}
                  onPress={handleLogout}
                >
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : (
            <button
              onClick={handleAccountClick}
              className={`pro-nav-item group relative mx-2 ${isTablet ? 'p-2.5' : 'p-3'} rounded-lg flex items-center justify-center transition-all duration-200 text-[var(--accent)] hover:bg-[var(--accent)]/10 ${isTablet ? 'w-8' : 'w-10'}`}
              aria-label="登录"
            >
              <User className={`${isTablet ? 'w-4 h-4' : 'w-5 h-5'}`} />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md text-xs font-medium text-[var(--text-primary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                登录
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[var(--bg-card)] border-l border-b border-[var(--border-color)] rotate-45" />
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 - 小屏简化 */}
        <header className="pro-toolbar h-10 items-center justify-between px-4 bg-[var(--bg-nav)]/50 border-b border-[var(--border-color)] hide-on-mobile flex">
          {/* 左侧：当前页面标题 */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {currentPageTitle}
            </h1>
          </div>
          
          {/* 右侧：辅助信息 */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-muted)]">
              饺子动漫 AI Video Studio
            </span>
          </div>
        </header>

        {/* 小屏简化工具栏 */}
        {isMobile && (
          <header className="pro-toolbar h-12 flex items-center justify-center px-4 bg-[var(--bg-nav)] border-b border-[var(--border-color)]">
            <Link to="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                饺子动漫
              </span>
            </Link>
          </header>
        )}

        {/* 主内容区 */}
        <main className={`flex-1 overflow-hidden bg-[var(--bg-app)] ${isMobile ? 'main-content-mobile' : ''}`}>
          {children}
        </main>

        {/* 底部状态栏 - 小屏隐藏 */}
        <footer className="pro-statusbar h-7 items-center justify-between px-4 bg-[var(--bg-nav)] border-t border-[var(--border-color)] hide-on-mobile flex">
          {/* 左侧：连接状态 */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-[var(--text-muted)]">已连接</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-400">未连接</span>
              </>
            )}
          </div>
          
          {/* 中间：快捷键提示 */}
          <div className="flex items-center">
            <button 
              onClick={() => setShowShortcutsHelp(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              aria-label="显示快捷键帮助"
            >
              按 ? 查看快捷键
            </button>
          </div>
          
          {/* 右侧：版本信息 */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-muted)]">v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* 小屏底部导航栏 */}
      {isMobile && (
        <nav className="mobile-bottom-nav show-on-mobile" role="navigation" aria-label="底部导航">
          <div className="h-full flex items-center">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span className="mobile-nav-label">{item.label}</span>
                </Link>
              );
            })}
            {/* 用户按钮 */}
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/user-center')}
                className="mobile-nav-item"
                aria-label="个人中心"
              >
                <User className="w-5 h-5" />
                <span className="mobile-nav-label">我的</span>
              </button>
            ) : (
              <button
                onClick={handleAccountClick}
                className="mobile-nav-item"
                aria-label="登录"
              >
                <User className="w-5 h-5" />
                <span className="mobile-nav-label">登录</span>
              </button>
            )}
          </div>
        </nav>
      )}

      {/* 快捷键帮助面板 */}
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)} 
      />
    </div>
  );
};

export default Layout;
