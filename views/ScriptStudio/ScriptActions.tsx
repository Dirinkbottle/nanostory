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
      <Card className="bg-blue-50 border border-blue-200">
        <CardBody className="p-4 text-center">
          <p className="text-slate-600">加载剧本中...</p>
        </CardBody>
      </Card>
    );
  }

  if (!scriptId) {
    return null;
  }

  return (
    <>
      {/* 已有剧本时显示编辑和删除按钮 */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-slate-700 font-bold">已有剧本</p>
                <p className="text-xs text-slate-500">可以编辑或删除当前剧本</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="light"
                className="text-red-600 font-semibold hover:bg-red-50"
                onPress={onDelete}
                isDisabled={loading}
              >
                删除剧本
              </Button>
              {isEditing ? (
                <Button
                  size="sm"
                  className="bg-green-600 text-white font-semibold hover:bg-green-700"
                  onPress={onSave}
                  isLoading={loading}
                >
                  保存修改
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-blue-600 text-white font-semibold hover:bg-blue-700"
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
