import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { Wallet, TrendingUp, FolderOpen, Clapperboard, Receipt, AlertTriangle, DollarSign } from 'lucide-react';
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

  if (loading && !profile) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-[var(--text-muted)]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg-app)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">账户余额</div>
              </div>
              <div className="text-3xl font-bold text-slate-100">{formatMoney(profile?.balance)}</div>
              <div className="text-xs text-slate-500 mt-2">{profile?.email}</div>
            </CardBody>
          </Card>

          <Card className="bg-[var(--bg-card)] border border-orange-500/20 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">累计消费</div>
              </div>
              <div className="text-3xl font-bold text-slate-100">{formatMoney(stats?.totalSpent)}</div>
              <div className="text-xs text-slate-500 mt-2">累计 Token {formatInteger(stats?.totalTokens)}</div>
            </CardBody>
          </Card>

          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Receipt className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">账单记录</div>
              </div>
              <div className="text-3xl font-bold text-slate-100">{formatInteger(stats?.totalRecords)}</div>
              <div className="text-xs text-slate-500 mt-2">项目 {formatInteger(stats?.projectCount)} · 剧本 {formatInteger(stats?.scriptCount)}</div>
            </CardBody>
          </Card>

          <Card className="bg-[var(--bg-card)] border border-rose-500/20 shadow-sm">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-sm text-slate-400 font-medium">失败请求</div>
              </div>
              <div className="text-3xl font-bold text-slate-100">{formatInteger(stats?.failedRecords)}</div>
              <div className="text-xs text-slate-500 mt-2">已计费视频请求 {formatInteger(stats?.videoCount)}</div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <CardBody className="p-5 flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">项目数</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatInteger(stats?.projectCount)}</div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <CardBody className="p-5 flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">剧本数</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatInteger(stats?.scriptCount)}</div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <CardBody className="p-5 flex flex-row items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Clapperboard className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">视频计费记录</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatInteger(stats?.videoCount)}</div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
          <CardBody className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  详细账单
                </h3>
                <div className="text-sm text-slate-500 mt-1">
                  每次真实模型调用的状态、用量、拆分计费和总价
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={chargeStatus}
                  onChange={(e) => {
                    setChargeStatus(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">全部扣费状态</option>
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
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">全部模型类型</option>
                  <option value="TEXT">TEXT</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="AUDIO">AUDIO</option>
                </select>

                <select
                  value={sourceType}
                  onChange={(e) => {
                    setSourceType(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">全部来源</option>
                  <option value="workflow">工作流</option>
                  <option value="route">直连接口</option>
                  <option value="admin_tool">管理调试</option>
                </select>
              </div>
            </div>

            <Table
              aria-label="详细账单表格"
              className="min-w-full"
              classNames={{
                wrapper: 'bg-transparent shadow-none',
                th: 'bg-slate-800/60 text-slate-400 font-semibold',
                td: 'text-slate-300 align-top'
              }}
            >
              <TableHeader>
                <TableColumn>时间</TableColumn>
                <TableColumn>来源</TableColumn>
                <TableColumn>模型</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn>计费明细</TableColumn>
                <TableColumn>总价</TableColumn>
              </TableHeader>
              <TableBody emptyContent={recordsLoading ? '账单加载中...' : '暂无账单记录'}>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm text-slate-400 whitespace-nowrap">
                      {formatDate(record.created_at)}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Chip size="sm" className="bg-blue-500/10 text-blue-400 w-fit">
                          {getSourceLabel(record.source_type)}
                        </Chip>
                        <div className="text-sm text-slate-200">{record.operation_key || record.operation || '-'}</div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-slate-100">{record.model_name || record.model_provider || '-'}</div>
                        <div className="text-xs text-slate-500">
                          {(record.model_category || 'UNKNOWN')}{record.model_provider ? ` · ${record.model_provider}` : ''}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Chip size="sm" className={getStatusChipClass(record.request_status, 'request')}>
                          {record.request_status || 'unknown'}
                        </Chip>
                        <Chip size="sm" className={getStatusChipClass(record.charge_status, 'charge')}>
                          {record.charge_status || 'unknown'}
                        </Chip>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-2 max-w-md">
                        {record.price_breakdown_json && record.price_breakdown_json.length > 0 ? (
                          record.price_breakdown_json.map((item, index) => (
                            <div key={`${record.id}-${index}`} className="text-sm text-slate-300">
                              <span className="text-slate-200">{item.label || item.type}</span>
                              <span className="text-slate-500"> · {formatInteger(item.quantity)}</span>
                              <span className="text-slate-500"> × {formatMoney(item.unitPrice)}</span>
                              <span className="text-amber-300"> = {formatMoney(item.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">无拆分明细</div>
                        )}

                        {buildUsageSummary(record) && (
                          <div className="text-xs text-slate-500">{buildUsageSummary(record)}</div>
                        )}

                        {record.error_message && (
                          <div className="text-xs text-rose-400 break-words">{record.error_message}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono font-semibold text-emerald-400 whitespace-nowrap">
                      {formatMoney(record.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5">
              <div className="text-sm text-slate-500">
                共 {formatInteger(total)} 条记录，第 {page} / {totalPages} 页
              </div>

              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-slate-800 text-slate-200"
                  isDisabled={page <= 1 || recordsLoading}
                  onPress={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="bg-slate-800 text-slate-200"
                  isDisabled={page >= totalPages || recordsLoading}
                  onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  下一页
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
