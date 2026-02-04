import React from 'react';
import { Film, User, Package, LogOut, FolderOpen } from 'lucide-react';
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {!isAuth && (
        <Navbar 
          maxWidth="full" 
          height="4rem"
          className="border-b border-slate-200 bg-white shadow-sm"
        >
          <NavbarContent justify="start" className="gap-4">
            <NavbarBrand>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="p-2 bg-blue-600 rounded-xl shadow-md">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider uppercase text-blue-600">
                    Animata
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-widest">AI Video Studio</span>
                </div>
              </Link>
            </NavbarBrand>
          </NavbarContent>

          <NavbarContent justify="center" className="hidden sm:flex gap-6">
            <NavbarItem>
              <Button
                as={Link}
                to="/"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest ${
                  location.pathname === '/' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-blue-600'
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
                className={`font-bold text-xs uppercase tracking-widest ${
                  location.pathname === '/assets' 
                    ? 'text-blue-600' 
                    : 'text-slate-500 hover:text-blue-600'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                资源管理
              </Button>
            </NavbarItem>

            <NavbarItem>
              <Button
                as={Link}
                to="/projects"
                size="sm"
                variant="light"
                className={`font-bold text-xs uppercase tracking-widest ${
                  location.pathname === '/projects' 
                    ? 'text-purple-600' 
                    : 'text-slate-500 hover:text-purple-600'
                }`}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                我的工程
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
                      className="font-bold text-xs uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:border-slate-300"
                    >
                      <User className="w-4 h-4 mr-2" />
                      我的账户
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu 
                    aria-label="用户菜单"
                    classNames={{
                      base: "bg-white border border-slate-200 shadow-lg",
                      list: "bg-white"
                    }}
                  >
                    <DropdownItem
                      key="profile"
                      className="text-slate-700 hover:bg-slate-100"
                      startContent={<User className="w-4 h-4" />}
                      onPress={() => navigate('/user-center')}
                    >
                      个人中心
                    </DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-red-500 hover:bg-red-50"
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
                  className="font-bold text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700"
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
