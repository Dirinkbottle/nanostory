import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Divider } from '@heroui/react';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { login, register } from '../services/auth';
import { useToast } from '../contexts/ToastContext';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigate('/');
    } catch (err: any) {
      showToast(err?.message || '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-black px-4 relative overflow-hidden">
      {/* 动态渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 animate-gradient"></div>
      
      {/* 浮动光晕 1 */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float"></div>
      
      {/* 浮动光晕 2 */}
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delay"></div>
      
      {/* 浮动光晕 3 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      
      {/* 星星闪烁效果 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => {
          const size = Math.random() > 0.7 ? 2 : 1;
          const randomLeft = Math.random() * 100;
          const randomTop = Math.random() * 100;
          const randomDelay = Math.random() * 5;
          const randomDuration = 2 + Math.random() * 3;
          
          return (
            <div
              key={`star-${i}`}
              className="absolute bg-white rounded-full animate-twinkle"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${randomLeft}%`,
                top: `${randomTop}%`,
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
                boxShadow: size === 2 ? '0 0 4px 1px rgba(255, 255, 255, 0.5)' : 'none'
              }}
            />
          );
        })}
      </div>

      <Card className="w-full max-w-md bg-slate-950/80 border border-slate-800/50 shadow-2xl backdrop-blur-xl relative z-10">
        <CardBody className="p-10 space-y-8">
          {/* Logo 区域 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-2">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Animata
              </h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                AI 驱动的视频创作平台
              </p>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2 p-1 bg-slate-900/80 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
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
              startContent={<User className="w-4 h-4 text-slate-500" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-slate-900/50 text-white placeholder:text-slate-600',
                inputWrapper: 'bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 data-[focus=true]:border-cyan-500/50',
              }}
            />

            <Input
              type="password"
              placeholder="密码"
              value={password}
              onValueChange={setPassword}
              startContent={<Lock className="w-4 h-4 text-slate-500" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-slate-900/50 text-white placeholder:text-slate-600',
                inputWrapper: 'bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 data-[focus=true]:border-cyan-500/50',
              }}
            />

            <Button
              type="submit"
              size="lg"
              radius="lg"
              className="w-full font-bold bg-white text-black hover:bg-slate-200 transition-all"
              endContent={<ArrowRight className="w-4 h-4" />}
              isLoading={loading}
            >
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <Divider className="bg-slate-800/50" />

          {/* 底部提示 */}
          <p className="text-center text-xs text-slate-500">
            {mode === 'login' ? '首次使用？' : '已有账户？'}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="ml-2 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
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
