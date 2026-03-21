/**
 * 镜头语言参数编辑器
 * 专业影视镜头参数的可视化编辑组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select, SelectItem, Input, Tooltip, Tabs, Tab, Card, CardBody } from '@heroui/react';
import { 
  Camera, Move, Sun, Grid3X3, Focus, Clock, ArrowRightLeft, 
  Wand2, Save, RotateCcw 
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { 
  ShotLanguage, 
  ShotLanguageOptions, 
  ShotPreset, 
  DEFAULT_SHOT_PRESETS,
  getShotSizeVisual,
} from '../../../types/shotLanguage';
import { getAuthToken } from '../../../services/auth';

interface ShotLanguageEditorProps {
  storyboardId: number;
  initialValues?: ShotLanguage;
  onChange?: (values: ShotLanguage) => void;
  onSave?: (values: ShotLanguage) => void;
  compact?: boolean;
}

const ShotLanguageEditor: React.FC<ShotLanguageEditorProps> = ({
  storyboardId,
  initialValues = {},
  onChange,
  onSave,
  compact = false,
}) => {
  const { showToast } = useToast();
  const [values, setValues] = useState<ShotLanguage>(initialValues);
  const [options, setOptions] = useState<ShotLanguageOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showPresets, setShowPresets] = useState(false);

  // 加载选项配置
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/storyboards/shot-language-options', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          setOptions(data.options);
        }
      } catch (error) {
        console.error('加载镜头语言选项失败:', error);
      }
    };
    loadOptions();
  }, []);

  // 同步外部初始值
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = useCallback((field: keyof ShotLanguage, value: string | number | undefined) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onChange?.(newValues);
  }, [values, onChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/storyboards/${storyboardId}/shot-language`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (data.success) {
        showToast('镜头参数已保存', 'success');
        onSave?.(values);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showToast(error.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: ShotPreset) => {
    setValues(preset.shotLanguage);
    onChange?.(preset.shotLanguage);
    setShowPresets(false);
    showToast(`已应用预设: ${preset.name}`, 'success');
  };

  const resetValues = () => {
    setValues({});
    onChange?.({});
  };

  if (!options) {
    return <div className="p-4 text-slate-400">加载中...</div>;
  }

  // 紧凑模式 - 仅显示关键参数
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* 景别快速选择 */}
        <Select
          size="sm"
          placeholder="景别"
          selectedKeys={values.shotSize ? [values.shotSize] : []}
          onChange={(e) => handleChange('shotSize', e.target.value)}
          classNames={{ trigger: 'bg-slate-800 border-slate-700 w-24' }}
          startContent={<span className="text-xs">{getShotSizeVisual(values.shotSize)}</span>}
        >
          {options.shotSize.map((opt) => (
            <SelectItem key={opt.value}>
              {opt.icon} {opt.label}
            </SelectItem>
          ))}
        </Select>

        {/* 机位高度 */}
        <Select
          size="sm"
          placeholder="机位"
          selectedKeys={values.cameraHeight ? [values.cameraHeight] : []}
          onChange={(e) => handleChange('cameraHeight', e.target.value)}
          classNames={{ trigger: 'bg-slate-800 border-slate-700 w-24' }}
        >
          {options.cameraHeight.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>

        {/* 运动 */}
        <Select
          size="sm"
          placeholder="运动"
          selectedKeys={values.cameraMovement ? [values.cameraMovement] : []}
          onChange={(e) => handleChange('cameraMovement', e.target.value)}
          classNames={{ trigger: 'bg-slate-800 border-slate-700 w-24' }}
        >
          {options.cameraMovement.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>

        {/* 时长 */}
        <Input
          type="number"
          size="sm"
          placeholder="秒"
          value={values.shotDuration?.toString() || ''}
          onChange={(e) => handleChange('shotDuration', parseFloat(e.target.value) || undefined)}
          classNames={{ input: 'bg-slate-800 border-slate-700 w-16' }}
          endContent={<span className="text-xs text-slate-500">s</span>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Camera className="w-4 h-4" />
          镜头语言参数
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="bg-slate-800 text-slate-300"
            startContent={<Wand2 className="w-3 h-3" />}
            onPress={() => setShowPresets(!showPresets)}
          >
            预设
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-slate-800 text-slate-300"
            startContent={<RotateCcw className="w-3 h-3" />}
            onPress={resetValues}
          >
            重置
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 text-white"
            startContent={<Save className="w-3 h-3" />}
            onPress={handleSave}
            isLoading={saving}
          >
            保存
          </Button>
        </div>
      </div>

      {/* 预设面板 */}
      {showPresets && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardBody className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SHOT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="text-left p-2 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors"
                >
                  <div className="text-xs font-medium text-slate-200">{preset.name}</div>
                  <div className="text-[10px] text-slate-400">{preset.description}</div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* 参数标签页 */}
      <Tabs 
        selectedKey={activeTab} 
        onSelectionChange={(key) => setActiveTab(key as string)}
        size="sm"
        classNames={{
          tabList: 'bg-slate-800/50',
          cursor: 'bg-blue-600',
        }}
      >
        <Tab 
          key="basic" 
          title={<span className="flex items-center gap-1"><Camera className="w-3 h-3" /> 基础</span>}
        >
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 景别 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">景别</label>
              <Select
                selectedKeys={values.shotSize ? [values.shotSize] : []}
                onChange={(e) => handleChange('shotSize', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
                startContent={values.shotSize && <span>{getShotSizeVisual(values.shotSize)}</span>}
              >
                {options.shotSize.map((opt) => (
                  <SelectItem key={opt.value}>
                    {opt.icon} {opt.label} - {opt.description}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* 机位高度 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">机位高度</label>
              <Select
                selectedKeys={values.cameraHeight ? [values.cameraHeight] : []}
                onChange={(e) => handleChange('cameraHeight', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.cameraHeight.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 镜头运动 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">镜头运动</label>
              <Select
                selectedKeys={values.cameraMovement ? [values.cameraMovement] : []}
                onChange={(e) => handleChange('cameraMovement', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.cameraMovement.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 镜头类型 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">镜头类型</label>
              <Select
                selectedKeys={values.lensType ? [values.lensType] : []}
                onChange={(e) => handleChange('lensType', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.lensType.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </Tab>

        <Tab 
          key="composition" 
          title={<span className="flex items-center gap-1"><Grid3X3 className="w-3 h-3" /> 构图</span>}
        >
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 构图法则 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">构图法则</label>
              <Select
                selectedKeys={values.compositionRule ? [values.compositionRule] : []}
                onChange={(e) => handleChange('compositionRule', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.compositionRule.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 景深 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">景深</label>
              <Select
                selectedKeys={values.depthOfField ? [values.depthOfField] : []}
                onChange={(e) => handleChange('depthOfField', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.depthOfField.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 焦点位置 */}
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Focus className="w-3 h-3" /> 焦点位置
              </label>
              <Input
                placeholder="描述焦点在画面中的位置"
                value={values.focusPoint || ''}
                onChange={(e) => handleChange('focusPoint', e.target.value)}
                classNames={{ input: 'bg-slate-800 border-slate-700' }}
              />
            </div>
          </div>
        </Tab>

        <Tab 
          key="lighting" 
          title={<span className="flex items-center gap-1"><Sun className="w-3 h-3" /> 光影</span>}
        >
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 光影氛围 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">光影氛围</label>
              <Select
                selectedKeys={values.lightingMood ? [values.lightingMood] : []}
                onChange={(e) => handleChange('lightingMood', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.lightingMood.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 时长 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 镜头时长
              </label>
              <Input
                type="number"
                step="0.5"
                placeholder="秒"
                value={values.shotDuration?.toString() || ''}
                onChange={(e) => handleChange('shotDuration', parseFloat(e.target.value) || undefined)}
                classNames={{ input: 'bg-slate-800 border-slate-700' }}
                endContent={<span className="text-xs text-slate-500">秒</span>}
              />
            </div>
          </div>
        </Tab>

        <Tab 
          key="axis" 
          title={<span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> 轴线</span>}
        >
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 轴线位置 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">轴线位置</label>
              <Select
                selectedKeys={values.axisPosition ? [values.axisPosition] : []}
                onChange={(e) => handleChange('axisPosition', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.axisPosition.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 屏幕方向 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">屏幕方向</label>
              <Select
                selectedKeys={values.screenDirection ? [values.screenDirection] : []}
                onChange={(e) => handleChange('screenDirection', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.screenDirection.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label}</SelectItem>
                ))}
              </Select>
            </div>

            {/* 转场类型 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">转场类型</label>
              <Select
                selectedKeys={values.transitionType ? [values.transitionType] : []}
                onChange={(e) => handleChange('transitionType', e.target.value)}
                classNames={{ trigger: 'bg-slate-800 border-slate-700' }}
              >
                {options.transitionType.map((opt) => (
                  <SelectItem key={opt.value}>{opt.icon} {opt.label} - {opt.description}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ShotLanguageEditor;
