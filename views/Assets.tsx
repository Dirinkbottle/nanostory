import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react';
import { Users, MapPin, FileText, Plus, Edit, Trash2, Search } from 'lucide-react';
import { 
  Character, Scene, ScriptAsset,
  fetchCharacters, fetchScenes, fetchScriptAssets,
  createCharacter, createScene, createScriptAsset,
  updateCharacter, updateScene, updateScriptAsset,
  deleteCharacter, deleteScene, deleteScriptAsset
} from '../services/assets';

type TabType = 'characters' | 'scenes' | 'scripts';

const Assets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scripts, setScripts] = useState<ScriptAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    appearance: '',
    personality: '',
    environment: '',
    lighting: '',
    mood: '',
    content: '',
    genre: '',
    duration: '',
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
      } else if (activeTab === 'scenes') {
        const data = await fetchScenes();
        setScenes(data);
      } else {
        const data = await fetchScriptAssets();
        setScripts(data);
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
      case 'scripts': return '剧本';
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
      content: '',
      genre: '',
      duration: '',
      image_url: '',
      tags: ''
    });
    onOpen();
  };

  const handleEdit = (item: Character | Scene | ScriptAsset) => {
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
          await updateScriptAsset(currentId, formData);
        } else {
          await createScriptAsset(formData);
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
        await deleteScriptAsset(id);
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

  const filteredScripts = scripts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-slate-50 overflow-hidden p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">资源管理</h1>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleAdd}
          >
            新建{getTabLabel()}
          </Button>
        </div>

        {/* 搜索 */}
        <Input
          placeholder="搜索资源..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-slate-400" />}
          classNames={{
            input: "bg-white text-slate-800 placeholder:text-slate-400",
            inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
          }}
        />

        {/* 标签页 */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as TabType)}
          classNames={{
            tabList: "bg-white border border-slate-200 shadow-sm",
            tab: "text-slate-600 data-[selected=true]:text-blue-600 font-medium",
            cursor: "bg-blue-100"
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
                <Card key={character.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-slate-800">{character.name}</h3>
                      <div className="flex gap-1">
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleEdit(character)} className="hover:bg-blue-50">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleDelete(character.id)} className="hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{character.description}</p>
                    {character.tags && (
                      <div className="flex flex-wrap gap-2">
                        {character.tags.split(',').map((tag, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-blue-50 text-blue-600 font-medium">{tag.trim()}</Chip>
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
                <Card key={scene.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-slate-800">{scene.name}</h3>
                      <div className="flex gap-1">
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleEdit(scene)} className="hover:bg-blue-50">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleDelete(scene.id)} className="hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{scene.description}</p>
                    {scene.tags && (
                      <div className="flex flex-wrap gap-2">
                        {scene.tags.split(',').map((tag, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-sky-50 text-sky-600 font-medium">{tag.trim()}</Chip>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </Tab>

          <Tab
            key="scripts"
            title={
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>剧本 ({scripts.length})</span>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filteredScripts.map((script) => (
                <Card key={script.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-slate-800">{script.name}</h3>
                      <div className="flex gap-1">
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleEdit(script)} className="hover:bg-blue-50">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" isIconOnly variant="light" onPress={() => handleDelete(script.id)} className="hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">{script.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {script.genre && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">{script.genre}</span>}
                      {script.duration && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">{script.duration}</span>}
                    </div>
                    {script.tags && (
                      <div className="flex flex-wrap gap-2">
                        {script.tags.split(',').map((tag, idx) => (
                          <Chip key={idx} size="sm" variant="flat" className="bg-purple-50 text-purple-600 font-medium">{tag.trim()}</Chip>
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
          scrollBehavior="inside"
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
                  {editMode ? '编辑' : '新建'}{getTabLabel()}
                </ModalHeader>
                <ModalBody className="space-y-4">
                  <Input
                    label="名称"
                    placeholder={`输入${getTabLabel()}名称`}
                    value={formData.name}
                    onValueChange={(val) => setFormData({ ...formData, name: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                    }}
                  />
                  
                  <Textarea
                    label="描述"
                    placeholder="输入详细描述"
                    value={formData.description}
                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                    minRows={3}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                    }}
                  />

                  {activeTab === 'characters' && (
                    <>
                      <Input
                        label="外貌"
                        placeholder="外貌特征"
                        value={formData.appearance}
                        onValueChange={(val) => setFormData({ ...formData, appearance: val })}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                      <Input
                        label="性格"
                        placeholder="性格特点"
                        value={formData.personality}
                        onValueChange={(val) => setFormData({ ...formData, personality: val })}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                    </>
                  )}

                  {activeTab === 'scenes' && (
                    <>
                      <Input
                        label="环境"
                        placeholder="环境描述"
                        value={formData.environment}
                        onValueChange={(val) => setFormData({ ...formData, environment: val })}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                      <Input
                        label="光线"
                        placeholder="光线效果"
                        value={formData.lighting}
                        onValueChange={(val) => setFormData({ ...formData, lighting: val })}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                      <Input
                        label="氛围"
                        placeholder="氛围感觉"
                        value={formData.mood}
                        onValueChange={(val) => setFormData({ ...formData, mood: val })}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                    </>
                  )}

                  {activeTab === 'scripts' && (
                    <>
                      <Textarea
                        label="剧本内容"
                        placeholder="输入剧本正文内容..."
                        value={formData.content}
                        onValueChange={(val) => setFormData({ ...formData, content: val })}
                        minRows={6}
                        classNames={{
                          input: "bg-white text-slate-800 placeholder:text-slate-400",
                          label: "text-slate-600 font-medium",
                          inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                        }}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="类型/风格"
                          placeholder="如：悬疑、爱情、科幻"
                          value={formData.genre}
                          onValueChange={(val) => setFormData({ ...formData, genre: val })}
                          classNames={{
                            input: "bg-white text-slate-800 placeholder:text-slate-400",
                            label: "text-slate-600 font-medium",
                            inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                          }}
                        />
                        <Input
                          label="预计时长"
                          placeholder="如：3分钟、5-10分钟"
                          value={formData.duration}
                          onValueChange={(val) => setFormData({ ...formData, duration: val })}
                          classNames={{
                            input: "bg-white text-slate-800 placeholder:text-slate-400",
                            label: "text-slate-600 font-medium",
                            inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                          }}
                        />
                      </div>
                    </>
                  )}

                  <Input
                    label="图片URL"
                    placeholder="图片地址（选填）"
                    value={formData.image_url}
                    onValueChange={(val) => setFormData({ ...formData, image_url: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                    }}
                  />

                  <Input
                    label="标签"
                    placeholder="用逗号分隔，如：主角,勇敢,战士"
                    value={formData.tags}
                    onValueChange={(val) => setFormData({ ...formData, tags: val })}
                    classNames={{
                      input: "bg-white text-slate-800 placeholder:text-slate-400",
                      label: "text-slate-600 font-medium",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300 shadow-sm"
                    }}
                  />
                </ModalBody>
                <ModalFooter className="border-t border-slate-200">
                  <Button variant="light" onPress={onClose} className="text-slate-600 font-semibold hover:bg-slate-100">
                    取消
                  </Button>
                  <Button className="bg-blue-600 text-white font-bold hover:bg-blue-700" onPress={handleSave}>
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
