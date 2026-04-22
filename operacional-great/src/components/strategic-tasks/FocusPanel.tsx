import { motion } from 'framer-motion';
import { Target, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type StrategicTask, getGoalConfig, getImpactScoreColor } from '@/types/strategic-tasks';

interface FocusPanelProps {
  topTasks: StrategicTask[];
  onOpenTask: (task: StrategicTask) => void;
}

export function FocusPanel({ topTasks, onOpenTask }: FocusPanelProps) {
  if (topTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-surface rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Foco do Dia</h3>
            <p className="text-xs text-slate-500">Nenhuma tarefa pendente</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm">
          🎉 Parabéns! Todas as tarefas foram concluídas.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface rounded-2xl p-6 border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-xl blur-lg opacity-30 animate-pulse" />
            <div className="relative p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Foco do Dia</h3>
            <p className="text-xs text-slate-500">Se você só fizer isso hoje, o negócio anda</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full font-medium">
          <Zap className="w-3 h-3" />
          Top {topTasks.length} prioridades
        </div>
      </div>

      {/* Top Tasks */}
      <div className="space-y-3">
        {topTasks.map((task, index) => {
          const goalConfig = getGoalConfig(task.strategic_goal);
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onOpenTask(task)}
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all group"
            >
              {/* Rank */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white",
                index === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                index === 1 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
                "bg-gradient-to-br from-orange-400 to-orange-600"
              )}>
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{task.code}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-bold",
                    getImpactScoreColor(task.impact_score)
                  )}>
                    Score: {task.impact_score.toFixed(1)}
                  </span>
                </div>
                <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {task.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    goalConfig.color
                  )}>
                    {goalConfig.label}
                  </span>
                  {task.assignee && (
                    <span className="text-xs text-slate-500">
                      → {task.assignee.full_name?.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Impact indicators */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {task.delay_cost_financial > 0 && (
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                    -R$ {(task.delay_cost_financial / 1000).toFixed(0)}k/dia
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
