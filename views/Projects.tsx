import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react';
import { FolderOpen, Plus, Edit, Trash2, Search, BookOpen, Clock } from 'lucide-react';
import { Project, fetchProjects, createProject, updateProject, deleteProject } from '../services/projects';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_url: '',
    status: 'draft' as 'draft' | 'in_progress' | 'completed'
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error('加载工程失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setFormData({
      name: '',
      description: '',
      cover_url: '',
      status: 'draft'
    });
    onOpen();
  };

  const handleEdit = (project: Project) => {
    setEditMode(true);
    setCurrentId(project.id);
    setFormData({
      name: project.name,
      description: project.description,
      cover_url: project.cover_url,
      status: project.status
    });
    onOpen();
  };

  const handleSave = async () => {
    try {
      const saveData = { ...formData, type: 'comic' as const };
      if (editMode && currentId) {
        await updateProject(currentId, saveData);
      } else {
        await createProject(saveData);
      }
      await loadProjects();
      onOpenChange();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个工程吗？')) return;
    
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600';
      case 'in_progress': return 'bg-blue-100 text-blue-600';
      case 'completed': return 'bg-green-100 text-green-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return '草稿';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="h-full bg-slate-50 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">我的工程</h1>
              <p className="text-sm text-slate-500">管理你的漫剧和剧本工程</p>
            </div>
          </div>
          <Button
            className="bg-purple-600 text-white hover:bg-purple-700 font-semibold"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleAdd}
          >
            新建工程
          </Button>
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索工程..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-slate-400" />}
          classNames={{
            input: "bg-white text-slate-800 placeholder:text-slate-400",
            inputWrapper: "bg-white border border-slate-200 hover:border-purple-300 shadow-sm"
          }}
        />

        {/* 工程列表 */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">暂无工程</p>
            <p className="text-slate-400 text-sm mt-1">点击"新建工程"开始创作</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <CardBody className="p-0">
                  {/* 封面区域 */}
                  <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 relative overflow-hidden">
                    {project.cover_url ? (
                      <img src={project.cover_url} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-purple-300" />
                      </div>
                    )}
                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        isIconOnly
                        className="bg-white/90 hover:bg-white shadow-sm"
                        onPress={() => handleEdit(project)}
                      >
                        <Edit className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        className="bg-white/90 hover:bg-red-50 shadow-sm"
                        onPress={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 信息区域 */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 line-clamp-1">{project.name}</h3>
                      <Chip size="sm" className={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Chip>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                      {project.description || '暂无描述'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <Clock className="w-3 h-3" />
                      <span>更新于 {formatDate(project.updated_at)}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* 编辑/新增对话框 */}
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          size="lg"
          classNames={{
            base: "bg-white border border-slate-200 shadow-xl",
            header: "border-b border-slate-200",
            body: "py-6"
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="text-slate-800 font-bold">
                  {editMode ? '编辑工程' : '新建工程'}
                </ModalHeader>
                <ModalBody className="space-y-4">
                  <Input
                    label="工程名称"
                    placeholder="输入工程名称"
                    value={formData.name}
                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-purple-300 shadow-sm"
                    }}
                  />
                  
                  <Textarea
                    label="工程描述"
                    placeholder="描述你的工程内容..."
                    value={formData.description}
                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                    minRows={3}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-purple-300 shadow-sm"
                    }}
                  />

                  {/* 工程状态 */}
                  <div>
                    <label className="text-sm text-slate-600 font-medium mb-2 block">工程状态</label>
                    <div className="flex gap-2">
                      {(['draft', 'in_progress', 'completed'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setFormData({ ...formData, status })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            formData.status === status
                              ? getStatusColor(status) + ' border-current'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {getStatusText(status)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="封面图片URL"
                    placeholder="图片地址（选填）"
                    value={formData.cover_url}
                    onValueChange={(val) => setFormData({ ...formData, cover_url: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-purple-300 shadow-sm"
                    }}
                  />
                </ModalBody>
                <ModalFooter className="border-t border-slate-200">
                  <Button variant="light" onPress={onClose} className="text-slate-600 font-semibold hover:bg-slate-100">
                    取消
                  </Button>
                  <Button className="bg-purple-600 text-white font-bold hover:bg-purple-700" onPress={handleSave}>
                    保存
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
};

export default Projects;
