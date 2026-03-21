import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardBody, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Progress, Tooltip } from '@heroui/react';
import { Wallet, TrendingUp, FolderOpen, FileText, Receipt, AlertTriangle, Sparkles, Clock, Zap, ChevronLeft, ChevronRight, User, Calendar, Activity, RefreshCw, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken, logout } from '../services/auth';

interface UserProfile {
  id: number;
  email: string;
  balance: number;
  created_at: string;
}

interface UserStats {
  totalSpent: number;
  totalTokens: number;
  totalRecords: number;
  failedRecords: number;
  scriptCount: number;
  videoCount: number;
  projectCount: number;
}

interface PriceBreakdownItem {
  type: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  label?: string;
}

interface BillingRecord {
  id: number;
  operation?: string;
  operation_key?: string | null;
  model_name?: string | null;
  model_provider?: string | null;
  model_category?: string | null;
  source_type?: string | null;
  request_status?: string | null;
  charge_status?: string | null;
  currency?: string | null;
  tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  duration_seconds?: number;
  item_count?: number;
  amount: number;
  error_message?: string | null;
  created_at: string;
  price_breakdown_json?: PriceBreakdownItem[];
}

interface BillingResponse {
  records: BillingRecord[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 20;

const UserCenter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [chargeStatus, setChargeStatus] = useState('');
  const [modelCategory, setModelCategory] = useState('');
  const [sourceType, setSourceType] = useState('');

  useEffect(() => {
    void fetchSummaryData();
  }, []);

  useEffect(() => {
    void fetchBillingData();
  }, [page, chargeStatus, modelCategory, sourceType]);

  const redirectToAuth = () => {
    logout();
    navigate('/auth', { replace: true, state: { from: location } });
  };

  const fetchSummaryData = async () => {
    const token = getAuthToken();
    if (!token) {
      redirectToAuth();
      return;
    }

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const [profileRes, statsRes] = await Promise.all([
        fetch('/api/users/profile', { headers }),
        fetch('/api/users/stats', { headers })
      ]);

      if ([profileRes, statsRes].some((response) => response.status === 401)) {
        redirectToAuth();
        return;
      }

      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('获取用户摘要失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    const token = getAuthToken();
    if (!token) {
      redirectToAuth();
      return;
    }

    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page)
      });

      if (chargeStatus) params.set('chargeStatus', chargeStatus);
      if (modelCategory) params.set('modelCategory', modelCategory);
      if (sourceType) params.set('sourceType', sourceType);

