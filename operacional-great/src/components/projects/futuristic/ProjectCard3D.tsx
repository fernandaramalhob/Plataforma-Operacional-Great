import { Calendar, AlertTriangle, MoreHorizontal, ExternalLink, Copy, FileText, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/projects';
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getTeamLabel } from '@/types/projects';
import { useRef, useState, useCallback } from 'react';

interface ProjectCard3DProps {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onCreateDeliverable?: (project: Project) => void;
}

export function ProjectCard3D({ project, index, onOpen, onEdit, onDelete, onDuplicate, onCreateDeliverable }: ProjectCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const daysRemaining = project.due_date ? differenceInDays(new Date(project.due_date), new Date()) : null;
  const isOverdue = project.due_date && isPast(new Date(project.due_date)) && project.status !== 'CONCLUIDO';
  const hasRisks = project.risks_count > 0;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;
    const mouseX = (x / rect.width) * 100;
    const mouseY = (y / rect.height) * 100;
    setTilt({ rotateX, rotateY, mouseX, mouseY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className="group relative"
      style={{ perspective: '1200px' }}
    >
      {/* Edge glow effect */}
      <motion.div 
        className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-violet-500/30 blur-xl opacity-0 transition-opacity duration-300 pointer-events-none"
        animate={{ opacity: isHovered ? 0.6 : 0 }}
      />

      <motion.div 
        onClick={() => onOpen(project)}
        className={cn(
          "relative rounded-2xl p-5 cursor-pointer overflow-hidden",
          "glass-surface border transition-all duration-200",
          isOverdue ? "border-red-500/30" : "border-slate-200/80",
          isHovered && "shadow-2xl shadow-slate-900/10"
        )}
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(${isHovered ? 18 : 0}px) translateY(${isHovered ? -6 : 0}px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Specular highlight */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${tilt.mouseX}% ${tilt.mouseY}%, rgba(255,255,255,0.5), transparent 50%)`,
            mixBlendMode: 'overlay',
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Status indicator line */}
        <div className={cn(
          "absolute top-0 left-6 right-6 h-0.5 rounded-full",
          project.status === 'EM_ANDAMENTO' && "bg-gradient-to-r from-cyan-500 to-blue-500",
          project.status === 'CONCLUIDO' && "bg-gradient-to-r from-emerald-500 to-green-500",
          project.status === 'EM_RISCO' && "bg-gradient-to-r from-red-500 to-orange-500",
          project.status === 'PAUSADO' && "bg-gradient-to-r from-amber-500 to-yellow-500",
          project.status === 'PLANEJADO' && "bg-gradient-to-r from-slate-400 to-slate-500",
          project.status === 'CANCELADO' && "bg-gradient-to-r from-gray-400 to-gray-500",
        )} />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                {project.code}
              </span>
              {hasRisks && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs font-medium">{project.risks_count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{project.risks_count} risco(s) registrado(s)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
              {project.name}
            </h3>
            {project.client && (
              <p className="text-sm text-slate-500 line-clamp-1">
                {project.client.clinic_name || project.client.client_name}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/80"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-surface-strong">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(project); }}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(project); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(project); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateDeliverable?.(project); }}>
                <FileText className="w-4 h-4 mr-2" />
                Criar entrega
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete?.(project); }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-4">
          <Badge className={cn("text-xs rounded-full", getStatusColor(project.status))}>
            {getStatusLabel(project.status)}
          </Badge>
          <Badge variant="outline" className={cn("text-xs rounded-full", getPriorityColor(project.priority))}>
            {getPriorityLabel(project.priority)}
          </Badge>
          {project.team && (
            <Badge variant="secondary" className="text-xs rounded-full bg-slate-100 text-slate-600">
              {getTeamLabel(project.team)}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative z-10 space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Progresso</span>
            <span className={cn(
              "font-semibold tabular-nums",
              project.progress_pct >= 100 ? "text-emerald-600" : project.progress_pct >= 50 ? "text-cyan-600" : "text-slate-600"
            )}>
              {project.progress_pct}%
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
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
            {/* Shimmer effect */}
            {project.progress_pct > 0 && project.progress_pct < 100 && (
              <div className="absolute inset-0 shimmer opacity-30" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {/* Show multiple owners if available, fallback to single owner */}
            {project.owners && project.owners.length > 0 ? (
              <div className="flex -space-x-2">
                {project.owners.slice(0, 3).map((owner, idx) => (
                  <Tooltip key={owner.id}>
                    <TooltipTrigger>
                      <Avatar className="h-7 w-7 ring-2 ring-white">
                        <AvatarImage src={owner.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
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
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium ring-2 ring-white text-slate-600">
                    +{project.owners.length - 3}
                  </div>
                )}
              </div>
            ) : project.owner && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-7 w-7 ring-2 ring-white">
                    <AvatarImage src={project.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-violet-600 text-white">
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
                  <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-medium tabular-nums">
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
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg",
                  isOverdue ? "text-red-600 bg-red-50" : daysRemaining !== null && daysRemaining <= 7 ? "text-amber-600 bg-amber-50" : "text-slate-500 bg-slate-50"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-medium">{format(new Date(project.due_date), "dd MMM", { locale: ptBR })}</span>
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

        {/* Holo border */}
        <div className="absolute inset-0 rounded-2xl holo-border pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}
