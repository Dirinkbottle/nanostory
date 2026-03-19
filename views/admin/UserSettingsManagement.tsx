import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from '@heroui/react';
import { Settings2, Plus, Edit, Trash2, Save, User } from 'lucide-react';
import { getAdminAuthHeaders } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface UserData {
  id: number;
  email: string;
  settings: Record<string, any> | null;
}

interface SettingEntry {
  key: string;
  value: string;
}

const UserSettingsManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [settings, setSettings] = useState<SettingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '' });
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserSettings(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAdminAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.users && data.users.length > 0) {
          setSelectedUserId(data.users[0].id);
        }
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSettings = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/settings`, {
        headers: getAdminAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        const settingsObj = data.settings || {};
        const settingsArray = Object.entries(settingsObj).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
        setSettings(settingsArray);
      }
    } catch (error) {
      console.error('获取用户设置失败:', error);
    }
  };

  const handleOpenModal = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index);
      setFormData({
        key: settings[index].key,
        value: settings[index].value
      });
    } else {
      setEditingIndex(null);
      setFormData({ key: '', value: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setFormData({ key: '', value: '' });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    try {
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(formData.value);
      } catch {
        parsedValue = formData.value;
      }

      const res = await fetch(`/api/admin/users/${selectedUserId}/settings`, {
        method: 'PATCH',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          [formData.key]: parsedValue
        })
      });

      if (res.ok) {
        await fetchUserSettings(selectedUserId);
        handleCloseModal();
      } else {
        const data = await res.json();
        showToast(data.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      showToast('保存失败', 'error');
    }
  };

  const handleDelete = async (key: string) => {
    if (!selectedUserId) return;
    const confirmed = await confirm({
      title: '删除设置',
      message: `确定要删除设置 "${key}" 吗？`,
      type: 'danger',
      confirmText: '删除'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/settings/${key}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });

      if (res.ok) {
        await fetchUserSettings(selectedUserId);
      } else {
        const data = await res.json();
        showToast(data.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除设置失败:', error);
      showToast('删除失败', 'error');
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">用户设置管理</h1>
              <p className="text-sm text-slate-400">管理用户的个性化配置</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：用户选择 */}
          <Card className="bg-slate-900/80 border border-slate-700/50">
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">选择用户</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedUserId === user.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedUserId === user.id ? 'bg-white/20' : 'bg-purple-500/10'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium truncate">{user.email}</div>
                      <div className={`text-xs ${
                        selectedUserId === user.id ? 'text-white/70' : 'text-slate-500'
                      }`}>
                        ID: {user.id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* 右侧：设置列表 */}
          <Card className="lg:col-span-2 bg-slate-900/80 border border-slate-700/50">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  {selectedUser ? `${selectedUser.email} 的设置` : '用户设置'}
                </h3>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={() => handleOpenModal()}
                  isDisabled={!selectedUserId}
                >
                  新增设置
                </Button>
              </div>

              {settings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无设置</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings.map((setting, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 bg-slate-800/60 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Chip size="sm" variant="flat" className="bg-purple-500/10 text-purple-400 font-mono">
                            {setting.key}
                          </Chip>
                        </div>
                        <div className="text-sm text-slate-300 font-mono break-all">
                          {setting.value}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          className="bg-blue-500/10 text-blue-400"
                          startContent={<Edit className="w-3 h-3" />}
                          onPress={() => handleOpenModal(index)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          className="bg-red-500/10 text-red-400"
                          startContent={<Trash2 className="w-3 h-3" />}
                          onPress={() => handleDelete(setting.key)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal isOpen={showModal} onOpenChange={handleCloseModal} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingIndex !== null ? '编辑设置' : '新增设置'}
              </ModalHeader>
              <ModalBody>
                <Input
                  label="设置键"
                  placeholder="例如: theme, language, notifications"
                  value={formData.key}
                  onValueChange={(value) => setFormData({ ...formData, key: value })}
                  isDisabled={editingIndex !== null}
                />
                <Input
                  label="设置值"
                  placeholder='例如: "dark" 或 {"enabled": true}'
                  value={formData.value}
                  onValueChange={(value) => setFormData({ ...formData, value: value })}
                />
                <div className="text-xs text-slate-400">
                  提示：值可以是字符串或 JSON 对象
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white"
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

export default UserSettingsManagement;
