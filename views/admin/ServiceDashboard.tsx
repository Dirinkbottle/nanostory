import React, { useEffect, useState } from 'react';
import {
  Activity,
  CircleDot,
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  Server,
  Square,
  Play
} from 'lucide-react';
import { getAdminAuthHeaders } from '../../services/auth';

type ServiceStatus = 'running' | 'exited' | 'created' | 'paused' | 'restarting' | 'unknown' | string;

interface ServiceMetrics {
  cpuPercent?: number;
  memoryUsage?: number;
  memoryLimit?: number;
}

interface ServiceMetadata {
  composeService?: string;
  containerId?: string;
  containerName?: string;
  [key: string]: unknown;
}

interface ServiceItem {
  serviceId: string;
  name: string;
  nodeId?: string;
  panelUrl?: string | null;
  status: ServiceStatus;
  uptimeSeconds?: number;
  metrics?: ServiceMetrics;
  controllable?: boolean;
  capabilities?: string[];
  metadata?: ServiceMetadata;
  stale?: boolean;
}

interface ServicesResponse {
  services?: ServiceItem[];
}

type ActionType = 'start' | 'restart' | 'stop';

const refreshIntervalMs = 8000;

function formatBytes(value?: number) {
  if (!value || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let current = value;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatUptime(seconds?: number) {
  if (!seconds || seconds <= 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function getStatusTone(status: ServiceStatus, stale?: boolean) {
  if (stale || status === 'unknown') {
    return {
      dot: 'bg-slate-300',
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      label: stale ? 'offline' : 'unknown'
    };
  }

  switch (status) {
    case 'running':
      return {
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'running'
      };
    case 'restarting':
      return {
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'restarting'
      };
    case 'paused':
      return {
        dot: 'bg-orange-400',
        badge: 'bg-orange-50 text-orange-700 border-orange-200',
        label: 'paused'
      };
    case 'created':
      return {
        dot: 'bg-sky-400',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        label: 'created'
      };
    case 'exited':
    default:
      return {
        dot: 'bg-rose-400',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        label: status || 'exited'
      };
  }
}

const ServiceDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Record<string, ActionType | undefined>>({});

  useEffect(() => {
    void fetchServices(true);

    const timer = window.setInterval(() => {
      void fetchServices(false, true);
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function fetchServices(isInitial = false, silent = false) {
    if (isInitial) {
      setLoading(true);
    }
    if (!silent && !isInitial) {
      setRefreshing(true);
    }

    try {
      const response = await fetch('/api/admin/services', {
        headers: getAdminAuthHeaders()
      });

      const payload = await response.json().catch(() => ({} as ServicesResponse));
      if (!response.ok) {
        throw new Error('获取服务列表失败');
      }

      const nextServices = Array.isArray(payload.services) ? payload.services : [];
      setServices(nextServices);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '获取服务列表失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function runAction(serviceId: string, action: ActionType) {
    setPendingActions((current) => ({
      ...current,
      [serviceId]: action
    }));

    try {
      const response = await fetch(`/api/admin/services/${encodeURIComponent(serviceId)}/${action}`, {
        method: 'POST',
        headers: getAdminAuthHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || '服务操作失败');
      }

      await fetchServices(false, true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '服务操作失败');
    } finally {
      setPendingActions((current) => ({
        ...current,
        [serviceId]: undefined
      }));
    }
  }

  return (
    <div className="min-h-full bg-[#fbfbf8] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white px-7 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                <Activity className="h-3.5 w-3.5" />
                Service Dashboard
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">服务仪表盘</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  展示节点上已注册服务的运行状态、资源占用、面板入口和生命周期操作。
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchServices(false)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '刷新中' : '刷新状态'}
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`service-skeleton-${index}`}
                  className="overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
                >
                  <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-100" />
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((__, metricIndex) => (
                      <div key={`metric-${metricIndex}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                        <div className="mt-3 h-5 w-20 animate-pulse rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : services.map((service) => {
                const statusTone = getStatusTone(service.status, service.stale);
                const pendingAction = pendingActions[service.serviceId];
                const hasPanel = Boolean(service.panelUrl);

                return (
                  <article
                    key={service.serviceId}
                    className="overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                            <Server className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate text-xl font-semibold text-slate-950">{service.name}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                              {service.serviceId} · 节点 {service.nodeId || 'unknown'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-start">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${statusTone.badge}`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${statusTone.dot}`} />
                          {statusTone.label}
                        </span>
                        <details className="group relative">
                          <summary className="flex cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
                            <MoreHorizontal className="h-4 w-4" />
                          </summary>
                          <div className="absolute right-0 z-10 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                            <div className="space-y-3 text-sm text-slate-600">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">面板</p>
                                {hasPanel ? (
                                  <a
                                    href={service.panelUrl || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-2 text-slate-900 transition hover:text-sky-700"
                                  >
                                    打开服务面板
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : (
                                  <p className="mt-2 text-slate-500">未注册独立面板</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">元数据</p>
                                <pre className="mt-2 max-h-40 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                                  {JSON.stringify(service.metadata || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                      <MetricCard label="CPU 占用" value={`${service.metrics?.cpuPercent ?? 0}%`} />
                      <MetricCard
                        label="内存占用"
                        value={`${formatBytes(service.metrics?.memoryUsage)} / ${formatBytes(service.metrics?.memoryLimit)}`}
                      />
                      <MetricCard label="运行时间" value={formatUptime(service.uptimeSeconds)} />
                      <MetricCard label="独立面板" value={hasPanel ? '已注册' : '无'} />
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CircleDot className="h-4 w-4" />
                        {service.controllable ? '支持生命周期控制' : '当前不可控'}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label="启动"
                          icon={<Play className="h-4 w-4" />}
                          disabled={!service.controllable || Boolean(pendingAction)}
                          busy={pendingAction === 'start'}
                          onClick={() => void runAction(service.serviceId, 'start')}
                        />
                        <ActionButton
                          label="重启"
                          icon={<RefreshCw className={`h-4 w-4 ${pendingAction === 'restart' ? 'animate-spin' : ''}`} />}
                          disabled={!service.controllable || Boolean(pendingAction)}
                          busy={pendingAction === 'restart'}
                          onClick={() => void runAction(service.serviceId, 'restart')}
                        />
                        <ActionButton
                          label="停止"
                          icon={<Square className="h-4 w-4" />}
                          disabled={!service.controllable || Boolean(pendingAction)}
                          busy={pendingAction === 'stop'}
                          onClick={() => void runAction(service.serviceId, 'stop')}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
        </section>

        {!loading && services.length === 0 ? (
          <div className="mt-6 rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
            <p className="text-lg font-medium text-slate-900">当前没有已注册服务</p>
            <p className="mt-2 text-sm text-slate-500">请确认 `core-service-agent` 已启动并完成节点服务发现。</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const ActionButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}> = ({ label, icon, disabled, busy, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
};

export default ServiceDashboard;
