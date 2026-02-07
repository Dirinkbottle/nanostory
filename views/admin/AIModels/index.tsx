import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Input, useDisclosure } from '@heroui/react';
import { Plus, Search, Sparkles } from 'lucide-react';
import { getAuthToken } from '../../../services/auth';
import { useWorkflow } from '../../../hooks/useWorkflow';
import { AIModel, TextModel, ModelFormData, DEFAULT_FORM_DATA } from './types';
import ModelCard from './ModelCard';
import SmartImportModal from './SmartImportModal';
import ModelFormModal from './ModelFormModal';
import ModelTestModal from './ModelTest';

const AIModels: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [testingModel, setTestingModel] = useState<AIModel | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isSmartOpen, onOpen: onSmartOpen, onClose: onSmartClose } = useDisclosure();
  const { isOpen: isTestOpen, onOpen: onTestOpen, onClose: onTestClose } = useDisclosure();
  
  const [textModels, setTextModels] = useState<TextModel[]>([]);
  const [smartMode, setSmartMode] = useState(false);
  const [importMode, setImportMode] = useState<'ai' | 'manual'>('ai');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('');
  const [apiDoc, setApiDoc] = useState('');
  const [jsonConfig, setJsonConfig] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseJobId, setParseJobId] = useState<number | null>(null);

  // 工作流轮询：智能解析完成后自动填充表单
  const { job: parseJob, isRunning: isParseRunning, overallProgress: parseProgress } = useWorkflow(parseJobId, {
    onCompleted: (completedJob) => {
      setParseJobId(null);
      setParsing(false);
      const task = completedJob.tasks?.[0];
      const config = task?.result_data?.config || task?.result_data;
      if (config && typeof config === 'object' && config.name) {
        const toJson = (v: any) => v ? (typeof v === 'string' ? v : JSON.stringify(v, null, 2)) : '{}';
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
          headers_template: toJson(config.headers_template),
          body_template: toJson(config.body_template),
          default_params: toJson(config.default_params),
          response_mapping: toJson(config.response_mapping),
          query_url_template: config.query_url_template || '',
          query_method: config.query_method || 'GET',
          query_headers_template: toJson(config.query_headers_template),
          query_body_template: toJson(config.query_body_template),
          query_response_mapping: toJson(config.query_response_mapping),
          query_success_condition: config.query_success_condition || '',
          query_fail_condition: config.query_fail_condition || '',
          query_success_mapping: toJson(config.query_success_mapping),
          query_fail_mapping: toJson(config.query_fail_mapping)
        });
        onSmartClose();
        setSmartMode(false);
        // 延迟打开表单，确保 smart modal 先关闭
        setTimeout(() => onOpen(), 300);
      } else {
        console.error('[SmartParse] 解析结果:', task?.result_data);
        alert('解析完成但未返回有效配置');
      }
    },
    onFailed: (failedJob) => {
      setParseJobId(null);
      setParsing(false);
      alert('解析失败：' + (failedJob.error_message || '未知错误'));
    }
  });

  const [formData, setFormData] = useState<ModelFormData>({ ...DEFAULT_FORM_DATA });

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
      query_response_mapping: model.query_response_mapping ? (typeof model.query_response_mapping === 'string' ? model.query_response_mapping : JSON.stringify(model.query_response_mapping, null, 2)) : '{}',
      query_success_condition: model.query_success_condition || '',
      query_fail_condition: model.query_fail_condition || '',
      query_success_mapping: model.query_success_mapping ? (typeof model.query_success_mapping === 'string' ? model.query_success_mapping : JSON.stringify(model.query_success_mapping, null, 2)) : '{}',
      query_fail_mapping: model.query_fail_mapping ? (typeof model.query_fail_mapping === 'string' ? model.query_fail_mapping : JSON.stringify(model.query_fail_mapping, null, 2)) : '{}',
      custom_handler: model.custom_handler || '',
      custom_query_handler: model.custom_query_handler || ''
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
        query_response_mapping: formData.query_response_mapping ? JSON.parse(formData.query_response_mapping) : null,
        query_success_condition: formData.query_success_condition || null,
        query_fail_condition: formData.query_fail_condition || null,
        query_success_mapping: formData.query_success_mapping ? JSON.parse(formData.query_success_mapping) : null,
        query_fail_mapping: formData.query_fail_mapping ? JSON.parse(formData.query_fail_mapping) : null,
        custom_handler: formData.custom_handler || null,
        custom_query_handler: formData.custom_query_handler || null
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
      
      // 3. 提取 JSON 对象
      const firstOpen = content.indexOf('{');
      const lastClose = content.lastIndexOf('}');
      if (firstOpen === -1 || lastClose === -1) {
         throw new Error('未找到有效的 JSON 对象');
      }
      let jsonStr = content.substring(firstOpen, lastClose + 1);

      let config;
      try {
        config = JSON.parse(jsonStr);
      } catch (e) {
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
        query_response_mapping: config.query_response_mapping ? JSON.stringify(config.query_response_mapping, null, 2) : '{}',
        query_success_condition: config.query_success_condition || '',
        query_fail_condition: config.query_fail_condition || '',
        query_success_mapping: config.query_success_mapping ? JSON.stringify(config.query_success_mapping, null, 2) : '{}',
        query_fail_mapping: config.query_fail_mapping ? JSON.stringify(config.query_fail_mapping, null, 2) : '{}'
      });
      
      setSmartMode(false);
      onSmartClose();
      // 延迟打开表单，确保 smart modal 先关闭
      setTimeout(() => onOpen(), 300);
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
          textModel: selectedTextModel
        })
      });

      const data = await response.json();

      if (response.ok && data.jobId) {
        setParseJobId(data.jobId);
      } else {
        setParsing(false);
        alert(data.message || '启动解析任务失败');
      }
    } catch (error) {
      console.error('智能解析失败:', error);
      setParsing(false);
      alert('解析失败，请检查网络连接');
    }
  };

  const resetForm = () => {
    setEditingModel(null);
    setApiDoc('');
    setFormData({ ...DEFAULT_FORM_DATA });
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <ModelCard
              key={model.id}
              model={model}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTest={(m) => { setTestingModel(m); onTestOpen(); }}
            />
          ))
        )}
      </div>

      <SmartImportModal
        isOpen={isSmartOpen}
        onClose={onSmartClose}
        importMode={importMode}
        setImportMode={setImportMode}
        textModels={textModels}
        selectedTextModel={selectedTextModel}
        onModelChange={setSelectedTextModel}
        apiDoc={apiDoc}
        onApiDocChange={setApiDoc}
        jsonConfig={jsonConfig}
        onJsonConfigChange={setJsonConfig}
        parsing={parsing}
        isParseRunning={isParseRunning}
        parseProgress={parseProgress}
        parseJob={parseJob}
        onSmartParse={handleSmartParse}
        onManualImport={handleManualImport}
      />

      <ModelFormModal
        isOpen={isOpen}
        onClose={onClose}
        editingModel={editingModel}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
      />

      <ModelTestModal
        isOpen={isTestOpen}
        onClose={onTestClose}
        model={testingModel}
      />
    </div>
  );
};

export default AIModels;
