import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KANBAN_COLUMNS, type StrategicTask, type StrategicTaskStatus } from '@/types/strategic-tasks';
import { StrategicTaskCard } from './StrategicTaskCard';

interface StrategicKanbanProps {
  tasks: StrategicTask[];
  tasksByStatus: (status: StrategicTaskStatus) => StrategicTask[];
  onMoveTask: (taskId: string, newStatus: StrategicTaskStatus) => void;
  onOpenTask: (task: StrategicTask) => void;
  onAddTask: (status: StrategicTaskStatus) => void;
}

export function StrategicKanban({ 
  tasksByStatus, 
  onMoveTask, 
  onOpenTask,
  onAddTask 
}: StrategicKanbanProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {KANBAN_COLUMNS.map((column, columnIndex) => {
          const columnTasks = tasksByStatus(column.id);
          
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: columnIndex * 0.08 }}
              className="w-[320px] flex-shrink-0"
            >
              {/* Column Header */}
              <div className="glass-surface rounded-xl p-3 mb-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {column.label}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => onAddTask(column.id)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Column Content */}
              <div className="space-y-3 min-h-[400px]">
                {columnTasks.map((task, index) => (
                  <StrategicTaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onClick={() => onOpenTask(task)}
                    onMove={(newStatus) => onMoveTask(task.id, newStatus)}
                  />
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="glass-surface rounded-xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm text-slate-400">Nenhuma tarefa</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
