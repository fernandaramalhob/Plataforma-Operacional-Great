import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Sparkles } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import type { Project, ProjectFilters } from '@/types/projects';

interface ProjectsListViewProps {
  projects: Project[];
  filters: ProjectFilters;
  onOpenProject: (project: Project) => void;
}

export function ProjectsListView({ projects, filters, onOpenProject }: ProjectsListViewProps) {
  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = 
        project.name.toLowerCase().includes(search) ||
        project.code.toLowerCase().includes(search) ||
        project.client?.client_name?.toLowerCase().includes(search) ||
        project.client?.clinic_name?.toLowerCase().includes(search) ||
        project.owner?.full_name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (filters.status !== 'ALL' && project.status !== filters.status) return false;
    if (filters.team !== 'ALL' && project.team !== filters.team) return false;
    if (filters.priority !== 'ALL' && project.priority !== filters.priority) return false;
    return true;
  });

  if (filteredProjects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum projeto encontrado
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          {filters.search || filters.status !== 'ALL' || filters.team !== 'ALL' || filters.priority !== 'ALL'
            ? 'Tente ajustar os filtros ou criar um novo projeto'
            : 'Comece criando seu primeiro projeto clicando em "Novo Projeto"'
          }
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Stats summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="font-medium text-foreground">{filteredProjects.length}</span>
          {filteredProjects.length === 1 ? 'projeto' : 'projetos'}
        </span>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onOpen={onOpenProject}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
