import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Filter, Plus, Clock, GripVertical, Trash2, Users, Loader2, Timer, FileText, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAllProjectGoals, useProjectGoals, type ProjectGoal, type ScrumStatus } from '@/hooks/useProjectGoals';
import { GoalDetailDialog } from './GoalDetailDialog';
import type { Project } from '@/types/projects';

interface ProjectsScrumViewProps {
  projects: Project[];
}

const SCRUM_COLUMNS: { id: ScrumStatus; label: string; dotColor: string; headerBg: string; borderColor: string }[] = [
  { id: 'TODO', label: 'A Fazer', dotColor: 'bg-blue-500', headerBg: 'bg-blue-500/8 dark:bg-blue-500/15', borderColor: 'border-t-blue-500' },
  { id: 'IN_PROGRESS', label: 'Em Andamento', dotColor: 'bg-amber-500', headerBg: 'bg-amber-500/8 dark:bg-amber-500/15', borderColor: 'border-t-amber-500' },
  { id: 'REVIEW', label: 'Revisão', dotColor: 'bg-purple-500', headerBg: 'bg-purple-500/8 dark:bg-purple-500/15', borderColor: 'border-t-purple-500' },
  { id: 'DONE', label: 'Concluído', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-500/8 dark:bg-emerald-500/15', borderColor: 'border-t-emerald-500' },
];

const COLUMN_IDS = SCRUM_COLUMNS.map(c => c.id);

export function ProjectsScrumView({ projects }: ProjectsScrumViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newHours, setNewHours] = useState('');
  const [activeGoal, setActiveGoal] = useState<(ProjectGoal & { projectName?: string }) | null>(null);
  const [detailGoal, setDetailGoal] = useState<ProjectGoal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Local state for optimistic reordering
  const [localGoals, setLocalGoals] = useState<ProjectGoal[] | null>(null);

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'CANCELADO'), [projects]);

  const projectIds = useMemo(() => {
    if (selectedProjectId === 'ALL') return activeProjects.map(p => p.id);
    return [selectedProjectId];
  }, [selectedProjectId, activeProjects]);

  const { allGoals, isLoading, moveGoal, updateGoal, deleteGoal: deleteGoalAll, reorderGoals } = useAllProjectGoals(projectIds);

  // Use localGoals during drag, allGoals otherwise
  const displayGoals = localGoals ?? allGoals;

  const addProjectId = selectedProjectId !== 'ALL' ? selectedProjectId : (activeProjects[0]?.id ?? null);
  const { addGoal, isAdding } = useProjectGoals(addProjectId);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findColumnForGoal = useCallback((goalId: string): ScrumStatus | null => {
    const goals = localGoals ?? allGoals;
    const goal = goals.find(g => g.id === goalId);
    return goal?.scrum_status ?? null;
  }, [localGoals, allGoals]);

  const getGoalsByStatus = useCallback((status: ScrumStatus) =>
    displayGoals.filter(g => g.scrum_status === status),
    [displayGoals]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const goal = allGoals.find(g => g.id === event.active.id);
    if (goal) {
      const project = projectMap.get(goal.project_id);
      setActiveGoal({ ...goal, projectName: project?.name });
      setLocalGoals([...allGoals]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localGoals) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumn: ScrumStatus | null = null;
    if (COLUMN_IDS.includes(overId as ScrumStatus)) {
      targetColumn = overId as ScrumStatus;
    } else {
      targetColumn = findColumnForGoal(overId);
    }

    if (!targetColumn) return;

    const activeGoalLocal = localGoals.find(g => g.id === activeId);
    if (!activeGoalLocal) return;

    // If moving to a different column
    if (activeGoalLocal.scrum_status !== targetColumn) {
      setLocalGoals(prev => {
        if (!prev) return prev;
        return prev.map(g =>
          g.id === activeId ? { ...g, scrum_status: targetColumn! } : g
        );
      });
    }

    // Reorder within the column
    if (!COLUMN_IDS.includes(overId as ScrumStatus)) {
      const overGoal = localGoals.find(g => g.id === overId);
      if (overGoal && overGoal.scrum_status === targetColumn) {
        setLocalGoals(prev => {
          if (!prev) return prev;
          const columnGoals = prev.filter(g => g.scrum_status === targetColumn);
          const otherGoals = prev.filter(g => g.scrum_status !== targetColumn);
          
          const oldIndex = columnGoals.findIndex(g => g.id === activeId);
          const newIndex = columnGoals.findIndex(g => g.id === overId);
          
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
          
          const reordered = arrayMove(columnGoals, oldIndex, newIndex);
          return [...otherGoals, ...reordered];
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGoal(null);
    
    if (!localGoals) return;

    const { active, over } = event;
    if (!over) {
      setLocalGoals(null);
      return;
    }

    // Build final sort orders per column and persist
    const updates: { id: string; sort_order: number; scrum_status?: ScrumStatus }[] = [];
    
    for (const col of COLUMN_IDS) {
      const columnGoals = localGoals.filter(g => g.scrum_status === col);
      columnGoals.forEach((g, i) => {
        const original = allGoals.find(o => o.id === g.id);
        const statusChanged = original && original.scrum_status !== g.scrum_status;
        const orderChanged = original && original.sort_order !== i;
        if (statusChanged || orderChanged) {
          updates.push({
            id: g.id,
            sort_order: i,
            ...(statusChanged ? { scrum_status: g.scrum_status } : {}),
          });
        }
      });
    }

    if (updates.length > 0) {
      reorderGoals(updates);
    }

    setLocalGoals(null);
  };

  const handleDragCancel = () => {
    setActiveGoal(null);
    setLocalGoals(null);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !addProjectId) return;
    addGoal({ title: newTitle.trim(), estimated_hours: newHours ? parseFloat(newHours) : undefined });
    setNewTitle('');
    setNewHours('');
  };

  const handleCardClick = (goal: ProjectGoal) => {
    setDetailGoal(goal);
    setDetailOpen(true);
  };

  const handleUpdateGoal = (goalId: string, updates: any) => {
    updateGoal({ goalId, updates });
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoalAll(goalId);
  };

  const totalHours = displayGoals.reduce((s, g) => s + (g.estimated_hours || 0), 0);
  const doneHours = displayGoals.filter(g => g.scrum_status === 'DONE').reduce((s, g) => s + (g.estimated_hours || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex items-center gap-3 bg-surface rounded-xl border border-border p-3 flex-1">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[320px] bg-background border-border">
              <SelectValue placeholder="Filtrar por projeto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Projetos</SelectItem>
              {activeProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProjectId !== 'ALL' && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedProjectId('ALL')} className="text-xs">
              Limpar
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{displayGoals.length}</span> tarefas
            </span>
            {totalHours > 0 && (
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">{doneHours}h</span> / {totalHours}h
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add task form */}
      {addProjectId && (
        <form onSubmit={handleAddGoal} className="flex gap-2 items-center bg-surface rounded-xl border border-border p-3">
          <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {selectedProjectId === 'ALL' && (
            <Select value={addProjectId} onValueChange={() => {}}>
              <SelectTrigger className="w-[200px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Nova atividade..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-background border-border text-sm"
          />
          <div className="relative w-20">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="Horas"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              className="bg-background border-border text-sm pr-6"
            />
            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <Button type="submit" size="sm" disabled={!newTitle.trim() || isAdding}>
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </form>
      )}

      {/* Pipeline columns */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {SCRUM_COLUMNS.map((column) => {
              const columnGoals = getGoalsByStatus(column.id);
              const columnHours = columnGoals.reduce((s, g) => s + (g.estimated_hours || 0), 0);
              return (
                <ScrumColumn
                  key={column.id}
                  column={column}
                  goals={columnGoals}
                  columnHours={columnHours}
                  projectMap={projectMap}
                  onCardClick={handleCardClick}
                  onDeleteGoal={handleDeleteGoal}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeGoal && (
              <div className="w-[300px]">
                <ScrumCardOverlay goal={activeGoal} projectName={activeGoal.projectName} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Detail dialog */}
      <GoalDetailDialog
        goal={detailGoal}
        projectName={detailGoal ? projectMap.get(detailGoal.project_id)?.name : undefined}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={handleUpdateGoal}
        onDelete={handleDeleteGoal}
      />
    </motion.div>
  );
}

/* ─── Column ─── */
interface ScrumColumnProps {
  column: typeof SCRUM_COLUMNS[number];
  goals: ProjectGoal[];
  columnHours: number;
  projectMap: Map<string, Project>;
  onCardClick: (goal: ProjectGoal) => void;
  onDeleteGoal: (id: string) => void;
}

function ScrumColumn({ column, goals, columnHours, projectMap, onCardClick, onDeleteGoal }: ScrumColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const goalIds = useMemo(() => goals.map(g => g.id), [goals]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[300px] w-[300px] rounded-xl border border-border transition-all border-t-[3px]',
        column.borderColor,
        isOver ? 'bg-accent/50 border-primary/40 shadow-lg' : 'bg-card'
      )}
    >
      {/* Header */}
      <div className={cn('p-4 border-b border-border', column.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', column.dotColor)} />
            <h3 className="font-semibold text-sm text-foreground">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs font-mono h-6 min-w-[28px] justify-center">
            {goals.length}
          </Badge>
        </div>
        {columnHours > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5 ml-4">
            <Clock className="w-3 h-3" />
            {columnHours}h estimadas
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)]">
        <SortableContext items={goalIds} strategy={verticalListSortingStrategy}>
          {goals.map(goal => (
            <ScrumCard
              key={goal.id}
              goal={goal}
              projectName={projectMap.get(goal.project_id)?.name}
              onClick={() => onCardClick(goal)}
              onDelete={() => onDeleteGoal(goal.id)}
            />
          ))}
        </SortableContext>
        {goals.length === 0 && (
          <div className={cn(
            'text-center py-10 text-muted-foreground text-xs rounded-lg border-2 border-dashed border-border',
            isOver && 'border-primary/40 bg-primary/5'
          )}>
            Arraste tarefas para cá
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sortable Card ─── */
interface ScrumCardProps {
  goal: ProjectGoal;
  projectName?: string;
  onClick: () => void;
  onDelete: () => void;
}

function ScrumCard({ goal, projectName, onClick, onDelete }: ScrumCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasDescription = !!goal.description;
  const hasSprintWeek = !!goal.sprint_week;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative transition-shadow cursor-pointer',
        'hover:shadow-md hover:border-primary/30',
        isDragging && 'opacity-40 shadow-xl z-50',
        goal.scrum_status === 'DONE' && 'opacity-70'
      )}
      onClick={onClick}
    >
      {/* Drag handle area */}
      <div
        className="absolute top-0 left-0 w-8 h-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      </div>

      {/* Delete button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="pl-7 pr-3 py-3 space-y-2.5">
        {projectName && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {projectName}
          </span>
        )}
        <p className={cn(
          "font-medium text-sm text-foreground leading-snug",
          goal.scrum_status === 'DONE' && 'line-through text-muted-foreground'
        )}>
          {goal.title}
        </p>
        {(goal.estimated_hours || hasDescription || hasSprintWeek) && (
          <div className="flex items-center gap-2 flex-wrap">
            {goal.estimated_hours && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal">
                <Clock className="w-2.5 h-2.5" />
                {goal.estimated_hours}h
              </Badge>
            )}
            {hasSprintWeek && (
              <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal">
                <Calendar className="w-2.5 h-2.5" />
                S{goal.sprint_week}
              </Badge>
            )}
            {hasDescription && (
              <FileText className="w-3 h-3 text-muted-foreground/50" />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Drag Overlay ─── */
function ScrumCardOverlay({ goal, projectName }: { goal: ProjectGoal; projectName?: string }) {
  return (
    <Card className="p-3 pl-4 shadow-2xl border-primary/40 bg-background">
      <div className="space-y-2">
        {projectName && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{projectName}</span>
        )}
        <p className="font-medium text-sm text-foreground">{goal.title}</p>
        <div className="flex items-center gap-2">
          {goal.estimated_hours && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal">
              <Clock className="w-2.5 h-2.5" />
              {goal.estimated_hours}h
            </Badge>
          )}
          {goal.sprint_week && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal">
              <Calendar className="w-2.5 h-2.5" />
              S{goal.sprint_week}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
