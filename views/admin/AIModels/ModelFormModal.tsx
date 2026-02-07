import React from 'react';
import { Button, Input, Textarea, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { AIModel, ModelFormData } from './types';

interface ModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingModel: AIModel | null;
  formData: ModelFormData;
  setFormData: (data: ModelFormData) => void;
  onSave: () => void;
}

const ModelFormModal: React.FC<ModelFormModalProps> = ({
  isOpen,
  onClose,
  editingModel,
  formData,
  setFormData,
  onSave
}) => {
  return (
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
              label="查询 Body 模板 (JSON)"
              placeholder='{"task_id": "{{taskId}}"}'
              value={formData.query_body_template}
              onChange={(e) => setFormData({ ...formData, query_body_template: e.target.value })}
              minRows={2}
              className="mt-4"
              description="查询方法为 POST 时使用"
            />

            <Textarea
              label="查询响应映射 (JSON)"
              value={formData.query_response_mapping}
              onChange={(e) => setFormData({ ...formData, query_response_mapping: e.target.value })}
              minRows={2}
              className="mt-4"
              description='基础字段映射，提取 status 等原始值。如: {"status": "data.task_status"}'
            />

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-slate-700 mb-1">异步状态判断</h4>
              <p className="text-xs text-slate-400 mb-3">配置异步模型的成功/失败判断条件和结果映射。同步模型无需配置。</p>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="成功条件表达式"
                  placeholder='status == "succeed" || status == "completed"'
                  value={formData.query_success_condition}
                  onChange={(e) => setFormData({ ...formData, query_success_condition: e.target.value })}
                  description="JS 表达式，变量来自查询响应映射的字段"
                />
                <Input
                  label="失败条件表达式"
                  placeholder='status == "failed" || status == "error"'
                  value={formData.query_fail_condition}
                  onChange={(e) => setFormData({ ...formData, query_fail_condition: e.target.value })}
                  description="JS 表达式，变量来自查询响应映射的字段"
                />
              </div>

              <Textarea
                label="成功结果映射 (JSON)"
                placeholder='{"image_url": "data.task_result.images.0.url", "video_url": "data.remote_url"}'
                value={formData.query_success_mapping}
                onChange={(e) => setFormData({ ...formData, query_success_mapping: e.target.value })}
                minRows={2}
                className="mt-4"
                description="成功时从原始响应提取结果字段"
              />

              <Textarea
                label="失败错误映射 (JSON)"
                placeholder='{"error": "data.fail_reason", "message": "data.error.message"}'
                value={formData.query_fail_mapping}
                onChange={(e) => setFormData({ ...formData, query_fail_mapping: e.target.value })}
                minRows={2}
                className="mt-4"
                description="失败时从原始响应提取错误信息"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-slate-700 mb-1">自定义 Handler（可选）</h4>
              <p className="text-xs text-slate-400 mb-3">用于无法通过模板配置覆盖的特殊 API（如特殊认证方式、特殊参数格式等）。留空则走模板流程。</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="提交 Handler"
                  placeholder='如: kling_video'
                  value={formData.custom_handler}
                  onChange={(e) => setFormData({ ...formData, custom_handler: e.target.value })}
                  description="对应 customHandlers/ 目录下的文件名（不含 .js）"
                />
                <Input
                  label="查询 Handler"
                  placeholder='如: kling_video'
                  value={formData.custom_query_handler}
                  onChange={(e) => setFormData({ ...formData, custom_query_handler: e.target.value })}
                  description="留空则查询走模板流程"
                />
              </div>
            </div>
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
            onPress={onSave}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ModelFormModal;