      const response = await fetch(`/api/users/billing?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        redirectToAuth();
        return;
      }

      if (!response.ok) {
        throw new Error('获取账单失败');
      }

      const data: BillingResponse = await response.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('获取账单列表失败:', error);
      setRecords([]);
      setTotal(0);
    } finally {
      setRecordsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('zh-CN');

  const formatMoney = (value: number | string | null | undefined) => {
    const numericValue = Number(value || 0);
    return `¥${numericValue.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })}`;
  };

  const formatInteger = (value: number | string | null | undefined) => {
    const numericValue = Number(value || 0);
    return numericValue.toLocaleString('zh-CN');
  };

  const getSourceLabel = (value?: string | null) => {
    if (value === 'workflow') return '工作流';
    if (value === 'route') return '直连接口';
    if (value === 'admin_tool') return '管理调试';
    return value || '未知来源';
  };

  const getStatusChipClass = (value?: string | null, type: 'request' | 'charge' = 'request') => {
    const key = `${type}:${value || ''}`;
    const map: Record<string, string> = {
      'request:success': 'bg-emerald-500/10 text-emerald-400',
      'request:failed': 'bg-rose-500/10 text-rose-400',
      'request:submitted': 'bg-sky-500/10 text-sky-400',
      'charge:charged': 'bg-emerald-500/10 text-emerald-400',
      'charge:skipped': 'bg-slate-700/80 text-slate-300',
      'charge:pending': 'bg-amber-500/10 text-amber-400'
    };

    return map[key] || 'bg-slate-700/80 text-slate-300';
  };

  const buildUsageSummary = (record: BillingRecord) => {
    const parts: string[] = [];
    if (record.input_tokens) parts.push(`输入 ${formatInteger(record.input_tokens)}`);
    if (record.output_tokens) parts.push(`输出 ${formatInteger(record.output_tokens)}`);
    if (record.duration_seconds) parts.push(`${Number(record.duration_seconds).toFixed(2)} 秒`);
    if (record.item_count) parts.push(`${formatInteger(record.item_count)} 个产物`);
    if (!parts.length && record.tokens) parts.push(`总 Token ${formatInteger(record.tokens)}`);
    return parts.join(' · ');
  };

  // 计算消费比例
  const spentPercentage = useMemo(() => {
    if (!profile?.balance || !stats?.totalSpent) return 0;
    const total = profile.balance + stats.totalSpent;
    return Math.min(100, (stats.totalSpent / total) * 100);
  }, [profile?.balance, stats?.totalSpent]);

  // 格式化注册日期
  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    return new Date(profile.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [profile?.created_at]);

  // 获取用户名首字母
  const avatarInitial = useMemo(() => {
    if (!profile?.email) return 'U';
    return profile.email.charAt(0).toUpperCase();
  }, [profile?.email]);

  if (loading && !profile) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-app)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <div className="text-[var(--text-muted)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg-app)]">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* 用户信息头部 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 via-purple-500/10 to-blue-500/10 border border-[var(--border-color)]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
          
          <div className="relative p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* 头像 */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-[var(--accent)]/20">
                  {avatarInitial}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[var(--bg-card)]">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              {/* 用户信息 */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">欢迎回来</h1>
                <p className="text-[var(--text-secondary)] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {profile?.email}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {memberSince} 加入
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    {formatInteger(stats?.totalRecords)} 次 API 调用
                  </span>
                </div>
              </div>
              
              {/* 余额卡片 */}
              <div className="bg-[var(--bg-card)]/80 backdrop-blur-sm rounded-xl p-4 border border-[var(--border-color)] min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    账户余额
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-[var(--accent)] min-w-0 px-2 h-7"
                    onPress={() => window.open('https://example.com/recharge', '_blank')}
                  >
                    充值
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="text-3xl font-bold text-emerald-400">{formatMoney(profile?.balance)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 累计消费 */}
          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <Tooltip content="与余额的比例">
                  <div className="text-xs text-[var(--text-muted)]">{spentPercentage.toFixed(1)}%</div>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{formatMoney(stats?.totalSpent)}</div>
              <div className="text-xs text-[var(--text-muted)]">累计消费</div>
              <Progress 
                value={spentPercentage} 
                size="sm" 
                color="warning" 
                className="mt-3"
                classNames={{ track: 'bg-orange-500/10' }}
              />
            </CardBody>
          </Card>

          {/* Token 用量 */}
          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <Tooltip content="文本模型消耗的总Token数">
                  <div className="text-xs text-[var(--text-muted)] cursor-help">?</div>
                </Tooltip>
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{formatInteger(stats?.totalTokens)}</div>
              <div className="text-xs text-[var(--text-muted)]">累计 Token</div>
            </CardBody>
          </Card>

          {/* 项目/剧本 */}
          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <FolderOpen className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{formatInteger(stats?.projectCount)}</span>
                <span className="text-sm text-[var(--text-muted)]">项目</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <FileText className="w-3.5 h-3.5" />
                {formatInteger(stats?.scriptCount)} 个剧本
              </div>
            </CardBody>
          </Card>

          {/* 失败请求 */}
          <Card className="bg-[var(--bg-card)] border border-rose-500/20 shadow-sm hover:shadow-md transition-shadow">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-rose-500/10 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                {(stats?.failedRecords ?? 0) > 0 && (
                  <Chip size="sm" className="bg-rose-500/10 text-rose-400 text-xs">需关注</Chip>
                )}
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{formatInteger(stats?.failedRecords)}</div>
              <div className="text-xs text-[var(--text-muted)]">失败请求</div>
            </CardBody>
          </Card>
        </div>

        {/* 详细账单 */}
        <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
          <CardBody className="p-0">
            {/* 账单头部 */}
            <div className="p-5 border-b border-[var(--border-color)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--accent)]/10 rounded-xl">
                    <Receipt className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">详细账单</h3>
                    <div className="text-sm text-[var(--text-muted)]">
                      每次 AI 模型调用的状态、用量和计费明细
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-[var(--text-secondary)] min-w-0 px-2 h-8 ml-auto"
                    isLoading={recordsLoading}
                    onPress={() => fetchBillingData()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {/* 筛选器 */}
                <div className="flex flex-wrap gap-2">
                  <select
                    value={chargeStatus}
                    onChange={(e) => {
                      setChargeStatus(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  >
                    <option value="">全部状态</option>
                    <option value="charged">已扣费</option>
                    <option value="skipped">已跳过</option>
                    <option value="pending">待结算</option>
                  </select>

                  <select
                    value={modelCategory}
                    onChange={(e) => {
                      setModelCategory(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  >
                    <option value="">全部模型</option>
                    <option value="TEXT">文本模型</option>
                    <option value="IMAGE">图像模型</option>
                    <option value="VIDEO">视频模型</option>
                    <option value="AUDIO">音频模型</option>
                  </select>

                  <select
                    value={sourceType}
                    onChange={(e) => {
                      setSourceType(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                  >
                    <option value="">全部来源</option>
                    <option value="workflow">工作流</option>
                    <option value="route">直连接口</option>
                    <option value="admin_tool">管理调试</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 账单表格 */}
            <div className="overflow-x-auto">
              <Table
                aria-label="详细账单表格"
                className="min-w-full"
                classNames={{
                  wrapper: 'bg-transparent shadow-none rounded-none',
                  th: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium text-xs uppercase tracking-wider',
                  td: 'text-[var(--text-primary)] align-top py-4'
                }}
              >
                <TableHeader>
                  <TableColumn>时间</TableColumn>
                  <TableColumn>来源</TableColumn>
                  <TableColumn>模型</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>计费明细</TableColumn>
                  <TableColumn className="text-right">总价</TableColumn>
                </TableHeader>
              <TableBody emptyContent={
                recordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
                    <p className="text-[var(--text-muted)]">暂无账单记录</p>
                  </div>
                )
              }>
                {records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <TableCell className="text-sm text-[var(--text-muted)] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(record.created_at)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Chip size="sm" className="bg-[var(--accent)]/10 text-[var(--accent)] w-fit">
                          {getSourceLabel(record.source_type)}
                        </Chip>
                        <div className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">
                          {record.operation_key || record.operation || '-'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-[var(--text-primary)]">
                          {record.model_name || record.model_provider || '-'}
                        </div>
                        <Chip size="sm" variant="flat" className="w-fit text-xs bg-[var(--bg-secondary)]">
                          {record.model_category || 'UNKNOWN'}
                        </Chip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Chip size="sm" className={getStatusChipClass(record.request_status, 'request')}>
                          {record.request_status || 'unknown'}
                        </Chip>
                        <Chip size="sm" className={getStatusChipClass(record.charge_status, 'charge')}>
                          {record.charge_status || 'unknown'}
                        </Chip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5 max-w-md">
                        {record.price_breakdown_json && record.price_breakdown_json.length > 0 ? (
                          record.price_breakdown_json.map((item, index) => (
                            <div key={`${record.id}-${index}`} className="text-sm">
                              <span className="text-[var(--text-primary)]">{item.label || item.type}</span>
                              <span className="text-[var(--text-muted)]"> × {formatInteger(item.quantity)}</span>
                              <span className="text-amber-400 font-medium"> = {formatMoney(item.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-[var(--text-muted)]">-</div>
                        )}

                        {buildUsageSummary(record) && (
                          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {buildUsageSummary(record)}
                          </div>
                        )}

                        {record.error_message && (
                          <div className="text-xs text-rose-400 break-words">{record.error_message}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-emerald-400">
                        {formatMoney(record.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* 分页 */}
            <div className="p-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-[var(--text-muted)]">
                共 <span className="font-medium text-[var(--text-primary)]">{formatInteger(total)}</span> 条记录，
                第 {page} / {totalPages} 页
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-[var(--bg-secondary)] text-[var(--text-primary)] gap-1"
                  isDisabled={page <= 1 || recordsLoading}
                  onPress={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-[var(--bg-secondary)] text-[var(--text-primary)] gap-1"
                  isDisabled={page >= totalPages || recordsLoading}
                  onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default UserCenter;
