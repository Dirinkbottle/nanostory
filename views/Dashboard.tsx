
import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { storageService } from '../services/storage';
import { Plus, Trash2, Folder, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/context';
import { useToast } from '../contexts/ToastContext';
import { 
  Button, 
  Card, 
  CardBody, 
  CardFooter, 
  Input, 
  Textarea, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  useDisclosure,
  Tooltip,
  Divider
} from "@heroui/react";

const Dashboard: React.FC = () => {
  const { t, settings } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Modal Disclosures
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await storageService.getProjects();
    setProjects(data);
  };

  const handleCreate = async () => {
    if (!newProjectName) return;

    try {
      const newProject: Project = {
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        name: newProjectName,
        description: newProjectDesc,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await storageService.saveProject(newProject);
      
      onCreateClose();
      setNewProjectName('');
      setNewProjectDesc('');
      await loadProjects();
    } catch (error) {
      console.error("[DASHBOARD] Failed to create project:", error);
      showToast(settings.language === 'zh' ? "创建项目失败，请检查存储权限。" : "Failed to create project. Please check storage permissions.", 'error');
    }
  };

  const onRequestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setProjectToDelete(id);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await storageService.deleteProject(projectToDelete);
      await loadProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setProjectToDelete(null);
      onDeleteClose();
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/project/${id}`);
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="flex justify-between items-center mb-10 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            工作区
          </h1>
          <p className="text-slate-400 font-medium">管理您的视频创作项目</p>
        </div>
        <Button
          color="primary"
          size="lg"
          radius="lg"
          startContent={<Plus className="w-5 h-5" />}
          onPress={onCreateOpen}
          className="font-black uppercase tracking-widest text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          新建项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">
        {projects.map((project) => (
          <div 
            key={project.id}
            onClick={() => handleCardClick(project.id)}
            className="cursor-pointer"
          >
          <Card 
            className="border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl hover:scale-[1.02] hover:border-cyan-500/50 transition-all duration-300 group h-full"
          >
            <CardBody className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 transition-colors group-hover:bg-cyan-500/20">
                  <Folder className="w-7 h-7" />
                </div>
                <Button
                  isIconOnly
                  variant="flat"
                  color="danger"
                  size="sm"
                  radius="lg"
                  onClick={(e) => onRequestDelete(e, project.id)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <h2 className="text-xl font-black text-slate-100 group-hover:text-cyan-400 transition-colors mb-2">
                {project.name}
              </h2>
              <p className="text-slate-400 text-sm line-clamp-2 min-h-[2.5rem] leading-relaxed">
                {project.description || '暂无描述'}
              </p>
            </CardBody>
            <Divider className="bg-blue-900/30" />
            <CardFooter className="px-6 py-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                更新于 {new Date(project.updatedAt).toLocaleDateString()}
              </span>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </CardFooter>
          </Card>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={onCreateClose}
        placement="center"
        backdrop="blur"
        size="md"
        radius="lg"
        classNames={{
          base: "bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl",
          header: "border-b border-blue-900/30 p-6",
          body: "p-8",
          footer: "border-t border-blue-900/30 p-6",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight">
                  新建项目
                </h2>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  <Input
                    label="项目名称"
                    placeholder=" "
                    labelPlacement="outside"
                    variant="bordered"
                    radius="lg"
                    size="lg"
                    autoFocus
                    value={newProjectName}
                    onValueChange={setNewProjectName}
                    classNames={{
                      label: "font-bold text-sm uppercase tracking-widest text-cyan-400 mb-2",
                      input: "text-base bg-slate-900/50",
                      inputWrapper: "border-blue-800/50 group-data-[focus=true]:border-cyan-500"
                    }}
                  />
                  <Textarea
                    label="项目描述"
                    placeholder=" "
                    labelPlacement="outside"
                    variant="bordered"
                    radius="lg"
                    size="lg"
                    minRows={4}
                    value={newProjectDesc}
                    onValueChange={setNewProjectDesc}
                    classNames={{
                      label: "font-bold text-sm uppercase tracking-widest text-cyan-400 mb-2",
                      input: "font-medium text-base bg-slate-900/50",
                      inputWrapper: "border-blue-800/50 group-data-[focus=true]:border-cyan-500"
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="font-bold text-slate-400">
                  取消
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleCreate}
                  className="font-black uppercase tracking-widest text-xs px-8 bg-gradient-to-r from-cyan-500 to-blue-600"
                  radius="lg"
                >
                  创建
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={onDeleteClose}
        placement="center"
        backdrop="blur"
        size="xs"
        radius="lg"
        classNames={{
          base: "bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl",
          body: "p-8",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <ModalBody className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-100 mb-2">删除项目？</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                此操作无法撤销，项目中的所有数据将被永久删除。
              </p>
              <div className="flex gap-3 w-full">
                <Button fullWidth variant="light" onPress={onClose} className="font-bold text-slate-400">
                  取消
                </Button>
                <Button fullWidth color="danger" onPress={confirmDelete} className="font-bold bg-red-500 hover:bg-red-600">
                  删除
                </Button>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Dashboard;
