import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Tabs, Tab, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react';
import { generateScript, fetchScripts, ScriptItem } from '../services/scripts';
import { fetchBillingSummary, BillingSummary } from '../services/billing';
import { fetchStoryboardTemplates, fetchStoryboards, saveStoryboards, StoryboardTemplate } from '../services/storyboards';
import { useToast } from '../contexts/ToastContext';

const ScriptStudio: React.FC = () => {
  const { showToast } = useToast();

  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [selectedScript, setSelectedScript] = useState<ScriptItem | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [templates, setTemplates] = useState<StoryboardTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard' | 'billing'>('script');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('电影感·高反差光影');
  const [length, setLength] = useState('短篇');
  const [loading, setLoading] = useState(false);

  const [storyboards, setStoryboards] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [list, summary, tpl] = await Promise.all([
        fetchScripts().catch(() => []),
        fetchBillingSummary().catch(() => null),
        fetchStoryboardTemplates().catch(() => []),
      ]);
      setScripts(list);
      if (list.length > 0) {
        setSelectedScript(list[0]);
        loadStoryboards(list[0].id);
      }
      setBilling(summary);
      setTemplates(tpl);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStoryboards = async (scriptId: number) => {
    try {
      const items = await fetchStoryboards(scriptId);
      setStoryboards(
        items.map((item) => ({
          ...item,
          variablesText: item.variables ? JSON.stringify(item.variables) : '{}',
        }))
      );
    } catch {
      setStoryboards([]);
    }
  };

  const handleGenerate = async () => {
    if (!description && !title) {
      showToast('请至少填写标题或故事概述', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await generateScript({ title, description, style, length });
      showToast('剧本生成成功', 'success');
      setTitle('');
      setDescription('');
      const list = await fetchScripts();
      setScripts(list);
      const script = list.find((s) => s.id === result.id) || result;
      setSelectedScript(script);
      setActiveTab('script');
      const summary = await fetchBillingSummary().catch(() => null);
      setBilling(summary);
    } catch (err: any) {
      showToast(err?.message || '生成失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScript = async (script: ScriptItem) => {
    setSelectedScript(script);
    setActiveTab('script');
    await loadStoryboards(script.id);
  };

  const handleAddStoryboard = () => {
    if (!selectedScript) return;
    setStoryboards((prev) => [
      ...prev,
      {
        index: prev.length + 1,
        prompt_template: '',
        variablesText: '{"角色":"","场景":"","动作":"","镜头类型":"","风格":""}',
      },
    ]);
    setActiveTab('storyboard');
  };

  const handleSaveStoryboards = async () => {
    if (!selectedScript) return;
    try {
      const items = storyboards.map((item, idx) => {
        let variables: any = {};
        if (item.variablesText) {
          try {
            variables = JSON.parse(item.variablesText);
          } catch {
            throw new Error(`第 ${idx + 1} 条分镜的变量 JSON 不合法`);
          }
        }
        return {
          index: item.index || idx + 1,
          prompt_template: item.prompt_template || '',
          variables,
          image_ref: item.image_ref || null,
        };
      });
      await saveStoryboards(selectedScript.id, items);
      showToast('分镜已保存', 'success');
    } catch (err: any) {
      showToast(err?.message || '保存失败', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-50 p-6 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-6 h-full">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-[0.3em] uppercase text-yellow-400">SCRIPT STUDIO</h1>
            <p className="text-sm text-slate-400 mt-2">用户登录后可在此生成剧本、管理分镜，并查看 Token 使用情况。</p>
          </div>
          {billing && (
            <Card className="bg-slate-900/80 border border-yellow-500/40 min-w-[260px]" shadow="sm">
              <CardBody className="py-3 px-4 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Token 使用统计
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-black text-yellow-400">{billing.total_tokens}</span>
                  <span className="text-xs text-slate-400">tokens</span>
                </div>
                <span className="text-xs text-slate-400">累计费用 ≈ {billing.total_amount.toFixed(6)} 元（示意）</span>
              </CardBody>
            </Card>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <Card className="bg-slate-900/70 border border-slate-800 overflow-hidden flex flex-col">
            <CardHeader className="px-5 py-4 flex justify-between items-center border-b border-slate-800">
              <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">剧本列表</span>
              <Chip size="sm" variant="flat" className="bg-slate-800 text-xs">
                {scripts.length} 个
              </Chip>
            </CardHeader>
            <CardBody className="p-0 flex-1 overflow-y-auto">
              <Table
                removeWrapper
                aria-label="脚本列表"
                classNames={{
                  table: 'min-w-full',
                  td: 'text-xs',
                }}
              >
                <TableHeader>
                  <TableColumn>标题</TableColumn>
                  <TableColumn>模型</TableColumn>
                  <TableColumn>Tokens</TableColumn>
                </TableHeader>
                <TableBody emptyContent="暂无剧本">
                  {scripts.map((s) => (
                    <TableRow key={s.id} onClick={() => handleSelectScript(s)} className="cursor-pointer hover:bg-slate-800/60">
                      <TableCell className="text-xs font-bold">
                        {s.title || '未命名剧本'}
                      </TableCell>
                      <TableCell className="text-[10px] uppercase text-slate-400">
                        {s.model_provider || 'placeholder'}
                      </TableCell>
                      <TableCell className="text-xs">{s.token_used}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <Card className="bg-slate-900/80 border border-slate-800 col-span-2 flex flex-col min-h-0">
            <CardHeader className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as any)}
                variant="underlined"
                classNames={{
                  tabList: 'gap-6',
                }}
              >
                <Tab key="script" title="剧本生成" />
                <Tab key="storyboard" title="分镜与预提示词" />
                <Tab key="billing" title="计费记录" />
              </Tabs>
              <Button
                color="warning"
                radius="full"
                size="sm"
                onPress={handleAddStoryboard}
                className="text-xs font-black tracking-[0.25em] uppercase"
              >
                新增分镜
              </Button>
            </CardHeader>
            <CardBody className="p-6 flex-1 overflow-y-auto space-y-6">
              {activeTab === 'script' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      label="剧本标题"
                      variant="bordered"
                      radius="lg"
                      value={title}
                      onValueChange={setTitle}
                    />
                    <Textarea
                      label="故事概述"
                      variant="bordered"
                      radius="lg"
                      minRows={5}
                      value={description}
                      onValueChange={setDescription}
                    />
                    <Input
                      label="风格"
                      variant="bordered"
                      radius="lg"
                      value={style}
                      onValueChange={setStyle}
                    />
                    <Input
                      label="长度"
                      variant="bordered"
                      radius="lg"
                      value={length}
                      onValueChange={setLength}
                    />
                    <Button
                      color="warning"
                      className="font-black tracking-[0.3em] uppercase mt-2"
                      radius="lg"
                      onPress={handleGenerate}
                      isLoading={loading}
                    >
                      生成剧本
                    </Button>
                  </div>
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedScript ? (
                      <>
                        <h2 className="text-lg font-black mb-3 text-yellow-400">
                          {selectedScript.title || '当前剧本'}
                        </h2>
                        <div className="text-xs text-slate-400 mb-2">
                          生成时间：{new Date(selectedScript.created_at).toLocaleString()} · Tokens：
                          {selectedScript.token_used}
                        </div>
                        <div>{selectedScript.content}</div>
                      </>
                    ) : (
                      <div className="text-slate-500 text-sm">尚未选择剧本，请先生成或在左侧选择一个。</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'storyboard' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-xs text-slate-400">可选预置模板：</span>
                    {templates.map((tpl) => (
                      <Button
                        key={tpl.id}
                        size="sm"
                        variant="flat"
                        className="text-xs"
                        onPress={() => {
                          setStoryboards((prev) => [
                            ...prev,
                            {
                              index: prev.length + 1,
                              prompt_template: tpl.prompt_template,
                              variablesText: '{"角色":"","场景":"","动作":"","镜头类型":"","风格":""}',
                            },
                          ]);
                        }}
                      >
                        {tpl.name}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {storyboards.length === 0 && (
                      <div className="text-sm text-slate-500">暂无分镜，请使用“新增分镜”或从模板添加。</div>
                    )}
                    {storyboards.map((item, idx) => (
                      <Card
                        key={idx}
                        className="bg-slate-950/40 border border-slate-800"
                        radius="lg"
                      >
                        <CardBody className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">分镜 #{idx + 1}</span>
                          </div>
                          <Input
                            label="预提示词模板"
                            variant="bordered"
                            radius="lg"
                            value={item.prompt_template}
                            onValueChange={(v) => {
                              setStoryboards((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], prompt_template: v };
                                return next;
                              });
                            }}
                          />
                          <Textarea
                            label={'变量 JSON（例如：{"角色":"主角"}）'}
                            variant="bordered"
                            radius="lg"
                            minRows={3}
                            value={item.variablesText}
                            onValueChange={(v) => {
                              setStoryboards((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], variablesText: v };
                                return next;
                              });
                            }}
                          />
                        </CardBody>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      color="warning"
                      radius="lg"
                      className="font-black tracking-[0.25em] uppercase"
                      onPress={handleSaveStoryboards}
                    >
                      保存分镜
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="text-sm text-slate-400">
                  <p>当前计费模式为示意计费，后端会为每次剧本生成记录 token 数量和费用。</p>
                  <p className="mt-2">如需更完整的计费明细页面，可以后续在此页接入 /api/billing/history 接口做表格展示。</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScriptStudio;
