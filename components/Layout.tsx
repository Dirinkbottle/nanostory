import React from 'react';
import { Film, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button } from "@heroui/react";
import { getAuthToken } from '../services/auth';

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-50">
      {!isAuth && (
        <Navbar 
          maxWidth="full" 
          height="4rem"
          className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-md"
        >
          <NavbarContent justify="start" className="gap-4">
            <NavbarBrand>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
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
                    ? 'text-cyan-400' 
                    : 'text-slate-400 hover:text-cyan-400'
                }`}
              >
                <Film className="w-4 h-4 mr-2" />
                创作工作台
              </Button>
            </NavbarItem>
          </NavbarContent>

          <NavbarContent justify="end">
            <NavbarItem>
              <Button
                as={isLoggedIn ? Link : undefined}
                to={isLoggedIn ? "/user-center" : undefined}
                onClick={handleAccountClick}
                size="sm"
                radius="lg"
                variant="flat"
                className="font-bold text-xs uppercase tracking-widest bg-slate-800/60 text-slate-300 border border-blue-800/60 hover:border-cyan-500/50"
              >
                <User className="w-4 h-4 mr-2" />
                {isLoggedIn ? '我的账户' : '登录'}
              </Button>
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
