import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Target, 
  Layers, 
  BarChart3, 
  Plus,
  Loader2,
  LayoutGrid,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrategicTasks } from '@/hooks/useStrategicTasks';
import { useProjectsData } from '@/hooks/useProjectsData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  StrategicKanban,
  FocusPanel,
  GhostTasksPanel,
  AddStrategicTaskDialog,
} from '@/components/strategic-tasks';
import { SceneShell } from '@/components/projects/futuristic';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { StrategicTask, StrategicTaskStatus } from '@/types/strategic-tasks';

type ViewMode = 'EXECUCAO' | 'DIRETOR';

export default function StrategicTasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('EXECUCAO');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<StrategicTaskStatus>('TODO');
  const [selectedTask, setSelectedTask] = useState<StrategicTask | null>(null);

  const { 
    tasks, 
    topTasks, 
    ghostTasks,
    tasksByStatus,
    isLoading, 
    createTask, 
    moveTask,
    isCreating 
  } = useStrategicTasks();

  const { projects } = useProjectsData();

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  // Keyboard shortcut for new task
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      setAddDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAddTask = (status: StrategicTaskStatus) => {
    setInitialStatus(status);
    setAddDialogOpen(true);
  };

  const handleOpenTask = (task: StrategicTask) => {
    setSelectedTask(task);
    // TODO: Open task detail modal
    console.log('Open task:', task);
  };

  const handleMoveTask = async (taskId: string, newStatus: StrategicTaskStatus) => {
    await moveTask({ id: taskId, status: newStatus });
  };

  // Stats
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'EM_ANDAMENTO').length,
    blocked: tasks.filter(t => t.status === 'BLOQUEADO').length,
    completed: tasks.filter(t => t.status === 'CONCLUIDO').length,
    ghostCount: ghostTasks.length,
    avgImpactScore: tasks.length > 0 
      ? (tasks.reduce((sum, t) => sum + t.impact_score, 0) / tasks.length).toFixed(1)
      : '0.0',
  };

  if (isLoading) {
    return (
      <SceneShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <Loader2 className="w-12 h-12 text-red-500 animate-spin relative" />
            </div>
            <p className="text-slate-500 font-medium">Carregando tarefas...</p>
          </div>
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl blur-lg opacity-40" />
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Tarefas Estratégicas
              </h1>
              <p className="text-slate-500 text-sm">
                {stats.total} tarefas · Score médio: {stats.avgImpactScore}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(val) => val && setViewMode(val as ViewMode)}
              className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
            >
              <ToggleGroupItem 
                value="EXECUCAO" 
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'EXECUCAO' && "bg-white dark:bg-slate-700 shadow-sm"
                )}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Execução
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="DIRETOR" 
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'DIRETOR' && "bg-white dark:bg-slate-700 shadow-sm"
                )}
              >
                <Target className="w-4 h-4 mr-2" />
                Diretor
              </ToggleGroupItem>
            </ToggleGroup>

            {/* New Task Button */}
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </motion.div>

        {/* Stats Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3"
        >
          <div className="glass-surface px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {stats.inProgress} em andamento
            </span>
          </div>
          <div className="glass-surface px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {stats.blocked} bloqueadas
            </span>
          </div>
          <div className="glass-surface px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {stats.completed} concluídas
            </span>
          </div>
          {stats.ghostCount > 0 && (
            <div className="glass-surface px-4 py-2 rounded-full flex items-center gap-2 border border-amber-300">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm text-amber-600 font-medium">
                {stats.ghostCount} fantasma{stats.ghostCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </motion.div>

        {/* Director Mode: Focus Panel + Ghost Tasks */}
        {viewMode === 'DIRETOR' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <FocusPanel topTasks={topTasks} onOpenTask={handleOpenTask} />
            <GhostTasksPanel ghostTasks={ghostTasks} onOpenTask={handleOpenTask} />
          </motion.div>
        )}

        {/* Execution Mode: Kanban */}
        {viewMode === 'EXECUCAO' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <StrategicKanban
              tasks={tasks}
              tasksByStatus={tasksByStatus}
              onMoveTask={handleMoveTask}
              onOpenTask={handleOpenTask}
              onAddTask={handleAddTask}
            />
          </motion.div>
        )}

        {/* Add Task Dialog */}
        <AddStrategicTaskDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={createTask}
          isSubmitting={isCreating}
          projects={projects}
          users={users}
          initialStatus={initialStatus}
        />
      </div>
    </SceneShell>
  );
}
