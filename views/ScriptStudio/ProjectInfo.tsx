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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <CardBody className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-slate-600 mt-1">{project.description}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="light"
              className="text-slate-600 font-semibold hover:bg-white/50"
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
