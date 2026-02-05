import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Chip, Input, Textarea, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner } from '@heroui/react';
import { Plus, Cpu, Edit, Trash2, Search, Sparkles } from 'lucide-react';
import { getAuthToken } from '../../services/auth';
import AIModelSelector from '../../components/AIModelSelector';

interface PriceConfig {
  unit: string;
  price: number;
}

interface AIModel {
  id: number;
  name: string;
  category: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  provider: string;
  description?: string;
  is_active: number;
  api_key?: string;
  price_config: PriceConfig | string;
  request_method: string;
  url_template: string;
  headers_template: any;
  body_template?: any;
  default_params?: any;
  response_mapping: any;
  query_url_template?: string;
  query_method?: string;
  query_headers_template?: any;
  query_body_template?: any;
  query_response_mapping?: any;
  created_at: string;
  updated_at: string;
}

interface TextModel {
  id: number;
  name: string;
  provider: string;
  description?: string;
}

const AIModels: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isSmartOpen, onOpen: onSmartOpen, onClose: onSmartClose } = useDisclosure();
  
  const [textModels, setTextModels] = useState<TextModel[]>([]);
  const [smartMode, setSmartMode] = useState(false);
  const [importMode, setImportMode] = useState<'ai' | 'manual'>('ai'); // AI生成 or 手动导入
  const [selectedTextModel, setSelectedTextModel] = useState<string>('');
  const [apiDoc, setApiDoc] = useState('');
  const [jsonConfig, setJsonConfig] = useState(''); // 手动导入的 JSON 配置
  const [parsing, setParsing] = useState(false);
  

  const [formData, setFormData] = useState({
    name: '',
    category: 'TEXT' as 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO',
    provider: '',
    description: '',
    is_active: 1,
    api_key: '',
    priceUnit: 'token',
    priceValue: 0.0001,
    request_method: 'POST',
    url_template: '',
    headers_template: '{}',
    body_template: '{}',
    default_params: '{}',
    response_mapping: '{}',
    query_url_template: '',
    query_method: 'GET',
    query_headers_template: '{}',
    query_body_template: '{}',
    query_response_mapping: '{}'
  });

  useEffect(() => {
    fetchModels();
    fetchTextModels();
  }, []);

  const fetchTextModels = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/text-models', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTextModels(data.models || []);
        if (data.models.length > 0) {
          setSelectedTextModel(data.models[0].name);
        }
      }
    } catch (error) {
      console.error('获取文本模型列表失败:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/ai-models', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    const priceConfig = typeof model.price_config === 'string' 
      ? JSON.parse(model.price_config) 
      : model.price_config;
    
    setFormData({
      name: model.name,
      category: model.category,
      provider: model.provider,
      description: model.description || '',
      is_active: model.is_active,
      api_key: model.api_key || '',
      priceUnit: priceConfig.unit,
      priceValue: priceConfig.price,
      request_method: model.request_method,
      url_template: model.url_template,
      headers_template: typeof model.headers_template === 'string' ? model.headers_template : JSON.stringify(model.headers_template, null, 2),
      body_template: model.body_template ? (typeof model.body_template === 'string' ? model.body_template : JSON.stringify(model.body_template, null, 2)) : '{}',
      default_params: model.default_params ? (typeof model.default_params === 'string' ? model.default_params : JSON.stringify(model.default_params, null, 2)) : '{}',
      response_mapping: typeof model.response_mapping === 'string' ? model.response_mapping : JSON.stringify(model.response_mapping, null, 2),
      query_url_template: model.query_url_template || '',
      query_method: model.query_method || 'GET',
      query_headers_template: model.query_headers_template ? (typeof model.query_headers_template === 'string' ? model.query_headers_template : JSON.stringify(model.query_headers_template, null, 2)) : '{}',
      query_body_template: model.query_body_template ? (typeof model.query_body_template === 'string' ? model.query_body_template : JSON.stringify(model.query_body_template, null, 2)) : '{}',
      query_response_mapping: model.query_response_mapping ? (typeof model.query_response_mapping === 'string' ? model.query_response_mapping : JSON.stringify(model.query_response_mapping, null, 2)) : '{}'
    });
    onOpen();
  };

  const handleSave = async () => {
    try {
      const token = getAuthToken();
      const payload = {
        name: formData.name,
        category: formData.category,
        provider: formData.provider,
        description: formData.description,
        is_active: formData.is_active,
        api_key: formData.api_key || null,
        price_config: { unit: formData.priceUnit, price: formData.priceValue },
        request_method: formData.request_method,
        url_template: formData.url_template,
        headers_template: JSON.parse(formData.headers_template),
        body_template: formData.body_template ? JSON.parse(formData.body_template) : null,
        default_params: formData.default_params ? JSON.parse(formData.default_params) : null,
        response_mapping: JSON.parse(formData.response_mapping),
        query_url_template: formData.query_url_template || null,
        query_method: formData.query_method,
        query_headers_template: formData.query_headers_template ? JSON.parse(formData.query_headers_template) : null,
        query_body_template: formData.query_body_template ? JSON.parse(formData.query_body_template) : null,
        query_response_mapping: formData.query_response_mapping ? JSON.parse(formData.query_response_mapping) : null
      };

      const url = editingModel 
        ? `/api/admin/ai-models/${editingModel.id}`
        : '/api/admin/ai-models';
      
      const response = await fetch(url, {
        method: editingModel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchModels();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('保存模型失败:', error);
      alert('保存失败，请检查 JSON 格式是否正确');
    }
  };

  const handleDelete = async (modelId: number) => {
    if (!confirm('确定要删除此模型吗？')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/ai-models/${modelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchModels();
      }
    } catch (error) {
      console.error('删除模型失败:', error);
    }
  };

  const handleManualImport = () => {
    if (!jsonConfig.trim()) {
      alert('请输入 JSON 配置');
      return;
    }

    try {
      let content = jsonConfig.trim();
      
      // 1. 移除 <think> 标签
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      
      // 2. 清洗 markdown 代码块
      if (content.includes('```')) {
        content = content.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '');
      }
      
      // 3. 提取 JSON 对象 (更精准的提取方式)
      const firstOpen = content.indexOf('{');
      const lastClose = content.lastIndexOf('}');
      if (firstOpen === -1 || lastClose === -1) {
         throw new Error('未找到有效的 JSON 对象');
      }
      let jsonStr = content.substring(firstOpen, lastClose + 1);
      
      // ❌ 【已删除】旧代码：移除注释
      // jsonStr = jsonStr.replace(/\/\/.*$/gm, ''); 
      // ⚠️ 警告：上面这行绝对不能加！它会把 "https://..." 里的 // 当作注释删掉！

      // 4. 【核心修复】清洗控制字符 (解决 Bad control character)
      // 将所有换行符替换为空格（保证 JSON 结构），或者直接删除（修复断裂的 URL）
      // 这里采用策略：先尝试直接解析，如果失败，则进行激进清洗
      
      let config;
      try {
        config = JSON.parse(jsonStr);
      } catch (e) {
        // 如果解析失败，说明有非法字符。
        // 策略：把所有换行符(\n, \r)和制表符(\t)都干掉，把 JSON 压成一行
        // 注意：这能修复被换行截断的 URL，且合法的 JSON 是允许压成一行的
        const cleanStr = jsonStr.replace(/[\n\r\t]/g, '');
        config = JSON.parse(cleanStr);
      }
      
      // 填充表单
      setFormData({
        name: config.name || '',
        category: config.category || 'TEXT',
        provider: config.provider || '',
        description: config.description || '',
        is_active: 1,
        api_key: '',
        priceUnit: config.price_unit || 'token',
        priceValue: config.price_value || 0.0001,
        request_method: config.request_method || 'POST',
        url_template: config.url_template || '',
        headers_template: config.headers_template ? JSON.stringify(config.headers_template, null, 2) : '{}',
        body_template: config.body_template ? JSON.stringify(config.body_template, null, 2) : '{}',
        default_params: config.default_params ? JSON.stringify(config.default_params, null, 2) : '{}',
        response_mapping: config.response_mapping ? JSON.stringify(config.response_mapping, null, 2) : '{}',
        query_url_template: config.query_url_template || '',
        query_method: config.query_method || 'GET',
        query_headers_template: config.query_headers_template ? JSON.stringify(config.query_headers_template, null, 2) : '{}',
        query_body_template: config.query_body_template ? JSON.stringify(config.query_body_template, null, 2) : '{}',
        query_response_mapping: config.query_response_mapping ? JSON.stringify(config.query_response_mapping, null, 2) : '{}'
      });
      
      setSmartMode(false);
      onSmartClose();
      onOpen();
      alert('配置导入成功！请检查并保存');
    } catch (error) {
      console.error('JSON 解析失败:', error);
      alert(`JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSmartParse = async () => {
    if (!apiDoc.trim()) {
      alert('请输入API文档');
      return;
    }

    setParsing(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/ai-models/smart-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          apiDoc,
          modelName: selectedTextModel
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const config = data.config;
        
        setFormData({
          name: config.name || '',
          category: config.category || 'TEXT',
          provider: config.provider || '',
          description: config.description || '',
          is_active: 1,
          priceUnit: config.price_unit || 'token',
          priceValue: config.price_value || 0.0001,
          request_method: config.request_method || 'POST',
          url_template: config.url_template || '',
          headers_template: config.headers_template ? JSON.stringify(config.headers_template, null, 2) : '{}',
          body_template: config.body_template ? JSON.stringify(config.body_template, null, 2) : '{}',
          default_params: config.default_params ? JSON.stringify(config.default_params, null, 2) : '{}',
          response_mapping: config.response_mapping ? JSON.stringify(config.response_mapping, null, 2) : '{}',
          query_url_template: '',
          query_method: 'GET',
          query_headers_template: '{}',
          query_body_template: '{}',
          query_response_mapping: '{}'
        });

        onSmartClose();
        setSmartMode(false);
        onOpen();
      } else {
        alert(data.message || '解析失败');
      }
    } catch (error) {
      console.error('智能解析失败:', error);
      alert('解析失败，请检查网络连接');
    } finally {
      setParsing(false);
    }
  };

  const resetForm = () => {
    setEditingModel(null);
    setApiDoc('');
    setFormData({
      name: '',
      category: 'TEXT',
      provider: '',
      description: '',
      is_active: 1,
      api_key: '',
      priceUnit: 'token',
      priceValue: 0.0001,
      request_method: 'POST',
      url_template: '',
      headers_template: '{}',
      body_template: '{}',
      default_params: '{}',
      response_mapping: '{}',
      query_url_template: '',
      query_method: 'GET',
      query_headers_template: '{}',
      query_body_template: '{}',
      query_response_mapping: '{}'
    });
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      TEXT: 'bg-blue-100 text-blue-700',
      IMAGE: 'bg-purple-100 text-purple-700',
      VIDEO: 'bg-pink-100 text-pink-700',
      AUDIO: 'bg-emerald-100 text-emerald-700'
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const parsePrice = (priceConfig: any) => {
    try {
      const config = typeof priceConfig === 'string' ? JSON.parse(priceConfig) : priceConfig;
      return `¥${config.price}/${config.unit}`;
    } catch {
      return '¥0.00';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">AI 模型配置</h1>
          <p className="text-slate-500 mt-1">管理所有第三方 AI 模型接口配置</p>
        </div>
        <div className="flex gap-3">
          <Button
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl"
            startContent={<Sparkles className="w-4 h-4" />}
            onPress={() => {
              resetForm();
              setSmartMode(true);
              onSmartOpen();
            }}
          >
            智能添加
          </Button>
          <Button
            className="bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => {
              resetForm();
              setSmartMode(false);
              onOpen();
            }}
          >
            手动添加
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm mb-6">
        <CardBody className="p-6">
          <Input
            placeholder="搜索模型名称或厂商..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="w-4 h-4 text-slate-400" />}
            classNames={{
              inputWrapper: "bg-slate-50 border border-slate-200"
            }}
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">加载中...</div>
        ) : filteredModels.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">暂无模型配置</div>
        ) : (
          filteredModels.map((model) => (
            <Card key={model.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{model.name}</h3>
                      <p className="text-sm text-slate-500">{model.provider}</p>
                    </div>
                  </div>
                  <Chip 
                    size="sm" 
                    className={model.is_active ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-500 font-medium'}
                  >
                    {model.is_active ? '启用' : '禁用'}
                  </Chip>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">分类</span>
                    <Chip size="sm" className={getCategoryColor(model.category)}>
                      {model.category}
                    </Chip>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">价格</span>
                    <span className="font-medium text-slate-800">{parsePrice(model.price_config)}</span>
                  </div>
                  {model.description && (
                    <div className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {model.description}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => handleEdit(model)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-red-100 text-red-700 hover:bg-red-200 font-medium min-w-0 px-3"
                    onPress={() => handleDelete(model.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isSmartOpen} onClose={onSmartClose} size="3xl">
        <ModalContent>
          <ModalHeader className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            智能添加模型
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                💡 <strong>使用提示：</strong>
                {importMode === 'ai' ? '将API文档粘贴到下方，AI会自动解析并填充配置信息' : '直接粘贴完整的 JSON 配置，系统会自动清洗并导入'}
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                className={importMode === 'ai' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}
                onPress={() => setImportMode('ai')}
              >
                🤖 AI 生成
              </Button>
              <Button
                size="sm"
                className={importMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}
                onPress={() => setImportMode('manual')}
              >
                📋 手动导入
              </Button>
            </div>

            {importMode === 'ai' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">选择解析模型</label>
                  <AIModelSelector
                    models={textModels.map(m => ({ ...m, type: 'TEXT' }))}
                    selectedModel={selectedTextModel}
                    onModelChange={setSelectedTextModel}
                    filterType="TEXT"
                    placeholder="选择一个文本模型"
                    className="border-2 border-slate-200 hover:border-blue-400"
                  />
                </div>

            <Textarea
              label="API 文档"
              placeholder="粘贴完整的API文档，包括请求地址、请求方法、Headers、Body格式、响应格式等..."
              value={apiDoc}
              onChange={(e) => setApiDoc(e.target.value)}
              minRows={10}
              classNames={{
                input: "font-mono text-sm",
                inputWrapper: "bg-slate-50 border-2 border-slate-200"
              }}
              isRequired
            />
              </>
            )}

            {importMode === 'manual' && (
              <Textarea
                label="JSON 配置"
                placeholder='粘贴完整的 JSON 配置，例如：
{
  "name": "Gemini 3.0 Pro",
  "provider": "wuyinkeji",
  "category": "TEXT",
  "url_template": "https://api.example.com/chat",
  ...
}'
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                minRows={15}
                classNames={{
                  input: "font-mono text-xs",
                  inputWrapper: "bg-slate-50 border-2 border-slate-200"
                }}
                isRequired
              />
            )}

          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              className="bg-slate-100 text-slate-700 hover:bg-slate-200"
              onPress={onSmartClose}
              isDisabled={parsing}
            >
              取消
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
              onPress={importMode === 'ai' ? handleSmartParse : handleManualImport}
              isLoading={parsing}
              startContent={!parsing && <Sparkles className="w-4 h-4" />}
            >
              {parsing ? '解析中...' : (importMode === 'ai' ? '开始解析' : '导入配置')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="text-xl font-bold text-slate-800">
            {editingModel ? '编辑模型' : '添加模型'}
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="模型名称"
                placeholder="如: GPT-4o"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
              />
              <Input
                label="厂商标识"
                placeholder="如: openai"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                isRequired
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Select
                label="分类"
                selectedKeys={[formData.category]}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                isRequired
              >
                <SelectItem key="TEXT" value="TEXT">TEXT (文本)</SelectItem>
                <SelectItem key="IMAGE" value="IMAGE">IMAGE (图像)</SelectItem>
                <SelectItem key="VIDEO" value="VIDEO">VIDEO (视频)</SelectItem>
                <SelectItem key="AUDIO" value="AUDIO">AUDIO (音频)</SelectItem>
              </Select>

              <Select
                label="状态"
                selectedKeys={[String(formData.is_active)]}
                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
              >
                <SelectItem key="1" value="1">启用</SelectItem>
                <SelectItem key="0" value="0">禁用</SelectItem>
              </Select>

              <Select
                label="请求方法"
                selectedKeys={[formData.request_method]}
                onChange={(e) => setFormData({ ...formData, request_method: e.target.value })}
              >
                <SelectItem key="GET" value="GET">GET</SelectItem>
                <SelectItem key="POST" value="POST">POST</SelectItem>
                <SelectItem key="PUT" value="PUT">PUT</SelectItem>
                <SelectItem key="DELETE" value="DELETE">DELETE</SelectItem>
              </Select>
            </div>

            <Textarea
              label="描述"
              placeholder="模型描述信息"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              minRows={2}
            />

            <Input
              label="API Key"
              type="password"
              placeholder="留空则从环境变量获取"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              description="优先使用此处配置的 API Key，留空则使用环境变量"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="价格单位"
                placeholder="如: token, second, image"
                value={formData.priceUnit}
                onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
              />
              <Input
                type="number"
                label="单价"
                placeholder="0.0001"
                value={String(formData.priceValue)}
                onChange={(e) => setFormData({ ...formData, priceValue: parseFloat(e.target.value) || 0 })}
                step="0.0001"
              />
            </div>

            <Input
              label="URL 模板"
              placeholder="https://api.example.com/v1/{{action}}"
              value={formData.url_template}
              onChange={(e) => setFormData({ ...formData, url_template: e.target.value })}
              isRequired
            />

            <Textarea
              label="Headers 模板 (JSON)"
              placeholder='{"Authorization": "Bearer {{apiKey}}"}'
              value={formData.headers_template}
              onChange={(e) => setFormData({ ...formData, headers_template: e.target.value })}
              minRows={3}
              isRequired
            />

            <Textarea
              label="Body 模板 (JSON)"
              placeholder='{"prompt": "{{prompt}}"}'
              value={formData.body_template}
              onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
              minRows={3}
            />

            <Textarea
              label="默认参数 (JSON)"
              placeholder='{"temperature": 0.7}'
              value={formData.default_params}
              onChange={(e) => setFormData({ ...formData, default_params: e.target.value })}
              minRows={2}
            />

            <Textarea
              label="响应映射 (JSON)"
              placeholder='{"taskId": "data.id"}'
              value={formData.response_mapping}
              onChange={(e) => setFormData({ ...formData, response_mapping: e.target.value })}
              minRows={3}
              isRequired
            />

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-slate-700 mb-3">查询配置（可选）</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="查询 URL 模板"
                  placeholder="https://api.example.com/v1/tasks/{{taskId}}"
                  value={formData.query_url_template}
                  onChange={(e) => setFormData({ ...formData, query_url_template: e.target.value })}
                />
                <Select
                  label="查询方法"
                  selectedKeys={[formData.query_method]}
                  onChange={(e) => setFormData({ ...formData, query_method: e.target.value })}
                >
                  <SelectItem key="GET" value="GET">GET</SelectItem>
                  <SelectItem key="POST" value="POST">POST</SelectItem>
                </Select>
              </div>

              <Textarea
                label="查询 Headers (JSON)"
                value={formData.query_headers_template}
                onChange={(e) => setFormData({ ...formData, query_headers_template: e.target.value })}
                minRows={2}
              />

              <Textarea
                label="查询响应映射 (JSON)"
                value={formData.query_response_mapping}
                onChange={(e) => setFormData({ ...formData, query_response_mapping: e.target.value })}
                minRows={2}
                className="mt-4"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              className="bg-slate-100 text-slate-700 hover:bg-slate-200"
              onPress={onClose}
            >
              取消
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onPress={handleSave}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AIModels;
