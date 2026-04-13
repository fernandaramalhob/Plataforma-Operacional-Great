import { motion } from 'framer-motion';
import { 
  Calendar, 
  MoreHorizontal, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Settings, 
  Headphones, 
  HelpCircle,
  AlertTriangle,
  Clock,
  Ghost
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  type StrategicTask, 
  type StrategicTaskStatus,
  KANBAN_COLUMNS,
  getGoalConfig,
  getImpactScoreColor,
  isGhostTask
} from '@/types/strategic-tasks';

interface StrategicTaskCardProps {
  task: StrategicTask;
  index: number;
  onClick: () => void;
  onMove: (newStatus: StrategicTaskStatus) => void;
}

const goalIcons: Record<string, React.ElementType> = {
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Headphones,
  HelpCircle,
};

export function StrategicTaskCard({ task, index, onClick, onMove }: StrategicTaskCardProps) {
  const goalConfig = getGoalConfig(task.strategic_goal);
  const GoalIcon = goalIcons[goalConfig.icon] || HelpCircle;
  const isGhost = isGhostTask(task);
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'CONCLUIDO';
  const daysUntilDue = task.due_date ? differenceInDays(new Date(task.due_date), new Date()) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        "glass-surface rounded-xl p-4 cursor-pointer group hover:shadow-lg transition-all duration-200 relative",
        isGhost && "ring-2 ring-amber-400/50",
        isOverdue && "ring-2 ring-red-400/50"
      )}
    >
      {/* Ghost indicator */}
      {isGhost && (
        <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full">
          <Ghost className="w-3 h-3" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">{task.code}</span>
          {/* Impact Score Badge */}
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            getImpactScoreColor(task.impact_score)
          )}>
            {task.impact_score.toFixed(1)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-slate-500" disabled>
              Mover para...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {KANBAN_COLUMNS.filter(c => c.id !== task.status).map(col => (
              <DropdownMenuItem 
                key={col.id} 
                onClick={(e) => { e.stopPropagation(); onMove(col.id); }}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", col.color)} />
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Strategic Goal Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
          goalConfig.color
        )}>
          <GoalIcon className="w-3 h-3" />
          {goalConfig.label}
        </span>
        
        {task.strategic_goal === 'NENHUM' && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Avaliar necessidade
          </span>
        )}
      </div>

      {/* Project link */}
      {task.project && (
        <p className="text-xs text-slate-500 mb-2">
          📁 {task.project.code} - {task.project.name}
        </p>
      )}

      {/* Impact Metrics Mini */}
      <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
        <span title="Impacto Receita">💰 {task.impact_revenue}</span>
        <span title="Impacto Operacional">⚙️ {task.impact_operational}</span>
        <span title="Urgência">🔥 {task.urgency}</span>
        <span title="Esforço">💪 {task.effort_estimate}</span>
      </div>

      {/* Delay Cost */}
      {task.delay_cost_financial > 0 && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
          <span className="text-red-600 dark:text-red-400 font-medium">
            Custo do atraso: R$ {task.delay_cost_financial.toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
        {/* Due Date */}
        {task.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-red-600" : daysUntilDue !== null && daysUntilDue <= 3 ? "text-amber-600" : "text-slate-500"
          )}>
            {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
            {format(new Date(task.due_date), 'dd MMM', { locale: ptBR })}
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-[10px] font-medium text-white">
              {task.assignee.full_name?.charAt(0) || '?'}
            </div>
            <span className="text-xs text-slate-500">
              {task.assignee.full_name?.split(' ')[0]}
            </span>
          </div>
        )}

        {/* Status changes indicator */}
        {task.status_changes_count > 2 && (
          <span className="text-xs text-amber-500 flex items-center gap-1" title="Mudanças de status excessivas">
            <Clock className="w-3 h-3" />
            {task.status_changes_count}x
          </span>
        )}
      </div>
    </motion.div>
  );
}
