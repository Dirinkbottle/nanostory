import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardBody, Button, Input, Divider } from '@heroui/react';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { login, register } from '../services/auth';
import { useToast } from '../contexts/ToastContext';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 获取登录前想访问的页面
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('请填写完整信息', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(username, password);
        showToast('注册成功！', 'success');
      } else {
        await login(username, password);
        showToast('登录成功！', 'success');
      }
      // 登录成功后返回之前想访问的页面
      navigate(from, { replace: true });
    } catch (err: any) {
      showToast(err?.message || '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-[#0c0e1a] px-4 relative overflow-hidden">
      {/* 装饰背景元素 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float-delay"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[rgba(230,200,122,0.05)] rounded-full blur-2xl"></div>
        {/* 星点装饰 */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[rgba(230,200,122,0.4)] rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md genshin-card relative z-10">
        <CardBody className="p-10 space-y-8">
          {/* Logo 区域 */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-yellow-600/40 rounded-2xl blur-xl"></div>
              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl shadow-lg shadow-amber-500/30">
                <Sparkles className="w-8 h-8 text-[#1a1d35]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight genshin-title">
                NANOSTORY
              </h1>
              <p className="text-sm text-[#6b6561] mt-2 font-medium">
                AI 驱动的视频创作平台
              </p>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2 p-1 bg-[rgba(30,35,60,0.6)] rounded-xl border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#e6c87a] border border-amber-500/30 shadow-[0_0_10px_rgba(230,200,122,0.2)]'
                  : 'text-[#6b6561] hover:text-[#a8a29e]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#e6c87a] border border-amber-500/30 shadow-[0_0_10px_rgba(230,200,122,0.2)]'
                  : 'text-[#6b6561] hover:text-[#a8a29e]'
              }`}
            >
              注册
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text"
              placeholder="用户名"
              value={username}
              onValueChange={setUsername}
              startContent={<User className="w-4 h-4 text-[#6b6561]" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-transparent text-[#e8e4dc] placeholder:text-[#6b6561]',
                inputWrapper: 'bg-[rgba(30,35,60,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(230,200,122,0.3)] data-[focus=true]:border-[rgba(230,200,122,0.4)] shadow-sm',
              }}
            />

            <Input
              type="password"
              placeholder="密码"
              value={password}
              onValueChange={setPassword}
              startContent={<Lock className="w-4 h-4 text-[#6b6561]" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-transparent text-[#e8e4dc] placeholder:text-[#6b6561]',
                inputWrapper: 'bg-[rgba(30,35,60,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(230,200,122,0.3)] data-[focus=true]:border-[rgba(230,200,122,0.4)] shadow-sm',
              }}
            />

            <Button
              type="submit"
              size="lg"
              radius="lg"
              className="w-full font-bold bg-gradient-to-br from-amber-400 to-yellow-600 text-[#1a1d35] shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all cursor-pointer"
              endContent={<ArrowRight className="w-4 h-4" />}
              isLoading={loading}
            >
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <Divider className="bg-[rgba(255,255,255,0.08)]" />

          {/* 底部提示 */}
          <p className="text-center text-xs text-[#6b6561]">
            {mode === 'login' ? '首次使用？' : '已有账户？'}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="ml-2 text-[#e6c87a] hover:text-[#f0dca0] font-bold transition-colors cursor-pointer"
            >
              {mode === 'login' ? '立即注册' : '返回登录'}
            </button>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default Auth;
