import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProjectsData } from '@/hooks/useProjectsData';
import { ProjectsFilters } from '@/components/projects/ProjectsFilters';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { Loader2 } from 'lucide-react';
import type { ProjectView, ProjectFilters, Project } from '@/types/projects';
import {
  SceneShell,
  ProjectsHero,
  FuturisticSegmentedControl,
  ProjectsListView3D,
  ProjectsKanbanView,
  ProjectsScrumView,
  ProjectsTimelineView,
  FloatingDock,
  ProjectsFocusPanel,
  ProjectDetailsDialog,
} from '@/components/projects/futuristic';

export default function Projetos() {
  const [currentView, setCurrentView] = useState<ProjectView>('LIST');
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'ALL',
    team: 'ALL',
    priority: 'ALL',
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const { projects, isLoadingProjects, createProject, updateProject, deleteProject, duplicateProject, isCreating, isUpdating } = useProjectsData();

  const handleDuplicateProject = async (project: Project) => {
    await duplicateProject(project);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // N to open new project dialog (when not in an input)
    if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      setCreateDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCreateProject = async (form: Parameters<typeof createProject>[0]) => {
    await createProject(form);
  };

  const handleOpenProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCloseProjectDetails = () => {
    setSelectedProject(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleDeleteProject = (project: Project) => {
    setDeletingProject(project);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    await deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    await updateProject({ id, updates });
    setEditingProject(null);
  };

  if (isLoadingProjects) {
    return (
      <SceneShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin relative" />
            </div>
            <p className="text-slate-500 font-medium">Carregando projetos...</p>
          </div>
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Hero Header */}
        <ProjectsHero 
          projects={projects} 
          onNewProject={() => setCreateDialogOpen(true)} 
        />

        {/* View navigation and filters */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <FuturisticSegmentedControl 
              currentView={currentView} 
              onViewChange={setCurrentView} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex-1 max-w-xl"
            >
              <ProjectsFilters filters={filters} onFiltersChange={setFilters} />
            </motion.div>
          </div>
        </div>

        {/* Main content based on view */}
        <div className="min-h-[400px]">
          {currentView === 'LIST' && (
            <ProjectsListView3D 
              projects={projects} 
              filters={filters}
              onOpenProject={handleOpenProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
            />
          )}

          {currentView === 'PIPELINE' && (
            <ProjectsKanbanView 
              projects={projects} 
              filters={filters}
              onOpenProject={handleOpenProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
            />
          )}

          {currentView === 'TIMELINE' && (
            <ProjectsTimelineView 
              projects={projects} 
              filters={filters}
              onOpenProject={handleOpenProject}
            />
          )}

          {currentView === 'SCRUM' && (
            <ProjectsScrumView projects={projects} />
          )}

          {currentView === 'INSIGHTS' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-2xl glass-surface"
            >
              <p className="text-slate-500">Insights e Analytics - Em desenvolvimento</p>
            </motion.div>
          )}
        </div>

        {/* Focus Panel - Top 3 Projects by Impact Score (at the bottom) */}
        <ProjectsFocusPanel 
          projects={projects} 
          onOpenProject={handleOpenProject} 
        />

        {/* Floating Dock */}
        <FloatingDock 
          onQuickAdd={() => setCreateDialogOpen(true)}
        />

        {/* Create Project Dialog */}
        <CreateProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateProject}
          isSubmitting={isCreating}
        />

        {/* Project Details Dialog */}
        <ProjectDetailsDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => !open && handleCloseProjectDetails()}
        />

        {/* Edit Project Dialog */}
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onSubmit={handleUpdateProject}
          isSubmitting={isUpdating}
        />

        {/* Delete Project Dialog */}
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onOpenChange={(open) => !open && setDeletingProject(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </SceneShell>
  );
}
