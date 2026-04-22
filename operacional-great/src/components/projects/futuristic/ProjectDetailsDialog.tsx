import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  FileText,
  Layers,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/projects';
import { ProjectGoalsSection } from './ProjectGoalsSection';
import { useProjectGoals } from '@/hooks/useProjectGoals';
import { useProjectsData } from '@/hooks/useProjectsData';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';

interface ProjectDetailsDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PLANEJADO: { label: 'Planejado', color: 'text-slate-600', bg: 'bg-slate-100' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  EM_RISCO: { label: 'Em Risco', color: 'text-amber-600', bg: 'bg-amber-100' },
  PAUSADO: { label: 'Pausado', color: 'text-slate-500', bg: 'bg-slate-100' },
  CONCLUIDO: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  BAIXA: { label: 'Baixa', color: 'text-slate-600', bg: 'bg-slate-100' },
  MEDIA: { label: 'Média', color: 'text-blue-600', bg: 'bg-blue-100' },
  ALTA: { label: 'Alta', color: 'text-amber-600', bg: 'bg-amber-100' },
  CRITICA: { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-100' },
};

export function ProjectDetailsDialog({ project, open, onOpenChange }: ProjectDetailsDialogProps) {
  const { progressPct } = useProjectGoals(project?.id ?? null);
  const { updateProject, deleteProject, isUpdating } = useProjectsData();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!project) return null;

  const handleEdit = async (id: string, updates: Partial<Project>) => {
    await updateProject({ id, updates });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteProject(id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const status = statusConfig[project.status] || statusConfig.PLANEJADO;
  const priority = priorityConfig[project.priority] || priorityConfig.MEDIA;

  // Use goals progress if goals exist, otherwise use project progress
  const displayProgress = progressPct > 0 ? progressPct : project.progress_pct;

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysRemaining = () => {
    if (!project.due_date) return null;
    const days = Math.ceil((new Date(project.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <DialogHeader className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          {/* Code badge and status */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-md">
              {project.code}
            </span>
            <Badge className={cn(
              "text-xs font-semibold shadow-sm",
              status.bg, status.color
            )}>
              {status.label}
            </Badge>
            <Badge className={cn(
              "text-xs font-semibold shadow-sm",
              priority.bg, priority.color
            )}>
              {priority.label}
            </Badge>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {project.name}
              </DialogTitle>
              {/* Client info */}
              {project.client && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {project.client.clinic_name || project.client.client_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-5">
          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Progresso do Projeto
              </span>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">
                {displayProgress}%
              </span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full shadow-lg",
                  displayProgress === 100
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
                )}
              />
            </div>
          </motion.div>

          {/* Goals Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <ProjectGoalsSection projectId={project.id} />
          </motion.div>

          <Separator />

          {/* Key Info Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* Dates */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                Datas
              </h4>
              <div className="space-y-2.5 text-sm">
                {project.start_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Início</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {format(new Date(project.start_date), 'dd MMM yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {project.due_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Prazo</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {format(new Date(project.due_date), 'dd MMM yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {daysRemaining !== null && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Restante</span>
                    <span className={cn(
                      "font-bold px-2 py-0.5 rounded-md text-xs",
                      daysRemaining < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                      daysRemaining <= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : 
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    )}>
                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)} dias atrasado` :
                       daysRemaining === 0 ? 'Vence hoje' :
                       `${daysRemaining} dias`}
                    </span>
                  </div>
                )}
                {!project.start_date && !project.due_date && (
                  <p className="text-slate-400 dark:text-slate-500 text-center py-2">Sem datas definidas</p>
                )}
              </div>
            </div>

            {/* Budget */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                Orçamento
              </h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Planejado</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(project.budget_planned)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Utilizado</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(project.budget_used)}
                  </span>
                </div>
                {project.roi_expected && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">ROI Esperado</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {project.roi_expected}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Risks & Blockers */}
          {((project.risks_count ?? 0) > 0 || (project.blockers_count ?? 0) > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4"
            >
              {(project.risks_count ?? 0) > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{project.risks_count} riscos identificados</span>
                </div>
              )}
              {(project.blockers_count ?? 0) > 0 && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{project.blockers_count} bloqueios</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Description */}
          {project.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                Descrição
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {project.description}
              </p>
            </motion.div>
          )}

          {/* Team / Owners */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              Responsáveis
            </h4>
            <div className="flex flex-wrap gap-2">
              {project.owners && project.owners.length > 0 ? (
                project.owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 px-3 py-2 rounded-lg border border-violet-100 dark:border-violet-800"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                      {owner.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {owner.full_name}
                    </span>
                  </div>
                ))
              ) : project.owner ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 px-3 py-2 rounded-lg border border-violet-100 dark:border-violet-800">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                    {project.owner.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {project.owner.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 dark:text-slate-500">Nenhum responsável definido</span>
              )}
            </div>
            
            {project.team && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Equipe: <span className="font-semibold text-slate-700 dark:text-slate-200">{project.team.replace('_', ' ')}</span>
                </span>
              </div>
            )}
          </motion.div>

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4 border-t border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>
                Criado em {format(new Date(project.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <span>
                Atualizado em {format(new Date(project.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </motion.div>
        </div>
      </DialogContent>

      {/* Edit Dialog */}
      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEdit}
        isSubmitting={isUpdating}
      />

      {/* Delete Dialog */}
      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </Dialog>
  );
}
