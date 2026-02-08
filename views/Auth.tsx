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
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 relative overflow-hidden">
      {/* 装饰背景元素 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-100 rounded-full opacity-60"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-indigo-50 rounded-full opacity-40"></div>
      </div>

      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xl relative z-10">
        <CardBody className="p-10 space-y-8">
          {/* Logo 区域 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-2">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">
                NANOSTORY
              </h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                AI 驱动的视频创作平台
              </p>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
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
              startContent={<User className="w-4 h-4 text-slate-400" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-white text-slate-800 placeholder:text-slate-400',
                inputWrapper: 'bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm',
              }}
            />

            <Input
              type="password"
              placeholder="密码"
              value={password}
              onValueChange={setPassword}
              startContent={<Lock className="w-4 h-4 text-slate-400" />}
              variant="flat"
              radius="lg"
              size="lg"
              classNames={{
                base: 'bg-transparent',
                input: 'bg-white text-slate-800 placeholder:text-slate-400',
                inputWrapper: 'bg-white border border-slate-200 hover:border-blue-300 data-[focus=true]:border-blue-500 shadow-sm',
              }}
            />

            <Button
              type="submit"
              size="lg"
              radius="lg"
              className="w-full font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 transition-all"
              endContent={<ArrowRight className="w-4 h-4" />}
              isLoading={loading}
            >
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <Divider className="bg-slate-200" />

          {/* 底部提示 */}
          <p className="text-center text-xs text-slate-500">
            {mode === 'login' ? '首次使用？' : '已有账户？'}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="ml-2 text-blue-600 hover:text-blue-700 font-bold transition-colors"
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
