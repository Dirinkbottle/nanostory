import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { User, Wallet, TrendingUp, FileText, Video, DollarSign } from 'lucide-react';
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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
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

  const formatAmount = (amount: number) => {
    return `¥${amount.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部：用户信息和余额 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 用户信息卡片 */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500">用户名</div>
                  <div className="text-lg font-semibold text-slate-800">{profile?.email}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    注册于 {profile?.created_at ? formatDate(profile.created_at) : ''}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 余额卡片 */}
          <Card className="bg-white border border-emerald-200 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">账户余额</div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-3">
                ¥{profile?.balance.toFixed(2) || '0.00'}
              </div>
              <Button 
                size="sm" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
              >
                充值
              </Button>
            </CardBody>
          </Card>

          {/* 总消费卡片 */}
          <Card className="bg-white border border-orange-200 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-sm text-slate-600 font-medium">累计消费</div>
              </div>
              <div className="text-3xl font-bold text-slate-800 mb-1">
                ¥{stats?.totalSpent.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-slate-500">
                剩余可用 {profile && stats ? ((profile.balance / (profile.balance + stats.totalSpent)) * 100).toFixed(1) : 0}%
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 使用统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">生成剧本</div>
                    <div className="text-2xl font-bold text-slate-800">{stats?.scriptCount || 0}</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700 font-medium">
                  文本
                </Chip>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">生成视频</div>
                    <div className="text-2xl font-bold text-slate-800">{stats?.videoCount || 0}</div>
                  </div>
                </div>
                <Chip size="sm" variant="flat" className="bg-purple-100 text-purple-700 font-medium">
                  视频
                </Chip>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 最近消费记录 */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
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
                th: "bg-slate-100 text-slate-600 font-semibold",
                td: "text-slate-700"
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
                            ? 'bg-blue-100 text-blue-700 font-medium' 
                            : 'bg-purple-100 text-purple-700 font-medium'
                        }
                      >
                        {record.operation}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">{record.model_provider}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="dot" className="text-slate-600">
                        {record.model_tier || '标准'}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-emerald-600">
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
