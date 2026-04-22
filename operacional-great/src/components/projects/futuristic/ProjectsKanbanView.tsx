import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Calendar, Users, AlertTriangle, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectFilters } from '@/types/projects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProjectsKanbanViewProps {
  projects: Project[];
  filters: ProjectFilters;
  onOpenProject: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onDuplicateProject?: (project: Project) => void;
}

const KANBAN_COLUMNS = [
  { id: 'PLANEJADO', label: 'Planejado', color: 'bg-slate-500' },
  { id: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-cyan-500' },
  { id: 'EM_RISCO', label: 'Em Risco', color: 'bg-amber-500' },
  { id: 'PAUSADO', label: 'Pausado', color: 'bg-slate-400' },
  { id: 'CONCLUIDO', label: 'Concluído', color: 'bg-emerald-500' },
];

export function ProjectsKanbanView({ projects, filters, onOpenProject, onEditProject, onDeleteProject, onDuplicateProject }: ProjectsKanbanViewProps) {
  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status !== 'ALL' && project.status !== filters.status) {
      return false;
    }
    if (filters.team !== 'ALL' && project.team !== filters.team) {
      return false;
    }
    if (filters.priority !== 'ALL' && project.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  const getProjectsByStatus = (status: string) => {
    return filteredProjects.filter(p => p.status === status);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-x-auto pb-4"
    >
      <div className="flex gap-4 min-w-max">
        {KANBAN_COLUMNS.map((column, columnIndex) => {
          const columnProjects = getProjectsByStatus(column.id);
          
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: columnIndex * 0.1 }}
              className="w-[320px] flex-shrink-0"
            >
              {/* Column Header */}
              <div className="glass-surface rounded-xl p-3 mb-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <span className="font-medium text-slate-700">{column.label}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {columnProjects.length}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Column Content */}
              <div className="space-y-3 min-h-[400px]">
                {columnProjects.map((project, index) => (
                  <KanbanCard
                    key={project.id}
                    project={project}
                    index={index}
                    onClick={() => onOpenProject(project)}
                    onEdit={onEditProject ? () => onEditProject(project) : undefined}
                    onDelete={onDeleteProject ? () => onDeleteProject(project) : undefined}
                    onDuplicate={onDuplicateProject ? () => onDuplicateProject(project) : undefined}
                  />
                ))}
                
                {columnProjects.length === 0 && (
                  <div className="glass-surface rounded-xl p-6 border-2 border-dashed border-slate-200 text-center">
                    <p className="text-sm text-slate-400">Nenhum projeto</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface KanbanCardProps {
  project: Project;
  index: number;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

function KanbanCard({ project, index, onClick, onEdit, onDelete, onDuplicate }: KanbanCardProps) {
  const priorityColors: Record<string, string> = {
    BAIXA: 'bg-slate-100 text-slate-600',
    MEDIA: 'bg-blue-100 text-blue-600',
    ALTA: 'bg-amber-100 text-amber-600',
    CRITICA: 'bg-red-100 text-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="glass-surface rounded-xl p-4 cursor-pointer group hover:shadow-lg transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-slate-400">{project.code}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button 
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-lg transition-all"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-surface-strong">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-slate-800 mb-2 line-clamp-2">{project.name}</h4>

      {/* Client */}
      {project.client && (
        <p className="text-sm text-slate-500 mb-3">
          {project.client.clinic_name || project.client.client_name}
        </p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Progresso</span>
          <span className="font-medium text-slate-700">{project.progress_pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress_pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            priorityColors[project.priority] || priorityColors.MEDIA
          )}>
            {project.priority}
          </span>
          
          {/* Risk indicator */}
          {(project.risks_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              {project.risks_count}
            </span>
          )}
        </div>

        {/* Due Date */}
        {project.due_date && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            {format(new Date(project.due_date), 'dd MMM', { locale: ptBR })}
          </div>
        )}
      </div>

      {/* Owners */}
      {project.owners && project.owners.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <Users className="w-3 h-3 text-slate-400" />
          <div className="flex -space-x-2">
            {project.owners.slice(0, 3).map((owner) => (
              <div
                key={owner.id}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-[10px] font-medium text-white ring-2 ring-white"
                title={owner.full_name}
              >
                {owner.full_name?.charAt(0) || '?'}
              </div>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {project.owners.map(o => o.full_name?.split(' ')[0]).join(', ')}
          </span>
        </div>
      )}
    </motion.div>
  );
}
