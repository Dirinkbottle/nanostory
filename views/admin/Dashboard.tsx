import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { Users, Cpu, TrendingUp, Activity } from 'lucide-react';
import { getAuthToken } from '../../services/auth';

interface DashboardStats {
  totalUsers: number;
  totalModels: number;
  todayRequests: number;
  totalScripts: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalModels: 0,
    todayRequests: 0,
    totalScripts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">仪表盘</h1>
        <p className="text-slate-500 mt-1">系统概览与统计信息</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">总用户数</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {loading ? '-' : stats.totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">AI 模型数</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {loading ? '-' : stats.totalModels}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">今日请求</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {loading ? '-' : stats.todayRequests}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">系统状态</p>
                <p className="text-xl font-bold text-emerald-600 mt-2">运行中</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">快速操作</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <p className="font-medium text-slate-800">添加 AI 模型</p>
                <p className="text-sm text-slate-500 mt-1">配置新的 AI 模型接口</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                <p className="font-medium text-slate-800">查看用户列表</p>
                <p className="text-sm text-slate-500 mt-1">管理系统用户</p>
              </button>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">系统信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">版本</span>
                <span className="font-medium text-slate-800">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">数据库</span>
                <span className="font-medium text-emerald-600">已连接</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">最后更新</span>
                <span className="font-medium text-slate-800">刚刚</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
