import React from 'react';
import { Film, User, Package, LogOut, FolderOpen, Settings, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { getAuthToken, logout } from '../services/auth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = location.pathname === '/auth';
  const isLoggedIn = !!getAuthToken();

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e1a]">
      {/* 星空背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1d35] via-[#0c0e1a] to-[#080810]" />
        {/* 星点 */}
        <div className="absolute top-20 left-[10%] w-1 h-1 bg-white/30 rounded-full animate-star-twinkle" />
        <div className="absolute top-40 left-[25%] w-0.5 h-0.5 bg-white/20 rounded-full animate-star-twinkle" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-32 right-[15%] w-1 h-1 bg-white/25 rounded-full animate-star-twinkle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-60 right-[30%] w-0.5 h-0.5 bg-white/20 rounded-full animate-star-twinkle" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-40 left-[20%] w-1 h-1 bg-white/20 rounded-full animate-star-twinkle" style={{ animationDelay: '2s' }} />
        {/* 光晕 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {!isAuth && (
        <Navbar 
          maxWidth="full" 
          height="4rem"
          className="genshin-navbar relative z-10 border-b backdrop-blur-xl"
        >
          <NavbarContent justify="start" className="gap-4">
            <NavbarBrand>
              <Link to="/" className="flex items-center gap-3 group">
                {/* Logo 容器带金色光晕 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-yellow-600/30 rounded-xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-2.5 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider genshin-title">
                    饺子动漫
                  </span>
                  <span className="text-[10px] text-[#a8a29e] font-medium tracking-widest">AI Video Studio</span>
                </div>
              </Link>
            </NavbarBrand>
          </NavbarContent>

          <NavbarContent justify="center" className="hidden sm:flex gap-1">
            <NavbarItem>
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  location.pathname === '/' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#e6c87a] border border-amber-500/30 shadow-lg shadow-amber-500/10' 
                    : 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/5'
                }`}
              >
                <Film className="w-4 h-4" />
                创作工作台
              </Link>
            </NavbarItem>
            
            <NavbarItem>
              <Link
                to="/assets"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  location.pathname === '/assets' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#e6c87a] border border-amber-500/30 shadow-lg shadow-amber-500/10' 
                    : 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/5'
                }`}
              >
                <Package className="w-4 h-4" />
                资产管理
              </Link>
            </NavbarItem>

            <NavbarItem>
              <Link
                to="/projects"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  location.pathname === '/projects' 
                    ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-[#b388ff] border border-purple-500/30 shadow-lg shadow-purple-500/10' 
                    : 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/5'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                我的工程
              </Link>
            </NavbarItem>

            <NavbarItem>
              <Link
                to="/settings"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  location.pathname === '/settings' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#4fc3f7] border border-cyan-500/30 shadow-lg shadow-cyan-500/10' 
                    : 'text-[#a8a29e] hover:text-[#e8e4dc] hover:bg-white/5'
                }`}
              >
                <Settings className="w-4 h-4" />
                设置
              </Link>
            </NavbarItem>
          </NavbarContent>

          <NavbarContent justify="end">
            <NavbarItem>
              {isLoggedIn ? (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      radius="lg"
                      variant="flat"
                      className="font-semibold text-sm bg-white/5 text-[#e8e4dc] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <User className="w-4 h-4 mr-2" />
                      我的账户
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu 
                    aria-label="用户菜单"
                    classNames={{
                      base: "bg-[#1a1d35]/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/50 rounded-xl",
                      list: "bg-transparent"
                    }}
                  >
                    <DropdownItem
                      key="profile"
                      className="text-[#e8e4dc] hover:bg-white/10 rounded-lg"
                      startContent={<User className="w-4 h-4" />}
                      onPress={() => navigate('/user-center')}
                    >
                      个人中心
                    </DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-red-400 hover:bg-red-500/10 rounded-lg"
                      color="danger"
                      startContent={<LogOut className="w-4 h-4" />}
                      onPress={handleLogout}
                    >
                      退出登录
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              ) : (
                <Button
                  onClick={handleAccountClick}
                  size="sm"
                  radius="lg"
                  className="font-semibold text-sm bg-gradient-to-r from-amber-500 to-yellow-600 text-[#1a1d35] hover:from-amber-400 hover:to-yellow-500 shadow-lg shadow-amber-500/25 transition-all"
                >
                  <User className="w-4 h-4 mr-2" />
                  登录
                </Button>
              )}
            </NavbarItem>
          </NavbarContent>
        </Navbar>
      )}

      <main className="flex-1 overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
