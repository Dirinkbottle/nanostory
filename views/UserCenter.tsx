import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { User, Wallet, TrendingUp, FolderOpen, Trophy, DollarSign } from 'lucide-react';
import { getAuthToken } from '../services/auth';

interface UserProfile {
  id: number;
  email: string;
  balance: number;
  created_at: string;
}

interface UserStats {
  totalSpent: number;
  scriptCount: number;
  videoCount: number;
  projectCount: number;
}

interface BillingRecord {
  id: number;
  operation: string;
  model_provider: string;
  model_tier: string;
  amount: number;
  created_at: string;
}

const UserCenter: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [profileRes, statsRes, recordsRes] = await Promise.all([
        fetch('/api/users/profile', { headers }),
        fetch('/api/users/stats', { headers }),
        fetch('/api/users/billing?limit=10', { headers })
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecords(recordsData.records || []);
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatAmount = (amount: number | string | null | undefined) => {
    const numericValue = typeof amount === 'number' ? amount : Number(amount);
    if (Number.isNaN(numericValue)) {
      return '¥0.0000';
    }
    return `¥${numericValue.toFixed(4)}`;
  };

  const formatCurrency = (value: number | string | null | undefined, digits = 2) => {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numericValue)) {
      return '0.00';
    }
    return numericValue.toFixed(digits);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#0a0a0f] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部：用户信息和余额 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 用户信息卡片 */}
          <Card className="bg-slate-900/80 border border-slate-700/50 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-2xl font-bold text-white">{profile?.email?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-400">用户名</div>
                  <div className="text-lg font-semibold text-slate-100">{profile?.email}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    注册于 {profile?.created_at ? formatDate(profile.created_at) : ''}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 余额卡片 */}
          <Card className="bg-slate-900/80 border border-emerald-500/20 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">账户余额</div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-3">
                ¥{formatCurrency(profile?.balance, 2)}
              </div>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
              >
                充值
              </Button>
            </CardBody>
          </Card>

          {/* 总消费卡片 */}
          <Card className="bg-slate-900/80 border border-orange-500/20 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">累计消费</div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1">
                ¥{formatCurrency(stats?.totalSpent, 2)}
              </div>
              <div className="text-xs text-slate-500">
                剩余可用 {profile && stats ? (() => {
                  const balance = Number(profile.balance) || 0;
                  const spent = Number(stats.totalSpent) || 0;
                  const total = balance + spent;
                  return total > 0 ? ((balance / total) * 100).toFixed(1) : '0.0';
                })() : '0.0'}%
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 使用统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900/80 border border-slate-700/50 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">工程文件</div>
                    <div className="text-2xl font-bold text-slate-100">{stats?.projectCount || 0}</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-400 font-medium">
                  项目
                </Chip>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-slate-900/80 border border-slate-700/50 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">我的成就</div>
                    <div className="text-lg font-semibold text-slate-500">即将开放</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-amber-500/10 text-amber-400 font-medium">
                  成就
                </Chip>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 最近消费记录 */}
        <Card className="bg-slate-900/80 border border-slate-700/50 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                最近消费
              </h3>
              <div className="text-sm text-slate-500">
                最近10条记录
              </div>
            </div>

            <Table 
              aria-label="消费记录表格"
              className="min-w-full"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-slate-800/60 text-slate-400 font-semibold",
                td: "text-slate-300"
              }}
            >
              <TableHeader>
                <TableColumn>操作类型</TableColumn>
                <TableColumn>模型</TableColumn>
                <TableColumn>档次</TableColumn>
                <TableColumn>费用</TableColumn>
                <TableColumn>时间</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无消费记录">
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Chip 
                        size="sm" 
                        variant="flat"
                        className={
                          record.operation === '剧本生成' 
                            ? 'bg-blue-500/10 text-blue-400 font-medium' 
                            : 'bg-purple-500/10 text-purple-400 font-medium'
                        }
                      >
                        {record.operation}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-slate-400 font-medium">{record.model_provider}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="dot" className="text-slate-400">
                        {record.model_tier || '标准'}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-emerald-400">
                      {formatAmount(record.amount)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(record.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default UserCenter;
