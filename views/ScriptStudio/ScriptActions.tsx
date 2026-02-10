import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { FileText, Video } from 'lucide-react';

interface ScriptActionsProps {
  scriptId: number | null;
  isEditing: boolean;
  loading: boolean;
  loadingScript: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onGenerateVideo: () => void;
}

const ScriptActions: React.FC<ScriptActionsProps> = ({
  scriptId,
  isEditing,
  loading,
  loadingScript,
  onEdit,
  onSave,
  onDelete,
  onGenerateVideo
}) => {
  if (loadingScript) {
    return (
      <Card className="bg-slate-800/60 border border-slate-700/50">
        <CardBody className="p-4 text-center">
          <p className="text-slate-400">加载剧本中...</p>
        </CardBody>
      </Card>
    );
  }

  if (!scriptId) {
    return null;
  }

  return (
    <>
      <Card className="bg-slate-800/60 border border-emerald-500/20">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/15 rounded-lg border border-emerald-500/20">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-200 font-bold">已有剧本</p>
                <p className="text-xs text-slate-500">可以编辑或删除当前剧本</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="light"
                className="text-red-400 font-semibold hover:bg-red-500/10"
                onPress={onDelete}
                isDisabled={loading}
              >
                删除剧本
              </Button>
              {isEditing ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  onPress={onSave}
                  isLoading={loading}
                >
                  保存修改
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold"
                  onPress={onEdit}
                >
                  编辑剧本
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default ScriptActions;
