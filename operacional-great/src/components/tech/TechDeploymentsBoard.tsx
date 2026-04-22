import { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Play,
  Plus,
  MoreHorizontal,
  Calendar,
  HeadphonesIcon,
  Loader2,
  GripVertical,
  PackageCheck,
  MessageSquarePlus,
} from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent,
  DragOverlay, 
  DragStartEvent, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  UniqueIdentifier,
  useDroppable,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { 
  useTechDeployments, 
  useCreateTechDeployment, 
  useDeleteTechDeployment, 
  useUpdateTechDeployment,
  useUpdateDeploymentPositions,
  TechDeployment 
} from '@/hooks/useTechDeployments';

const STATUS_CONFIG = {
  todo: { label: 'A Fazer', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  in_progress: { label: 'Em Progresso', icon: Play, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  requested: { label: 'Solicitado', icon: MessageSquarePlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  support: { label: 'Suporte', icon: HeadphonesIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-slate-500/20 text-slate-500' },
  medium: { label: 'Média', color: 'bg-blue-500/20 text-blue-500' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-500' },
};

type StatusType = keyof typeof STATUS_CONFIG;

function SortableDeploymentCard({ 
  deployment, 
  onDelete, 
  onEdit, 
}: { 
  deployment: TechDeployment; 
  onDelete: (id: string) => void; 
  onEdit: (d: TechDeployment) => void; 
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging,
  } = useSortable({
    id: deployment.id,
    data: { deployment, type: 'deployment' },
  });

  const priorityConfig = PRIORITY_CONFIG[deployment.priority];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
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
                <DropdownMenuItem onClick={() => onEdit(deployment)}>Editar</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(deployment.id)}
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{deployment.title}</h3>
          
          {deployment.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{deployment.description}</p>
          )}

          {deployment.client_name && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-3">
              {deployment.client_name}
            </Badge>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {deployment.assignee ? (
              <span>{deployment.assignee}</span>
            ) : (
              <span className="text-muted-foreground/50">Sem responsável</span>
            )}
            {deployment.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(deployment.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeploymentCardOverlay({ deployment }: { deployment: TechDeployment }) {
  const priorityConfig = PRIORITY_CONFIG[deployment.priority];

  return (
    <Card className="shadow-2xl border-primary/50 bg-gradient-to-br from-card to-card/50 rotate-3 scale-105 w-[260px]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={priorityConfig.color}>
              {priorityConfig.label}
            </Badge>
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{deployment.title}</h3>
      </CardContent>
    </Card>
  );
}

function DroppableStatusColumn({ 
  status, 
  deployments, 
  onAddDeployment,
  onDeleteDeployment,
  onEditDeployment,
}: { 
  status: StatusType; 
  deployments: TechDeployment[];
  onAddDeployment: (status: TechDeployment['status']) => void;
  onDeleteDeployment: (id: string) => void;
  onEditDeployment: (d: TechDeployment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  });

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  const deploymentIds = useMemo(() => deployments.map(d => d.id), [deployments]);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px]">
      <div className={cn('flex items-center gap-2 mb-4 px-2 py-2 rounded-lg', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="font-semibold text-sm">{config.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {deployments.length}
        </Badge>
      </div>
      
      <div 
        ref={setNodeRef}
        className={cn(
          "space-y-3 flex-1 overflow-y-auto pr-1 min-h-[150px] rounded-lg transition-colors p-2 -m-2",
          isOver && "bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        <SortableContext items={deploymentIds} strategy={verticalListSortingStrategy}>
          {deployments.map(deployment => (
            <SortableDeploymentCard 
              key={deployment.id} 
              deployment={deployment} 
              onDelete={onDeleteDeployment}
              onEdit={onEditDeployment}
            />
          ))}
        </SortableContext>
        
        <Button 
          variant="ghost" 
          className="w-full border-dashed border-2 hover:border-primary/50"
          onClick={() => onAddDeployment(status)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova implantação
        </Button>
      </div>
    </div>
  );
}

export default function TechDeploymentsBoard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<TechDeployment | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TechDeployment['priority'],
    status: 'todo' as TechDeployment['status'],
    client_name: '',
    assignee: '',
    due_date: '',
  });

  const [activeDeployment, setActiveDeployment] = useState<TechDeployment | null>(null);
  const [localDeployments, setLocalDeployments] = useState<TechDeployment[] | null>(null);
  const [dragOriginalStatus, setDragOriginalStatus] = useState<StatusType | null>(null);
  
  const { data: serverDeployments = [], isLoading } = useTechDeployments();
  const createDeployment = useCreateTechDeployment();
  const deleteDeployment = useDeleteTechDeployment();
  const updateDeployment = useUpdateTechDeployment();
  const updatePositions = useUpdateDeploymentPositions();

  // Use local state during drag, otherwise server data
  const deployments = localDeployments ?? serverDeployments;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getDeploymentsByStatus = (status: StatusType): TechDeployment[] => {
    return deployments
      .filter(d => d.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const findContainer = (id: UniqueIdentifier): StatusType | null => {
    // Check if it's a column
    if (typeof id === 'string' && id.startsWith('column-')) {
      return id.replace('column-', '') as StatusType;
    }
    
    // Find which column contains this deployment
    const deployment = deployments.find(d => d.id === id);
    return deployment?.status as StatusType || null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deployment = active.data.current?.deployment as TechDeployment;
    if (deployment) {
      setActiveDeployment(deployment);
      setDragOriginalStatus(deployment.status as StatusType);
      setLocalDeployments([...serverDeployments]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localDeployments) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    let overContainer = findContainer(overId);

    // If over a column directly
    if (typeof overId === 'string' && overId.startsWith('column-')) {
      overContainer = overId.replace('column-', '') as StatusType;
    }

    if (!activeContainer || !overContainer) return;

    // If moving between different columns
    if (activeContainer !== overContainer) {
      setLocalDeployments(prev => {
        if (!prev) return prev;
        
        return prev.map(d => {
          if (d.id === activeId) {
            return { ...d, status: overContainer as TechDeployment['status'] };
          }
          return d;
        });
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeployment(null);

    if (!over || !localDeployments || !dragOriginalStatus) {
      setLocalDeployments(null);
      setDragOriginalStatus(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Use the saved original status, not the (already mutated) current status
    const activeContainer = dragOriginalStatus;
    let overContainer = findContainer(overId);

    // If over a column directly
    if (overId.startsWith('column-')) {
      overContainer = overId.replace('column-', '') as StatusType;
    }

    if (!overContainer) {
      setLocalDeployments(null);
      setDragOriginalStatus(null);
      return;
    }

    const activeDeploymentData = serverDeployments.find(d => d.id === activeId);
    if (!activeDeploymentData) {
      setLocalDeployments(null);
      setDragOriginalStatus(null);
      return;
    }

    if (activeContainer === overContainer) {
      // Same column reorder
      const columnDeployments = serverDeployments
        .filter(d => d.status === overContainer)
        .sort((a, b) => a.position - b.position);

      let newIndex = columnDeployments.length;
      if (!overId.startsWith('column-')) {
        const overIndex = columnDeployments.findIndex(d => d.id === overId);
        if (overIndex !== -1) newIndex = overIndex;
      }

      const oldIndex = columnDeployments.findIndex(d => d.id === activeId);
      if (oldIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnDeployments, oldIndex, newIndex);
        const updates = reordered.map((d, idx) => ({ id: d.id, position: idx }));
        
        try {
          await updatePositions.mutateAsync(updates);
        } catch (error) {
          toast.error('Erro ao reordenar');
          console.error(error);
        }
      }
    } else {
      // Cross-column move
      const targetColumnDeployments = serverDeployments
        .filter(d => d.status === overContainer && d.id !== activeId)
        .sort((a, b) => a.position - b.position);

      let newIndex = targetColumnDeployments.length;
      if (!overId.startsWith('column-')) {
        const overIndex = targetColumnDeployments.findIndex(d => d.id === overId);
        if (overIndex !== -1) newIndex = overIndex;
      }

      targetColumnDeployments.splice(newIndex, 0, { ...activeDeploymentData, status: overContainer as TechDeployment['status'] });
      
      const updates = targetColumnDeployments.map((d, idx) => ({ 
        id: d.id, 
        position: idx,
        ...(d.id === activeId ? { status: overContainer } : {})
      }));
      
      try {
        await updatePositions.mutateAsync(updates);
        toast.success(`Implantação movida para ${STATUS_CONFIG[overContainer].label}`);
      } catch (error) {
        toast.error('Erro ao mover implantação');
        console.error(error);
      }
    }

    setLocalDeployments(null);
    setDragOriginalStatus(null);
  };

  const handleDragCancel = () => {
    setActiveDeployment(null);
    setLocalDeployments(null);
    setDragOriginalStatus(null);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      client_name: '',
      assignee: '',
      due_date: '',
    });
    setEditingDeployment(null);
  };

  const handleOpenDialog = (status: TechDeployment['status'] = 'todo') => {
    resetForm();
    setForm(prev => ({ ...prev, status }));
    setIsDialogOpen(true);
  };

  const handleEditDeployment = (deployment: TechDeployment) => {
    setEditingDeployment(deployment);
    setForm({
      title: deployment.title,
      description: deployment.description || '',
      priority: deployment.priority,
      status: deployment.status,
      client_name: deployment.client_name || '',
      assignee: deployment.assignee || '',
      due_date: deployment.due_date ? deployment.due_date.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const handleSaveDeployment = async () => {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      if (editingDeployment) {
        await updateDeployment.mutateAsync({
          id: editingDeployment.id,
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          status: form.status,
          client_name: form.client_name || null,
          assignee: form.assignee || null,
          due_date: form.due_date || null,
        });
        toast.success('Implantação atualizada com sucesso!');
      } else {
        await createDeployment.mutateAsync({
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          status: form.status,
          client_name: form.client_name || null,
          assignee: form.assignee || null,
          due_date: form.due_date || null,
        });
        toast.success('Implantação criada com sucesso!');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(editingDeployment ? 'Erro ao atualizar implantação' : 'Erro ao criar implantação');
      console.error(error);
    }
  };

  const handleDeleteDeployment = async (id: string) => {
    try {
      await deleteDeployment.mutateAsync(id);
      toast.success('Implantação excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir implantação');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-12">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <PackageCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Implantações</h2>
          <p className="text-muted-foreground text-sm">Acompanhamento de implantações de clientes</p>
        </div>
        <Button 
          className="ml-auto gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          onClick={() => handleOpenDialog('todo')}
        >
          <Plus className="h-4 w-4" />
          Nova Implantação
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          <DroppableStatusColumn status="todo" deployments={getDeploymentsByStatus('todo')} onAddDeployment={handleOpenDialog} onDeleteDeployment={handleDeleteDeployment} onEditDeployment={handleEditDeployment} />
          <DroppableStatusColumn status="in_progress" deployments={getDeploymentsByStatus('in_progress')} onAddDeployment={handleOpenDialog} onDeleteDeployment={handleDeleteDeployment} onEditDeployment={handleEditDeployment} />
          <DroppableStatusColumn status="requested" deployments={getDeploymentsByStatus('requested')} onAddDeployment={handleOpenDialog} onDeleteDeployment={handleDeleteDeployment} onEditDeployment={handleEditDeployment} />
          <DroppableStatusColumn status="support" deployments={getDeploymentsByStatus('support')} onAddDeployment={handleOpenDialog} onDeleteDeployment={handleDeleteDeployment} onEditDeployment={handleEditDeployment} />
          <DroppableStatusColumn status="done" deployments={getDeploymentsByStatus('done')} onAddDeployment={handleOpenDialog} onDeleteDeployment={handleDeleteDeployment} onEditDeployment={handleEditDeployment} />
        </div>
        <DragOverlay>
          {activeDeployment ? <DeploymentCardOverlay deployment={activeDeployment} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDeployment ? (
                <>
                  <PackageCheck className="h-5 w-5 text-primary" />
                  Editar Implantação
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Implantação
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Implantação Cliente X"
              />
            </div>
            
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva a implantação..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Input
                  value={form.client_name}
                  onChange={e => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(prev => ({ ...prev, priority: v as TechDeployment['priority'] }))}
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
                  value={form.status}
                  onValueChange={v => setForm(prev => ({ ...prev, status: v as TechDeployment['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="requested">Solicitado</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Responsável</Label>
                <Input
                  value={form.assignee}
                  onChange={e => setForm(prev => ({ ...prev, assignee: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div>
              <Label>Data de Entrega</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveDeployment}
                disabled={createDeployment.isPending || updateDeployment.isPending}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                {(createDeployment.isPending || updateDeployment.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingDeployment ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
