import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Folder, ArrowLeft } from 'lucide-react';
import { Project } from '../../services/projects';

interface ProjectInfoProps {
  project: Project;
  onBackToProjects: () => void;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ project, onBackToProjects }) => {
  return (
    <div className="mb-4">
      <Card className="bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
        <CardBody className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 rounded-lg border border-blue-500/20">
              <Folder className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-100">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-slate-500 mt-1">{project.description}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="light"
              className="text-slate-400 font-semibold hover:bg-slate-700/50"
              startContent={<ArrowLeft className="w-4 h-4" />}
              onPress={onBackToProjects}
            >
              切换项目
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ProjectInfo;
