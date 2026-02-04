import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Input, Button, Tabs, Tab } from '@heroui/react';
import { login, register } from '../services/auth';
import { useToast } from '../contexts/ToastContext';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('请输入邮箱和密码', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('登录成功', 'success');
      } else {
        await register(email, password);
        showToast('注册并登录成功', 'success');
      }
      navigate('/');
    } catch (err: any) {
      showToast(err?.message || '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <Card className="w-full max-w-md bg-slate-900/90 border border-yellow-500/40 shadow-2xl">
        <CardBody className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-[0.3em] uppercase text-yellow-400">Animata</h1>
            <p className="text-sm text-slate-400">高贵黑 · 剧本工作台 · 账户登录</p>
          </div>

          <Tabs
            selectedKey={mode}
            onSelectionChange={(key) => setMode(key as 'login' | 'register')}
            variant="underlined"
            classNames={{
              tabList: 'border-b border-slate-700',
              tab: 'px-2',
            }}
          >
            <Tab key="login" title="登录" />
            <Tab key="register" title="注册" />
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="邮箱"
              variant="bordered"
              radius="lg"
              value={email}
              onValueChange={setEmail}
              classNames={{
                label: 'text-xs font-bold text-slate-400',
              }}
            />
            <Input
              type="password"
              label="密码"
              variant="bordered"
              radius="lg"
              value={password}
              onValueChange={setPassword}
              classNames={{
                label: 'text-xs font-bold text-slate-400',
              }}
            />

            <Button
              type="submit"
              color="warning"
              className="w-full font-black tracking-[0.3em] uppercase mt-2"
              radius="lg"
              isLoading={loading}
            >
              {mode === 'login' ? '登录' : '注册并登录'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default Auth;
