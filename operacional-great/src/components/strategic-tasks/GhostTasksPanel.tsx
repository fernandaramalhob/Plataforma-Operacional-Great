import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, AlertTriangle, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type StrategicTask, getStatusConfig } from '@/types/strategic-tasks';
import { differenceInDays } from 'date-fns';

interface GhostTasksPanelProps {
  ghostTasks: StrategicTask[];
  onOpenTask: (task: StrategicTask) => void;
}

export function GhostTasksPanel({ ghostTasks, onOpenTask }: GhostTasksPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (ghostTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface rounded-2xl border-2 border-amber-300 dark:border-amber-700 overflow-hidden"
    >
      {/* Header - clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-xl">
            <Ghost className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Tarefas Fantasma
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {ghostTasks.length} tarefa{ghostTasks.length !== 1 ? 's' : ''} que precisa{ghostTasks.length !== 1 ? 'm' : ''} de atenção
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-sm font-medium">
            {ghostTasks.length}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-amber-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-600" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 border-t border-amber-200 dark:border-amber-800">
              {ghostTasks.map((task) => {
                const daysSinceCreation = differenceInDays(new Date(), new Date(task.created_at));
                const statusConfig = getStatusConfig(task.status);
                
                // Determine why it's a ghost
                const reasons: string[] = [];
                if (daysSinceCreation > 14 && !['CONCLUIDO', 'CANCELADO'].includes(task.status)) {
                  reasons.push('Aberta há mais de 14 dias');
                }
                if (task.status_changes_count > 3) {
                  reasons.push('Status mudou muitas vezes');
                }
                if (!task.assigned_to_user_id && daysSinceCreation > 7 && task.status !== 'BACKLOG') {
                  reasons.push('Sem responsável definido');
                }

                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all"
                  >
                    <Ghost className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400">{task.code}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          statusConfig.color.replace('bg-', 'bg-opacity-20 '),
                          statusConfig.color.includes('emerald') ? 'text-emerald-700' :
                          statusConfig.color.includes('amber') ? 'text-amber-700' :
                          statusConfig.color.includes('blue') ? 'text-blue-700' :
                          statusConfig.color.includes('purple') ? 'text-purple-700' :
                          statusConfig.color.includes('red') ? 'text-red-700' :
                          'text-slate-700'
                        )}>
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate mb-2">
                        {task.title}
                      </h4>

                      {/* Reasons */}
                      <div className="flex flex-wrap gap-2">
                        {reasons.map((reason, i) => (
                          <span 
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg"
                          >
                            {reason.includes('14 dias') && <Clock className="w-3 h-3" />}
                            {reason.includes('muitas vezes') && <AlertTriangle className="w-3 h-3" />}
                            {reason.includes('responsável') && <User className="w-3 h-3" />}
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex-shrink-0">
                      {daysSinceCreation}d atrás
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
