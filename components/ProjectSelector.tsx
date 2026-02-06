import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react';
import { FolderOpen, Plus, Folder } from 'lucide-react';
import { fetchProjects, createProject, Project } from '../services/projects';

interface ProjectSelectorProps {
  onSelectProject: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const projectList = await fetchProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('请输入项目名称');
      return;
    }

    try {
      const project = await createProject({
        name: newProjectName,
        description: newProjectDesc,
        type: 'script',
        status: 'draft'
      });
      
      setProjects([project, ...projects]);
      setNewProjectName('');
      setNewProjectDesc('');
      onOpenChange();
      onSelectProject(project);
    } catch (error: any) {
      alert(error.message || '创建项目失败');
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-slate-800 mb-4">选择项目</h1>
          <p className="text-slate-600 text-xl">选择一个项目开始创作，或创建新项目</p>
        </div>

        {loadingProjects ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-slate-600 text-lg">加载项目列表...</p>
          </div>
        ) : projects.length > 0 ? (
          <div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  isPressable
                  isHoverable
                  className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-slate-200 hover:border-blue-400 hover:scale-105"
                  onPress={() => onSelectProject(project)}
                >
                  <CardBody className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                          <Folder className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{project.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(project.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-700 font-bold">
                        {project.status === 'draft' ? '草稿' : project.status === 'in_progress' ? '进行中' : '已完成'}
                      </Chip>
                    </div>
                    {project.description && (
                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{project.description}</p>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
            <div className="text-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg px-8"
                startContent={<Plus className="w-5 h-5" />}
                onPress={onOpen}
              >
                创建新项目
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <FolderOpen className="w-32 h-32 mx-auto text-slate-300 mb-6" />
            <h3 className="text-2xl font-bold text-slate-700 mb-3">还没有项目</h3>
            <p className="text-slate-500 text-lg mb-8">创建第一个项目开始你的创作之旅</p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg px-8"
              startContent={<Plus className="w-5 h-5" />}
              onPress={onOpen}
            >
              创建第一个项目
            </Button>
          </div>
        )}
      </div>

      {/* 创建项目 Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        classNames={{
          base: "bg-white border border-slate-200 shadow-xl",
          header: "border-b border-slate-200",
          body: "py-6",
          footer: "border-t border-slate-200"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-slate-800 font-bold text-xl">创建新项目</ModalHeader>
              <ModalBody>
                <div className="space-y-5">
                  <Input
                    label="项目名称"
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onValueChange={setNewProjectName}
                    classNames={{
                      input: "bg-white text-slate-800 font-semibold",
                      label: "text-slate-600 font-medium text-base",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300"
                    }}
                  />
                  <Textarea
                    label="项目描述（可选）"
                    placeholder="描述这个项目的内容和目标"
                    value={newProjectDesc}
                    onValueChange={setNewProjectDesc}
                    minRows={4}
                    classNames={{
                      input: "bg-white text-slate-800",
                      label: "text-slate-600 font-medium text-base",
                      inputWrapper: "bg-white border border-slate-200 hover:border-blue-300"
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-slate-600 font-semibold">
                  取消
                </Button>
                <Button
                  className="bg-blue-600 text-white font-bold hover:bg-blue-700"
                  onPress={handleCreateProject}
                >
                  创建项目
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ProjectSelector;
