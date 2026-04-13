import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Check, Plus, Trash2, Target, Loader2, Clock, GripVertical, Timer, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjectGoals, ProjectGoal } from '@/hooks/useProjectGoals';

interface ProjectGoalsSectionProps {
  projectId: string;
}

export function ProjectGoalsSection({ projectId }: ProjectGoalsSectionProps) {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalHours, setNewGoalHours] = useState('');
  const { 
    goals, 
    isLoading, 
    addGoal, 
    toggleGoal, 
    updateGoal,
    reorderGoals,
    deleteGoal,
    isAdding,
    completedCount,
    totalCount,
    progressPct,
    totalEstimatedHours,
    completedEstimatedHours,
  } = useProjectGoals(projectId);

  const [orderedGoals, setOrderedGoals] = useState<ProjectGoal[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync orderedGoals with goals from DB
  const displayGoals = isDragging ? orderedGoals : goals;

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    addGoal({ 
      title: newGoalTitle.trim(), 
      estimated_hours: newGoalHours ? parseFloat(newGoalHours) : undefined 
    });
    setNewGoalTitle('');
    setNewGoalHours('');
  };

  const handleReorder = useCallback((newOrder: ProjectGoal[]) => {
    setOrderedGoals(newOrder);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const updates = orderedGoals.map((g, i) => ({ id: g.id, sort_order: i }));
    reorderGoals(updates);
  }, [orderedGoals, reorderGoals]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setOrderedGoals([...goals]);
  }, [goals]);

  const pendingGoals = displayGoals.filter(g => !g.completed);
  const completedGoals = displayGoals.filter(g => g.completed);

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          Scrum Board
        </h4>
        <div className="flex items-center gap-3">
          {totalEstimatedHours > 0 && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {completedEstimatedHours}h / {totalEstimatedHours}h
            </span>
          )}
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            completedCount === totalCount && totalCount > 0
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          )}>
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full transition-colors",
              progressPct === 100 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            )}
          />
        </div>
      )}

      {/* Add goal form */}
      <form onSubmit={handleAddGoal} className="flex gap-2">
        <Input
          placeholder="Nova sub-atividade..."
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-sm"
        />
        <div className="relative w-20">
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="Horas"
            value={newGoalHours}
            onChange={(e) => setNewGoalHours(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-sm pr-6"
          />
          <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
        <Button 
          type="submit" 
          size="sm"
          disabled={!newGoalTitle.trim() || isAdding}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </form>

      {/* Scrum Board - Pending */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
            Nenhuma sub-atividade adicionada ainda
          </div>
        ) : (
          <>
            {/* Pending section - draggable */}
            {pendingGoals.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
                  A Fazer ({pendingGoals.length})
                </p>
                <Reorder.Group 
                  axis="y" 
                  values={pendingGoals} 
                  onReorder={(newOrder) => {
                    // Merge with completed
                    handleReorder([...newOrder, ...completedGoals]);
                  }}
                  className="space-y-2 max-h-[200px] overflow-y-auto pr-1"
                >
                  {pendingGoals.map((goal) => (
                    <ScrumCard
                      key={goal.id}
                      goal={goal}
                      onToggle={() => toggleGoal({ goalId: goal.id, completed: !goal.completed })}
                      onDelete={() => deleteGoal(goal.id)}
                      onUpdateHours={(hours) => updateGoal({ goalId: goal.id, updates: { estimated_hours: hours } })}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </Reorder.Group>
              </div>
            )}

            {/* Completed section */}
            {completedGoals.length > 0 && (
              <div className="space-y-1 mt-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 dark:text-emerald-400 px-1 mb-2">
                  Concluídas ({completedGoals.length})
                </p>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {completedGoals.map((goal) => (
                      <ScrumCardCompleted
                        key={goal.id}
                        goal={goal}
                        onToggle={() => toggleGoal({ goalId: goal.id, completed: false })}
                        onDelete={() => deleteGoal(goal.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface ScrumCardProps {
  goal: ProjectGoal;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateHours: (hours: number | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function ScrumCard({ goal, onToggle, onDelete, onUpdateHours, onDragStart, onDragEnd }: ScrumCardProps) {
  const [editingHours, setEditingHours] = useState(false);
  const [hoursValue, setHoursValue] = useState(goal.estimated_hours?.toString() || '');

  const handleSaveHours = () => {
    const val = hoursValue ? parseFloat(hoursValue) : null;
    onUpdateHours(val);
    setEditingHours(false);
  };

  return (
    <Reorder.Item
      value={goal}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-2 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all",
        "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
        "hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md"
      )}
      whileDrag={{ 
        scale: 1.02, 
        boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
    >
      {/* Drag handle */}
      <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500 flex items-center justify-center transition-all"
      >
      </button>

      {/* Title */}
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 font-medium truncate">
        {goal.title}
      </span>

      {/* Time badge */}
      {editingHours ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={hoursValue}
            onChange={(e) => setHoursValue(e.target.value)}
            onBlur={handleSaveHours}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveHours()}
            className="w-16 h-6 text-xs px-1.5 bg-white dark:bg-slate-900"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => { setHoursValue(goal.estimated_hours?.toString() || ''); setEditingHours(true); }}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all flex-shrink-0",
            goal.estimated_hours 
              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
              : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 opacity-0 group-hover:opacity-100"
          )}
        >
          <Clock className="w-3 h-3" />
          {goal.estimated_hours ? `${goal.estimated_hours}h` : 'Tempo'}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </Reorder.Item>
  );
}

interface ScrumCardCompletedProps {
  goal: ProjectGoal;
  onToggle: () => void;
  onDelete: () => void;
}

function ScrumCardCompleted({ goal, onToggle, onDelete }: ScrumCardCompletedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group flex items-center gap-2 p-2.5 rounded-xl border transition-all",
        "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50"
      )}
    >
      {/* Completed checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center text-white transition-all"
      >
        <Check className="w-3 h-3" />
      </button>

      {/* Title */}
      <span className="flex-1 text-sm text-slate-400 dark:text-slate-500 line-through truncate">
        {goal.title}
      </span>

      {/* Time badge */}
      {goal.estimated_hours && (
        <span className="flex items-center gap-1 text-xs text-emerald-500/70 dark:text-emerald-400/50 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {goal.estimated_hours}h
        </span>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </motion.div>
  );
}
