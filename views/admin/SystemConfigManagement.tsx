import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Settings, Plus, Edit, Trash2, Save } from 'lucide-react';
import { getAdminAuthHeaders } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SystemConfigManagement: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [formData, setFormData] = useState({
    config_key: '',
    config_value: '',
    description: ''
  });
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/system-configs', {
        headers: getAdminAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('获取系统配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (config?: SystemConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        config_key: config.config_key,
        config_value: config.config_value,
        description: config.description || ''
      });
    } else {
      setEditingConfig(null);
      setFormData({ config_key: '', config_value: '', description: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConfig(null);
    setFormData({ config_key: '', config_value: '', description: '' });
  };

  const handleSave = async () => {
    try {
      const url = editingConfig
        ? `/api/admin/system-configs/${editingConfig.id}`
        : '/api/admin/system-configs';

      const res = await fetch(url, {
        method: editingConfig ? 'PUT' : 'POST',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchConfigs();
        handleCloseModal();
      } else {
        const data = await res.json();
        showToast(data.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showToast('保存失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除配置',
      message: '确定要删除这个配置吗？',
      type: 'danger',
      confirmText: '删除'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/system-configs/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });

      if (res.ok) {
        await fetchConfigs();
      } else {
        const data = await res.json();
        showToast(data.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除配置失败:', error);
      showToast('删除失败', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const parseConfigValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
      return value;
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">系统配置管理</h1>
              <p className="text-sm text-slate-400">管理全局系统配置项</p>
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => handleOpenModal()}
          >
            新增配置
          </Button>
        </div>

        <Card className="bg-slate-900/80 border border-slate-700/50">
          <CardBody className="p-6">
            <Table
              aria-label="系统配置表格"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-slate-800/60 text-slate-400 font-semibold",
                td: "text-slate-300"
              }}
            >
              <TableHeader>
                <TableColumn>配置键</TableColumn>
                <TableColumn>配置值</TableColumn>
                <TableColumn>描述</TableColumn>
                <TableColumn>更新时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无配置">
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-blue-500/10 text-blue-400 font-mono">
                        {config.config_key}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-md truncate">
                      {parseConfigValue(config.config_value)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {config.description || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(config.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          className="bg-blue-500/10 text-blue-400"
                          startContent={<Edit className="w-3 h-3" />}
                          onPress={() => handleOpenModal(config)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          className="bg-red-500/10 text-red-400"
                          startContent={<Trash2 className="w-3 h-3" />}
                          onPress={() => handleDelete(config.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={showModal} onOpenChange={handleCloseModal} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingConfig ? '编辑配置' : '新增配置'}
              </ModalHeader>
              <ModalBody>
                <Input
                  label="配置键"
                  placeholder="例如: video_aspect_ratios"
                  value={formData.config_key}
                  onValueChange={(value) => setFormData({ ...formData, config_key: value })}
                  isDisabled={!!editingConfig}
                />
                <Input
                  label="配置值"
                  placeholder='例如: ["16:9", "9:16", "1:1"]'
                  value={formData.config_value}
                  onValueChange={(value) => setFormData({ ...formData, config_value: value })}
                />
                <Input
                  label="描述"
                  placeholder="配置项的说明"
                  value={formData.description}
                  onValueChange={(value) => setFormData({ ...formData, description: value })}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-violet-600 text-white"
                  startContent={<Save className="w-4 h-4" />}
                  onPress={handleSave}
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SystemConfigManagement;
