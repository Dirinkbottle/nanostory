import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { User, Wallet, TrendingUp, FileText, Video, DollarSign } from 'lucide-react';

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
      const [profileRes, statsRes, recordsRes] = await Promise.all([
        fetch('/api/users/profile'),
        fetch('/api/users/stats'),
        fetch('/api/users/billing?limit=10')
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

  const formatAmount = (amount: number) => {
    return `¥${amount.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部：用户信息和余额 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 用户信息卡片 */}
          <Card className="bg-slate-900/50 border border-slate-800">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-400">用户名</div>
                  <div className="text-lg font-semibold text-white">{profile?.email}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    注册于 {profile?.created_at ? formatDate(profile.created_at) : ''}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 余额卡片 */}
          <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-800/50">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <div className="text-sm text-emerald-300">账户余额</div>
              </div>
              <div className="text-3xl font-bold text-white mb-3">
                ¥{profile?.balance.toFixed(2) || '0.00'}
              </div>
              <Button 
                size="sm" 
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                充值
              </Button>
            </CardBody>
          </Card>

          {/* 总消费卡片 */}
          <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-800/50">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                <div className="text-sm text-orange-300">累计消费</div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ¥{stats?.totalSpent.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-orange-200/70">
                剩余可用 {profile && stats ? ((profile.balance / (profile.balance + stats.totalSpent)) * 100).toFixed(1) : 0}%
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 使用统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900/50 border border-slate-800">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">生成剧本</div>
                    <div className="text-2xl font-bold text-white">{stats?.scriptCount || 0}</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-blue-500/20 text-blue-300">
                  文本
                </Chip>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-slate-900/50 border border-slate-800">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">生成视频</div>
                    <div className="text-2xl font-bold text-white">{stats?.videoCount || 0}</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-purple-500/20 text-purple-300">
                  视频
                </Chip>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 最近消费记录 */}
        <Card className="bg-slate-900/50 border border-slate-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                最近消费
              </h3>
              <div className="text-sm text-slate-400">
                最近10条记录
              </div>
            </div>

            <Table 
              aria-label="消费记录表格"
              className="min-w-full"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-slate-800/50 text-slate-300 font-medium",
                td: "text-slate-200"
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
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-purple-500/20 text-purple-300'
                        }
                      >
                        {record.operation}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-slate-300">{record.model_provider}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="dot">
                        {record.model_tier || '标准'}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-mono text-emerald-400">
                      {formatAmount(record.amount)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
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
