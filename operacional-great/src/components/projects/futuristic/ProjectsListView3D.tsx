import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Sparkles, TrendingUp, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { ProjectCard3D } from './ProjectCard3D';
import { KpiTile3D } from './KpiTile3D';
import type { Project, ProjectFilters } from '@/types/projects';
import { useMemo } from 'react';

interface ProjectsListView3DProps {
  projects: Project[];
  filters: ProjectFilters;
  onOpenProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onDuplicateProject?: (project: Project) => void;
}

export function ProjectsListView3D({ projects, filters, onOpenProject, onEditProject, onDeleteProject, onDuplicateProject }: ProjectsListView3DProps) {
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

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget_planned || 0), 0);
    const avgProgress = filteredProjects.length > 0 
      ? Math.round(filteredProjects.reduce((sum, p) => sum + p.progress_pct, 0) / filteredProjects.length)
      : 0;
    const atRisk = filteredProjects.filter(p => p.status === 'EM_RISCO' || p.risks_count > 0).length;
    const dueSoon = filteredProjects.filter(p => {
      if (!p.due_date) return false;
      const days = Math.ceil((new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    }).length;

    return { total: filteredProjects.length, totalBudget, avgProgress, atRisk, dueSoon };
  }, [filteredProjects]);

  if (filteredProjects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <FolderOpen className="w-10 h-10 text-slate-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Nenhum projeto encontrado
        </h3>
        <p className="text-slate-500 text-center max-w-md">
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
      className="space-y-8"
    >
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile3D
          icon={Sparkles}
          label="Total de Projetos"
          value={kpis.total}
          color="cyan"
          index={0}
        />
        <KpiTile3D
          icon={TrendingUp}
          label="Progresso Médio"
          value={kpis.avgProgress}
          suffix="%"
          color="emerald"
          index={1}
        />
        <KpiTile3D
          icon={AlertTriangle}
          label="Em Risco"
          value={kpis.atRisk}
          color="red"
          index={2}
        />
        <KpiTile3D
          icon={DollarSign}
          label="Orçamento Total"
          value={new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(kpis.totalBudget)}
          color="violet"
          index={3}
        />
      </div>

      {/* Stats summary */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-4 text-sm text-slate-500"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="font-semibold text-slate-900">{filteredProjects.length}</span>
          {filteredProjects.length === 1 ? 'projeto' : 'projetos'}
        </span>
        {kpis.dueSoon > 0 && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{kpis.dueSoon}</span>
            vencem em breve
          </span>
        )}
      </motion.div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, index) => (
            <ProjectCard3D
              key={project.id}
              project={project}
              index={index}
              onOpen={onOpenProject}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
              onDuplicate={onDuplicateProject}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
