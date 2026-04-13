import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  Sparkles,
  Zap,
  Code2,
  Bug,
  Rocket,
  Timer,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTechTasks, useCreateTechTask, useDeleteTechTask, useUpdateTechTask, TechTask } from '@/hooks/useTechTasks';


const STATUS_CONFIG = {
  backlog: { label: 'Backlog', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  todo: { label: 'A Fazer', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  in_progress: { label: 'Em Progresso', icon: Play, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  review: { label: 'Em Revisão', icon: Timer, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
};

const TYPE_CONFIG = {
  feature: { label: 'Feature', icon: Sparkles, color: 'text-purple-500' },
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500' },
  improvement: { label: 'Melhoria', icon: Zap, color: 'text-blue-500' },
  task: { label: 'Tarefa', icon: Code2, color: 'text-slate-500' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-slate-500/20 text-slate-500' },
  medium: { label: 'Média', color: 'bg-blue-500/20 text-blue-500' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-500' },
};

function DraggableTaskCard({ task, onDelete, onEdit, isDragging }: { task: TechTask; onDelete: (id: string) => void; onEdit: (task: TechTask) => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const typeConfig = TYPE_CONFIG[task.type];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const TypeIcon = typeConfig.icon;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
              <Badge variant="outline" className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>Editar</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(task.id)}
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h3>
          
          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
          )}

          {task.progress > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1.5" />
            </div>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{task.assignee[0]}</AvatarFallback>
                </Avatar>
                <span>{task.assignee}</span>
              </div>
            ) : (
              <span className="text-muted-foreground/50">Sem responsável</span>
            )}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: TechTask }) {
  const typeConfig = TYPE_CONFIG[task.type];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="shadow-2xl border-primary/50 bg-gradient-to-br from-card to-card/50 rotate-3 scale-105">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
            <Badge variant="outline" className={priorityConfig.color}>
              {priorityConfig.label}
            </Badge>
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h3>
      </CardContent>
    </Card>
  );
}

function DroppableStatusColumn({ 
  status, 
  tasks, 
  onAddTask,
  onDeleteTask,
  onEditTask,
  activeTaskId,
}: { 
  status: keyof typeof STATUS_CONFIG; 
  tasks: TechTask[];
  onAddTask: (status: TechTask['status']) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: TechTask) => void;
  activeTaskId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      <div className={cn('flex items-center gap-2 mb-4 px-2 py-2 rounded-lg', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="font-semibold text-sm">{config.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>
      </div>
      
      <div 
        ref={setNodeRef}
        className={cn(
          "space-y-3 flex-1 overflow-y-auto pr-1 min-h-[200px] rounded-lg transition-colors p-2 -m-2",
          isOver && "bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        {tasks.map(task => (
          <DraggableTaskCard 
            key={task.id} 
            task={task} 
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            isDragging={activeTaskId === task.id}
          />
        ))}
        
        <Button 
          variant="ghost" 
          className="w-full border-dashed border-2 hover:border-primary/50"
          onClick={() => onAddTask(status)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova tarefa
        </Button>
      </div>
    </div>
  );
}

export default function TechERP() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TechTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    type: 'task' as TechTask['type'],
    priority: 'medium' as TechTask['priority'],
    status: 'backlog' as TechTask['status'],
    assignee: '',
    dueDate: '',
    tags: '',
  });

  const [activeTask, setActiveTask] = useState<TechTask | null>(null);
  
  const { data: tasks = [], isLoading } = useTechTasks();
  const createTask = useCreateTechTask();
  const deleteTask = useDeleteTechTask();
  const updateTask = useUpdateTechTask();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as TechTask;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TechTask['status'];
    
    // Find the task being dragged
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await updateTask.mutateAsync({ id: taskId, status: newStatus });
      toast.success(`Tarefa movida para ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      toast.error('Erro ao mover tarefa');
      console.error(error);
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      type: 'task',
      priority: 'medium',
      status: 'backlog',
      assignee: '',
      dueDate: '',
      tags: '',
    });
    setEditingTask(null);
  };

  const handleOpenDialog = (status: TechTask['status'] = 'backlog') => {
    resetForm();
    setTaskForm(prev => ({ ...prev, status }));
    setIsDialogOpen(true);
  };

  const handleEditTask = (task: TechTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      type: task.type,
      priority: task.priority,
      status: task.status,
      assignee: task.assignee || '',
      dueDate: task.due_date ? task.due_date.split('T')[0] : '',
      tags: task.tags.join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        await updateTask.mutateAsync({
          id: editingTask.id,
          title: taskForm.title,
          description: taskForm.description || null,
          type: taskForm.type,
          priority: taskForm.priority,
          status: taskForm.status,
          assignee: taskForm.assignee || null,
          due_date: taskForm.dueDate || null,
          tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        });
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        // Create new task
        await createTask.mutateAsync({
          title: taskForm.title,
          description: taskForm.description || undefined,
          type: taskForm.type,
          priority: taskForm.priority,
          status: taskForm.status,
          assignee: taskForm.assignee || undefined,
          due_date: taskForm.dueDate || undefined,
          tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        });
        toast.success('Tarefa criada com sucesso!');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(editingTask ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa');
      console.error(error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
      console.error(error);
    }
  };

  const getTasksByStatus = (status: keyof typeof STATUS_CONFIG) => {
    const filtered = tasks.filter(t => t.status === status);
    if (searchQuery) {
      return filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-cyan-500/5 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-cyan-500/5 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ERP Tech</h1>
            <p className="text-muted-foreground text-sm">Gerenciamento de projetos e tarefas</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-card to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de tarefas</p>
              </div>
              <Code2 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">Em progresso</p>
              </div>
              <Play className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.done}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          <ChevronDown className="h-4 w-4" />
        </Button>
        
        <Button 
          className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          onClick={() => handleOpenDialog('backlog')}
        >
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          <DroppableStatusColumn status="backlog" tasks={getTasksByStatus('backlog')} onAddTask={handleOpenDialog} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} activeTaskId={activeTask?.id ?? null} />
          <DroppableStatusColumn status="todo" tasks={getTasksByStatus('todo')} onAddTask={handleOpenDialog} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} activeTaskId={activeTask?.id ?? null} />
          <DroppableStatusColumn status="in_progress" tasks={getTasksByStatus('in_progress')} onAddTask={handleOpenDialog} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} activeTaskId={activeTask?.id ?? null} />
          <DroppableStatusColumn status="review" tasks={getTasksByStatus('review')} onAddTask={handleOpenDialog} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} activeTaskId={activeTask?.id ?? null} />
          <DroppableStatusColumn status="done" tasks={getTasksByStatus('done')} onAddTask={handleOpenDialog} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} activeTaskId={activeTask?.id ?? null} />
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Add/Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTask ? (
                <>
                  <Code2 className="h-5 w-5 text-primary" />
                  Editar Tarefa
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Tarefa
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Implementar nova feature"
              />
            </div>
            
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={taskForm.description}
                onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva a tarefa..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={taskForm.type}
                  onValueChange={v => setTaskForm(prev => ({ ...prev, type: v as TechTask['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">✨ Feature</SelectItem>
                    <SelectItem value="bug">🐛 Bug</SelectItem>
                    <SelectItem value="improvement">⚡ Melhoria</SelectItem>
                    <SelectItem value="task">📝 Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={v => setTaskForm(prev => ({ ...prev, priority: v as TechTask['priority'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={v => setTaskForm(prev => ({ ...prev, status: v as TechTask['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="review">Em Revisão</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Responsável</Label>
                <Input
                  value={taskForm.assignee}
                  onChange={e => setTaskForm(prev => ({ ...prev, assignee: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Conclusão</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={taskForm.tags}
                  onChange={e => setTaskForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Ex: frontend, api, urgent"
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveTask} 
              disabled={!taskForm.title.trim() || createTask.isPending || updateTask.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {(createTask.isPending || updateTask.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingTask ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                editingTask ? 'Salvar Alterações' : 'Criar Tarefa'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
