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
      <Card className="pro-card">
        <CardBody className="p-4 text-center">
          <p className="text-[var(--text-secondary)]">加载剧本中...</p>
        </CardBody>
      </Card>
    );
  }

  if (!scriptId) {
    return null;
  }

  return (
    <>
      <Card className="pro-card border-[var(--success)]/20">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--success)]/15 rounded-lg border border-[var(--success)]/20">
                <FileText className="w-5 h-5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-[var(--text-primary)] font-bold">已有剧本</p>
                <p className="text-xs text-[var(--text-muted)]">可以编辑或删除当前剧本</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="light"
                className="text-[var(--danger)] font-semibold hover:bg-[var(--danger)]/10"
                onPress={onDelete}
                isDisabled={loading}
              >
                删除剧本
              </Button>
              {isEditing ? (
                <Button
                  size="sm"
                  className="bg-[var(--success)] text-white font-semibold hover:bg-[var(--success)]/80"
                  onPress={onSave}
                  isLoading={loading}
                >
                  保存修改
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="pro-btn-primary"
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
