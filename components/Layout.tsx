import React from 'react';
import { Film, User, Package, LogOut, FolderOpen, Settings } from 'lucide-react';
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
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {!isAuth && (
        <Navbar 
          maxWidth="full" 
          height="4rem"
          className="border-b backdrop-blur-xl"
          style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border-color)' }}
        >
          <NavbarContent justify="start" className="gap-4">
            <NavbarBrand>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    NANOSTORY
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium tracking-widest">AI Video Studio</span>
                </div>
              </Link>
            </NavbarBrand>
          </NavbarContent>

          <NavbarContent justify="center" className="hidden sm:flex gap-2">
            <NavbarItem>
              <Button
                as={Link}
                to="/"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                  location.pathname === '/' 
                    ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Film className="w-4 h-4 mr-2" />
                创作工作台
              </Button>
            </NavbarItem>
            
            <NavbarItem>
              <Button
                as={Link}
                to="/assets"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                  location.pathname === '/assets' 
                    ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                资产管理
              </Button>
            </NavbarItem>

            <NavbarItem>
              <Button
                as={Link}
                to="/projects"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                  location.pathname === '/projects' 
                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border border-violet-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                我的工程
              </Button>
            </NavbarItem>

            <NavbarItem>
              <Button
                as={Link}
                to="/settings"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                  location.pathname === '/settings' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Button>
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
                      className="font-bold text-xs uppercase tracking-widest bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600/50"
                    >
                      <User className="w-4 h-4 mr-2" />
                      我的账户
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu 
                    aria-label="用户菜单"
                    classNames={{
                      base: "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-xl shadow-black/50",
                      list: "bg-transparent"
                    }}
                  >
                    <DropdownItem
                      key="profile"
                      className="text-slate-300 hover:bg-slate-800/80"
                      startContent={<User className="w-4 h-4" />}
                      onPress={() => navigate('/user-center')}
                    >
                      个人中心
                    </DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-red-400 hover:bg-red-500/10"
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
                  className="font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25"
                >
                  <User className="w-4 h-4 mr-2" />
                  登录
                </Button>
              )}
            </NavbarItem>
          </NavbarContent>
        </Navbar>
      )}

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
