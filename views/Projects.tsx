import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Spinner } from '@heroui/react';
import { FolderOpen, Plus, Edit, Trash2, Search, BookOpen, Clock, Palette, Sparkles } from 'lucide-react';
import { Project, fetchProjects, createProject, updateProject, deleteProject } from '../services/projects';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getAuthToken } from '../services/auth';

const LAST_PROJECT_KEY = 'nanostory_last_project_id';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_url: '',
    status: 'draft' as 'draft' | 'in_progress' | 'completed',
    visualStyle: '',
    visualStylePrompt: '',
    storyStyle: '',
    storyConstraints: ''
  });
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // 视觉风格预设
  const VISUAL_STYLE_PRESETS: Record<string, string> = {
    '日系动漫': 'anime style, cel shading, vibrant colors, clean lines, manga aesthetic, Japanese animation',
    '写实电影': 'photorealistic, cinematic lighting, film grain, realistic proportions, movie still, natural colors',
    '3D渲染': '3D render, Pixar style, soft lighting, subsurface scattering, smooth shading, CGI quality',
    '水彩绘本': 'watercolor illustration, soft edges, pastel colors, storybook style, hand-painted texture',
    '赛博朋克': 'cyberpunk, neon lights, dark atmosphere, futuristic, high contrast, sci-fi aesthetic',
    '美漫风格': 'American comic style, bold outlines, dynamic shading, superhero aesthetic, vivid colors',
    '像素风': 'pixel art style, retro game aesthetic, 16-bit, clean pixels, nostalgic',
    '国风水墨': 'Chinese ink painting style, traditional brush strokes, elegant, minimalist, oriental aesthetic'
  };

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
      status: 'draft',
      visualStyle: '',
      visualStylePrompt: '',
      storyStyle: '',
      storyConstraints: ''
    });
    onOpen();
  };

  const handleEdit = (project: Project) => {
    setEditMode(true);
    setCurrentId(project.id);
    let settings: any = {};
    try {
      settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    } catch { settings = {}; }
    setFormData({
      name: project.name,
      description: project.description,
      cover_url: project.cover_url,
      status: project.status,
      visualStyle: settings.visualStyle || '',
      visualStylePrompt: settings.visualStylePrompt || '',
      storyStyle: settings.storyStyle || '',
      storyConstraints: settings.storyConstraints || ''
    });
    onOpen();
  };

  const handleSave = async () => {
    try {
      const { visualStyle, visualStylePrompt, storyStyle, storyConstraints, ...rest } = formData;
      const settingsObj: any = {};
      if (visualStyle) settingsObj.visualStyle = visualStyle;
      if (visualStylePrompt) settingsObj.visualStylePrompt = visualStylePrompt;
      if (storyStyle) settingsObj.storyStyle = storyStyle;
      if (storyConstraints) settingsObj.storyConstraints = storyConstraints;
      const saveData = { ...rest, type: 'comic' as const, settings_json: JSON.stringify(settingsObj) };
      if (editMode && currentId) {
        await updateProject(currentId, saveData);
      } else {
        await createProject(saveData);
      }
      await loadProjects();
      onOpenChange();
    } catch (error: any) {
      console.error('保存工程失败:', error);
      showToast('保存工程失败，请稍后重试', 'error');
    }
  };

  const handleSelectVisualStyle = (label: string) => {
    if (formData.visualStyle === label) {
      setFormData({ ...formData, visualStyle: '', visualStylePrompt: '' });
    } else {
      setFormData({
        ...formData,
        visualStyle: label,
        visualStylePrompt: VISUAL_STYLE_PRESETS[label] || ''
      });
    }
  };

  // AI 智能推荐项目设置
  const handleAiSuggest = async () => {
    if (!formData.name && !formData.description) {
      showToast('请先填写项目名称或描述', 'warning');
      return;
    }

    setAiSuggesting(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/projects/suggest-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'AI推荐失败');
      }

      const data = await res.json();
      const { suggestions } = data;

      // 应用AI推荐
      setFormData(prev => ({
        ...prev,
        visualStyle: suggestions.visualStyle || prev.visualStyle,
        visualStylePrompt: suggestions.visualStylePrompt || prev.visualStylePrompt,
        storyStyle: suggestions.storyStyle || prev.storyStyle,
        storyConstraints: suggestions.storyConstraints || prev.storyConstraints
      }));

    } catch (error: any) {
      console.error('AI推荐失败:', error);
      showToast('AI推荐失败，请稍后重试', 'error');
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除工程',
      message: '确定要删除这个工程吗？',
      type: 'danger',
      confirmText: '删除'
    });
    if (!confirmed) return;
    
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (error: any) {
      console.error('删除工程失败:', error);
      showToast('删除工程失败，请稍后重试', 'error');
    }
  };

  const handleEnterProject = (project: Project) => {
    localStorage.setItem(LAST_PROJECT_KEY, project.id.toString());
    navigate('/');
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-[rgba(107,101,97,0.2)] text-[#a8a29e] border border-[rgba(168,162,158,0.3)]';
      case 'in_progress': return 'bg-[rgba(79,195,247,0.15)] text-[#4fc3f7] border border-[rgba(79,195,247,0.3)]';
      case 'completed': return 'bg-[rgba(105,240,174,0.15)] text-[#69f0ae] border border-[rgba(105,240,174,0.3)]';
      default: return 'bg-[rgba(107,101,97,0.2)] text-[#a8a29e] border border-[rgba(168,162,158,0.3)]';
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
    <div className="h-full bg-[var(--bg-app)] overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent-dark)]/30 rounded-xl blur-lg opacity-60" />
              <div className="relative p-2.5 bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-dark)]/30 rounded-xl border border-[var(--accent)]/30">
                <FolderOpen className="w-6 h-6 text-[var(--accent)]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold pro-title">我的工程</h1>
              <p className="text-sm text-[var(--text-muted)]">管理你的漫剧和剧本工程</p>
            </div>
          </div>
          <Button
            className="pro-btn-primary"
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
          startContent={<Search className="w-4 h-4 text-[var(--text-muted)]" />}
          classNames={{
            input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 focus-within:border-[var(--accent)]/40 shadow-sm"
          }}
        />

        {/* 工程列表 */}
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]">加载中...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto bg-[rgba(30,35,60,0.6)] rounded-full flex items-center justify-center mb-4 border border-[rgba(255,255,255,0.08)]">
              <FolderOpen className="w-10 h-10 text-[#6b6561]" />
            </div>
            <p className="text-[#a8a29e] font-medium">暂无工程</p>
            <p className="text-[#6b6561] text-sm mt-1">点击"新建工程"开始创作</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="pro-card cursor-pointer group"
                onDoubleClick={() => handleEnterProject(project)}
              >
                <CardBody className="p-0">
                  {/* 封面区域 */}
                  <div 
                    className="h-32 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-input)] relative overflow-hidden rounded-t-2xl"
                    onDoubleClick={() => handleEnterProject(project)}
                  >
                    {project.cover_url ? (
                      <img src={project.cover_url} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-[var(--accent)]/30" />
                      </div>
                    )}
                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        isIconOnly
                        className="bg-[var(--bg-elevated)] backdrop-blur-sm hover:bg-[var(--bg-card)] shadow-lg border border-[var(--border-color)] cursor-pointer"
                        onPress={() => handleEdit(project)}
                      >
                        <Edit className="w-4 h-4 text-[var(--text-primary)]" />
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        className="bg-[var(--bg-elevated)] backdrop-blur-sm hover:bg-red-500/20 shadow-lg border border-[var(--border-color)] cursor-pointer"
                        onPress={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 信息区域 */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-1">{project.name}</h3>
                      <Chip size="sm" className={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Chip>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 min-h-[40px]">
                      {project.description || '暂无描述'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
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
            backdrop: 'bg-black/60 backdrop-blur-sm',
            base: 'bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-2xl',
            header: 'border-b border-[var(--border-color)]',
            body: 'py-6',
            footer: 'border-t border-[var(--border-color)]',
            closeButton: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="text-[var(--text-primary)] font-bold">
                  {editMode ? '编辑工程' : '新建工程'}
                </ModalHeader>
                <ModalBody className="space-y-4">
                  <Input
                    label="工程名称"
                    placeholder="输入工程名称"
                    value={formData.name}
                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 focus-within:border-[var(--accent)]/40"
                    }}
                  />
                  
                  <Textarea
                    label="工程描述"
                    placeholder="描述你的工程内容..."
                    value={formData.description}
                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                    minRows={3}
                    classNames={{
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 focus-within:border-[var(--accent)]/40"
                    }}
                  />

                  {/* AI 智能推荐按钮 */}
                  <Button
                    className="w-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-300 font-medium hover:from-violet-500/30 hover:to-purple-500/30 transition-all cursor-pointer"
                    startContent={aiSuggesting ? <Spinner size="sm" color="secondary" /> : <Sparkles className="w-4 h-4" />}
                    onPress={handleAiSuggest}
                    isDisabled={aiSuggesting}
                  >
                    {aiSuggesting ? 'AI 分析中...' : 'AI 智能推荐项目设置'}
                  </Button>

                  {/* 工程状态 */}
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] font-medium mb-2 block">工程状态</label>
                    <div className="flex gap-2">
                      {(['draft', 'in_progress', 'completed'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setFormData({ ...formData, status })}
                          className={`px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                            formData.status === status
                              ? getStatusColor(status)
                              : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:border-[var(--border-color)]'
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
                      input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      label: "text-[var(--text-secondary)] font-medium",
                      inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 focus-within:border-[var(--accent)]/40"
                    }}
                  />

                  {/* 视觉风格选择 */}
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[var(--accent)]" />
                      视觉风格
                      <span className="text-xs text-[var(--text-muted)] font-normal">（统一所有图片/视频的画风）</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {Object.keys(VISUAL_STYLE_PRESETS).map((label) => (
                        <button
                          key={label}
                          onClick={() => handleSelectVisualStyle(label)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            formData.visualStyle === label
                              ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {formData.visualStyle && (
                      <p className="text-xs text-[var(--text-muted)] mt-1.5 truncate" title={formData.visualStylePrompt}>
                        Prompt: {formData.visualStylePrompt}
                      </p>
                    )}
                    <Input
                      size="sm"
                      placeholder="自定义英文风格提示词（覆盖预设）"
                      value={formData.visualStylePrompt}
                      onValueChange={(val) => setFormData({ ...formData, visualStylePrompt: val })}
                      className="mt-2"
                      classNames={{
                        input: "bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs",
                        inputWrapper: "bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)]/30 h-8 min-h-8"
                      }}
                    />
                  </div>

                  {/* 叙事风格 */}
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="叙事风格"
                      placeholder="如：热血少年漫、悬疑推理..."
                      value={formData.storyStyle}
                      onValueChange={(val) => setFormData({ ...formData, storyStyle: val })}
                      classNames={{
                        input: "bg-transparent text-[#e8e4dc] placeholder:text-[#6b6561]",
                        label: "text-[#a8a29e] font-medium",
                        inputWrapper: "bg-[rgba(30,35,60,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(230,200,122,0.3)] focus-within:border-[rgba(230,200,122,0.4)]"
                      }}
                    />
                    <Input
                      label="剧本约束"
                      placeholder="如：不要魔法元素、现代都市..."
                      value={formData.storyConstraints}
                      onValueChange={(val) => setFormData({ ...formData, storyConstraints: val })}
                      classNames={{
                        input: "bg-transparent text-[#e8e4dc] placeholder:text-[#6b6561]",
                        label: "text-[#a8a29e] font-medium",
                        inputWrapper: "bg-[rgba(30,35,60,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(230,200,122,0.3)] focus-within:border-[rgba(230,200,122,0.4)]"
                      }}
                    />
                  </div>
                </ModalBody>
                <ModalFooter className="gap-2">
                  <Button variant="flat" onPress={onClose} className="bg-white/5 text-[var(--text-secondary)] font-semibold hover:bg-white/10 border border-white/10 cursor-pointer">
                    取消
                  </Button>
                  <Button className="pro-btn-primary" onPress={handleSave}>
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
