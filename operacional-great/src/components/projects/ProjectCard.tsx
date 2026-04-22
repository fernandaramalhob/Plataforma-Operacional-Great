import { Calendar, User, AlertTriangle, TrendingUp, MoreHorizontal, ExternalLink, Copy, FileText, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/projects';
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getTeamLabel } from '@/types/projects';

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onCreateDeliverable?: (project: Project) => void;
}

export function ProjectCard({ project, index, onOpen, onDuplicate, onCreateDeliverable }: ProjectCardProps) {
  const daysRemaining = project.due_date ? differenceInDays(new Date(project.due_date), new Date()) : null;
  const isOverdue = project.due_date && isPast(new Date(project.due_date)) && project.status !== 'CONCLUIDO';
  const hasRisks = project.risks_count > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
      
      <div 
        onClick={() => onOpen(project)}
        className={cn(
          "relative rounded-xl border bg-card/80 backdrop-blur-sm p-5 cursor-pointer",
          "border-border/50 hover:border-cyan-500/30",
          "shadow-lg hover:shadow-xl hover:shadow-cyan-500/5",
          "transition-all duration-300",
          isOverdue && "border-red-500/30"
        )}
      >
        {/* Status indicator line */}
        <div className={cn(
          "absolute top-0 left-6 right-6 h-0.5 rounded-full",
          project.status === 'EM_ANDAMENTO' && "bg-gradient-to-r from-blue-500 to-cyan-500",
          project.status === 'CONCLUIDO' && "bg-gradient-to-r from-emerald-500 to-green-500",
          project.status === 'EM_RISCO' && "bg-gradient-to-r from-red-500 to-orange-500",
          project.status === 'PAUSADO' && "bg-gradient-to-r from-amber-500 to-yellow-500",
          project.status === 'PLANEJADO' && "bg-gradient-to-r from-slate-400 to-slate-500",
          project.status === 'CANCELADO' && "bg-gradient-to-r from-gray-400 to-gray-500",
        )} />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{project.code}</span>
              {hasRisks && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs">{project.risks_count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{project.risks_count} risco(s) registrado(s)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
              {project.name}
            </h3>
            {project.client && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {project.client.clinic_name || project.client.client_name}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(project); }}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(project); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateDeliverable?.(project); }}>
                <FileText className="w-4 h-4 mr-2" />
                Criar entrega
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge className={cn("text-xs", getStatusColor(project.status))}>
            {getStatusLabel(project.status)}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
            {getPriorityLabel(project.priority)}
          </Badge>
          {project.team && (
            <Badge variant="secondary" className="text-xs">
              {getTeamLabel(project.team)}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              "font-medium",
              project.progress_pct >= 100 ? "text-emerald-600" : project.progress_pct >= 50 ? "text-blue-600" : "text-muted-foreground"
            )}>
              {project.progress_pct}%
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress_pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                project.progress_pct >= 100 
                  ? "bg-gradient-to-r from-emerald-500 to-green-500"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Show multiple owners if available, fallback to single owner */}
            {project.owners && project.owners.length > 0 ? (
              <div className="flex -space-x-2">
                {project.owners.slice(0, 3).map((owner, idx) => (
                  <Tooltip key={owner.id}>
                    <TooltipTrigger>
                      <Avatar className="h-7 w-7 ring-2 ring-background">
                        <AvatarImage src={owner.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                          {owner.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{owner.full_name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {project.owners.length > 3 && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                    +{project.owners.length - 3}
                  </div>
                )}
              </div>
            ) : project.owner && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-7 w-7 ring-2 ring-background">
                    <AvatarImage src={project.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                      {project.owner.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{project.owner.full_name}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {project.budget_planned != null && project.budget_planned > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(project.budget_planned)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Orçamento planejado</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {project.due_date && (
            <Tooltip>
              <TooltipTrigger>
                <div className={cn(
                  "flex items-center gap-1.5 text-xs",
                  isOverdue ? "text-red-500" : daysRemaining !== null && daysRemaining <= 7 ? "text-amber-500" : "text-muted-foreground"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(new Date(project.due_date), "dd MMM", { locale: ptBR })}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isOverdue 
                    ? `Atrasado há ${Math.abs(daysRemaining!)} dias` 
                    : daysRemaining === 0 
                      ? "Prazo hoje!"
                      : `${daysRemaining} dias restantes`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </motion.div>
  );
}
