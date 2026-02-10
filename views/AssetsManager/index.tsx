import React, { useState, useEffect } from 'react';
import { Button, Input, Tabs, Tab, useDisclosure } from '@heroui/react';
import { Users, MapPin, FileText, Plus, Search } from 'lucide-react';
import { getAuthToken } from '../../services/auth';
import { useSceneImageGeneration } from '../StoryBoard/hooks/useSceneImageGeneration';
import SceneDetailModal from '../StoryBoard/ResourcePanel/SceneDetailModal';
import { 
  Character, Scene, Prop,
  fetchCharacters, fetchScenes, fetchProps,
  createCharacter, createScene, createProp,
  updateCharacter, updateScene, updateProp,
  deleteCharacter, deleteScene, deleteProp
} from '../../services/assets';
import CharacterList from './CharacterList';
import SceneList from './SceneList';
import PropList from './PropList';
import { CharacterModal, SceneModal, PropModal } from './AssetModel';

type TabType = 'characters' | 'scenes' | 'props';

const AssetsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // 场景详情模态框
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    appearance: '',
    personality: '',
    environment: '',
    lighting: '',
    mood: '',
    category: '',
    image_url: '',
    tags: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // 场景图片生成轮询
  const { isGenerating } = useSceneImageGeneration({
    sceneId: selectedScene?.id?.toString() || null,
    projectId: null, // AssetsManager 不关联项目
    isActive: activeTab === 'scenes' && isDetailOpen,
    onComplete: () => {
      loadData(); // 刷新场景列表
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'characters') {
        const data = await fetchCharacters();
        setCharacters(data);
      } else if (activeTab === 'scenes') {
        const data = await fetchScenes();
        setScenes(data);
      } else {
        const data = await fetchProps();
        setProps(data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'characters': return '角色';
      case 'scenes': return '场景';
      case 'props': return '道具';
    }
  };

  const handleAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setFormData({
      name: '',
      description: '',
      appearance: '',
      personality: '',
      environment: '',
      lighting: '',
      mood: '',
      category: '',
      image_url: '',
      tags: ''
    });
    onOpen();
  };

  const handleEdit = (item: Character | Scene | Prop) => {
    setEditMode(true);
    setCurrentId(item.id);
    setFormData(item);
    onOpen();
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'characters') {
        if (editMode && currentId) {
          await updateCharacter(currentId, formData);
        } else {
          await createCharacter(formData);
        }
      } else if (activeTab === 'scenes') {
        if (editMode && currentId) {
          await updateScene(currentId, formData);
        } else {
          await createScene(formData);
        }
      } else {
        if (editMode && currentId) {
          await updateProp(currentId, formData);
        } else {
          await createProp(formData);
        }
      }
      await loadData();
      onOpenChange();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除吗？')) return;
    
    try {
      if (activeTab === 'characters') {
        await deleteCharacter(id);
      } else if (activeTab === 'scenes') {
        await deleteScene(id);
      } else {
        await deleteProp(id);
      }
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // 查看场景详情
  const handleViewSceneDetail = (scene: Scene) => {
    setSelectedScene(scene);
    onDetailOpen();
  };

  // 生成场景图片
  const handleGenerateSceneImage = async (sceneId: number, style: string, imageModel: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/scenes/${sceneId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          style, 
          imageModel, 
          width: 1024, 
          height: 576 
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '启动生成失败');
      }
      
      const data = await res.json();
      console.log('[AssetsManager] 场景图片生成已启动:', data.jobId);
    } catch (error: any) {
      console.error('[AssetsManager] 生成场景图片失败:', error);
      alert('生成场景图片失败: ' + error.message);
      throw error;
    }
  };

  const filteredCharacters = characters.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.tags && c.tags.toLowerCase().includes(q)) ||
      (c.project_name && c.project_name.toLowerCase().includes(q));
  });

  const filteredScenes = scenes.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags && s.tags.toLowerCase().includes(q)) ||
      (s.project_name && s.project_name.toLowerCase().includes(q));
  });

  const filteredProps = props.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags && p.tags.toLowerCase().includes(q));
  });

  return (
    <div className="h-full bg-[#0a0a0f] overflow-hidden p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">资产管理</h1>
          <Button
            className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/20"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleAdd}
          >
            新建{getTabLabel()}
          </Button>
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索资产..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-slate-400" />}
          classNames={{
            input: "bg-transparent text-slate-100",
            inputWrapper: "bg-slate-800/60 border border-slate-600/50 hover:border-blue-500/50 shadow-sm"
          }}
        />

        {/* 标签页 */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as TabType)}
          classNames={{
            tabList: "bg-slate-900/80 border border-slate-700/50 shadow-sm",
            tab: "text-slate-400 data-[selected=true]:text-blue-400 font-medium",
            cursor: "bg-blue-500"
          }}
        >
          <Tab
            key="characters"
            title={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>角色 ({characters.length})</span>
              </div>
            }
          >
            <CharacterList 
              characters={filteredCharacters} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          </Tab>

          <Tab
            key="scenes"
            title={
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>场景 ({scenes.length})</span>
              </div>
            }
          >
            <SceneList 
              scenes={filteredScenes} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onViewDetail={handleViewSceneDetail}
            />
          </Tab>

          <Tab
            key="props"
            title={
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>道具 ({props.length})</span>
              </div>
            }
          >
            <PropList 
              props={filteredProps} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          </Tab>
        </Tabs>

        {/* 编辑/新增对话框 */}
        {activeTab === 'characters' && (
          <CharacterModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            editMode={editMode}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
          />
        )}
        
        {activeTab === 'scenes' && (
          <SceneModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            editMode={editMode}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
          />
        )}
        
        {activeTab === 'props' && (
          <PropModal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            editMode={editMode}
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
          />
        )}

        {/* 场景详情模态框 */}
        <SceneDetailModal
          isOpen={isDetailOpen}
          onClose={onDetailOpenChange}
          scene={selectedScene}
          onGenerateImage={(sceneId: number, imageModel: string) => handleGenerateSceneImage(sceneId, '', imageModel)}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};

export default AssetsManager;
