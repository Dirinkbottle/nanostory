import { useState, useEffect } from 'react';
import { getAuthToken } from '../services/auth';

interface ConfigOption {
  label: string;
  value: string | number;
}

interface SystemConfig {
  id: number;
  config_key: string;
  config_name: string;
  config_type: string;
  config_value: ConfigOption[];
  description: string;
  is_active: number;
}

export function useSystemConfigs() {
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/system-configs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error('获取系统配置失败');
      }

      const data = await res.json();
      const configMap: Record<string, SystemConfig> = {};

      data.configs.forEach((config: SystemConfig) => {
        // 解析JSON字符串
        if (typeof config.config_value === 'string') {
          try {
            config.config_value = JSON.parse(config.config_value);
          } catch (e) {
            console.error('解析配置值失败:', e);
          }
        }
        configMap[config.config_key] = config;
      });

      setConfigs(configMap);
    } catch (err: any) {
      console.error('获取系统配置失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { configs, loading, error, refetch: fetchConfigs };
}
