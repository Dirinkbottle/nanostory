import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react';
import { Users, MapPin, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Character, Scene, fetchCharacters, fetchScenes, createCharacter, createScene, updateCharacter, updateScene, deleteCharacter, deleteScene } from '../services/assets';

const Assets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'characters' | 'scenes'>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    appearance: '',
    personality: '',
    environment: '',
    lighting: '',
    mood: '',
    image_url: '',
    tags: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'characters') {
        const data = await fetchCharacters();
        setCharacters(data);
      } else {
        const data = await fetchScenes();
        setScenes(data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
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
      appearance: '',
      personality: '',
      environment: '',
      lighting: '',
      mood: '',
      image_url: '',
      tags: ''
    });
    onOpen();
  };

  const handleEdit = (item: Character | Scene) => {
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
      } else {
        if (editMode && currentId) {
          await updateScene(currentId, formData);
        } else {
          await createScene(formData);
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
      } else {
        await deleteScene(id);
      }
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScenes = scenes.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-black overflow-hidden p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-light text-white">资源管理</h1>
          <Button
            className="bg-white text-black hover:bg-white/90"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleAdd}
          >
            新建{activeTab === 'characters' ? '角色' : '场景'}
          </Button>
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索资源..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-white/40" />}
          classNames={{
            input: "bg-transparent text-white",
            inputWrapper: "bg-white/5 border-white/10"
          }}
        />

        {/* 标签页 */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as 'characters' | 'scenes')}
          classNames={{
            tabList: "bg-white/5 border-white/10",
            tab: "text-white/60 data-[selected=true]:text-white",
            cursor: "bg-white/20"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filteredCharacters.map((character) => (
                <Card key={character.id} className="bg-white/5 border-white/10">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-white">{character.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          isIconOnly
                          variant="light"
                          onPress={() => handleEdit(character)}
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="light"
                          onPress={() => handleDelete(character.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">{character.description}</p>
                    {character.tags && (
                      <div className="flex flex-wrap gap-2">
                        {character.tags.split(',').map((tag, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-white/10 text-white/70">
                            {tag.trim()}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filteredScenes.map((scene) => (
                <Card key={scene.id} className="bg-white/5 border-white/10">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-white">{scene.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          isIconOnly
                          variant="light"
                          onPress={() => handleEdit(scene)}
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="light"
                          onPress={() => handleDelete(scene.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">{scene.description}</p>
                    {scene.tags && (
                      <div className="flex flex-wrap gap-2">
                        {scene.tags.split(',').map((tag, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-white/10 text-white/70">
                            {tag.trim()}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>
        </Tabs>

        {/* 编辑/新增对话框 */}
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          size="2xl"
          classNames={{
            base: "bg-slate-900 border border-white/10",
            header: "border-b border-white/10",
            body: "py-6"
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="text-white">
                  {editMode ? '编辑' : '新建'}{activeTab === 'characters' ? '角色' : '场景'}
                </ModalHeader>
                <ModalBody className="space-y-4">
                  <Input
                    label="名称"
                    placeholder={`输入${activeTab === 'characters' ? '角色' : '场景'}名称`}
                    value={formData.name}
                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                    classNames={{
                      input: "bg-transparent text-white",
                      label: "text-white/60",
                      inputWrapper: "bg-white/5 border-white/10"
                    }}
                  />
                  
                  <Textarea
                    label="描述"
                    placeholder="输入详细描述"
                    value={formData.description}
                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                    minRows={3}
                    classNames={{
                      input: "bg-transparent text-white",
                      label: "text-white/60",
                      inputWrapper: "bg-white/5 border-white/10"
                    }}
                  />

                  {activeTab === 'characters' ? (
                    <>
                      <Input
                        label="外貌"
                        placeholder="外貌特征"
                        value={formData.appearance}
                        onValueChange={(val) => setFormData({ ...formData, appearance: val })}
                        classNames={{
                          input: "bg-transparent text-white",
                          label: "text-white/60",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <Input
                        label="性格"
                        placeholder="性格特点"
                        value={formData.personality}
                        onValueChange={(val) => setFormData({ ...formData, personality: val })}
                        classNames={{
                          input: "bg-transparent text-white",
                          label: "text-white/60",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        label="环境"
                        placeholder="环境描述"
                        value={formData.environment}
                        onValueChange={(val) => setFormData({ ...formData, environment: val })}
                        classNames={{
                          input: "bg-transparent text-white",
                          label: "text-white/60",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <Input
                        label="光线"
                        placeholder="光线效果"
                        value={formData.lighting}
                        onValueChange={(val) => setFormData({ ...formData, lighting: val })}
                        classNames={{
                          input: "bg-transparent text-white",
                          label: "text-white/60",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                      <Input
                        label="氛围"
                        placeholder="氛围感觉"
                        value={formData.mood}
                        onValueChange={(val) => setFormData({ ...formData, mood: val })}
                        classNames={{
                          input: "bg-transparent text-white",
                          label: "text-white/60",
                          inputWrapper: "bg-white/5 border-white/10"
                        }}
                      />
                    </>
                  )}

                  <Input
                    label="图片URL"
                    placeholder="图片地址（选填）"
                    value={formData.image_url}
                    onValueChange={(val) => setFormData({ ...formData, image_url: val })}
                    classNames={{
                      input: "bg-transparent text-white",
                      label: "text-white/60",
                      inputWrapper: "bg-white/5 border-white/10"
                    }}
                  />

                  <Input
                    label="标签"
                    placeholder="用逗号分隔，如：主角,勇敢,战士"
                    value={formData.tags}
                    onValueChange={(val) => setFormData({ ...formData, tags: val })}
                    classNames={{
                      input: "bg-transparent text-white",
                      label: "text-white/60",
                      inputWrapper: "bg-white/5 border-white/10"
                    }}
                  />
                </ModalBody>
                <ModalFooter className="border-t border-white/10">
                  <Button variant="light" onPress={onClose} className="text-white/60">
                    取消
                  </Button>
                  <Button className="bg-white text-black" onPress={handleSave}>
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

export default Assets;
