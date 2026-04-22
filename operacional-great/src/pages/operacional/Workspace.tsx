import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Layers, 
  List,
  LayoutGrid,
  Calendar,
  Search,
  GripVertical,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWorkItems } from '@/hooks/useOperationalData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<string, string> = {
  'BACKLOG': 'Backlog',
  'TODO': 'A Fazer',
  'EM_ANDAMENTO': 'Em Progresso',
  'BLOQUEADO': 'Bloqueado',
  'CONCLUIDO': 'Concluído',
};

const statusColors: Record<string, string> = {
  'BACKLOG': 'bg-muted border-border',
  'TODO': 'bg-info/10 border-info/30',
  'EM_ANDAMENTO': 'bg-purple-500/10 border-purple-500/30 dark:bg-purple-500/20',
  'BLOQUEADO': 'bg-destructive/10 border-destructive/30',
  'CONCLUIDO': 'bg-success/10 border-success/30',
};

const priorityColors: Record<string, string> = {
  'BAIXA': 'bg-muted text-muted-foreground',
  'MEDIA': 'bg-warning/10 text-warning',
  'ALTA': 'bg-orange-500/10 text-orange-500',
  'URGENTE': 'bg-destructive/10 text-destructive',
};

const priorityIcons: Record<string, string> = {
  'BAIXA': '🔵',
  'MEDIA': '🟡',
  'ALTA': '🟠',
  'URGENTE': '🔴',
};

export default function Workspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIA',
    status: 'BACKLOG',
    assignee_user_id: '',
  });

  // Fetch work items from database
  const { data: items = [], isLoading } = useWorkItems();

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('work_items')
        .insert({
          title: taskData.title,
          description: taskData.description || null,
          priority: taskData.priority,
          status: taskData.status,
          assignee_user_id: taskData.assignee_user_id || null,
          reporter_user_id: user.id,
          type: 'TASK',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      setNewTask({ title: '', description: '', priority: 'MEDIA', status: 'BACKLOG', assignee_user_id: '' });
      setIsCreateDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa: ' + (error.message || 'Erro desconhecido'));
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('work_items')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status');
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    updateStatusMutation.mutate({ id: itemId, status: newStatus });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemsByStatus = (status: string) =>
    filteredItems.filter(item => item.status === status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-background -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workspace</h1>
            <p className="text-muted-foreground">Gerencie suas tarefas e projetos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 border-border bg-card"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Título</label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Digite o título da tarefa"
                    className="mt-1 border-border bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Descrição</label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Descreva a tarefa..."
                    className="mt-1 border-border bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Prioridade</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                    >
                      <SelectTrigger className="mt-1 border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="BAIXA">🔵 Baixa</SelectItem>
                        <SelectItem value="MEDIA">🟡 Média</SelectItem>
                        <SelectItem value="ALTA">🟠 Alta</SelectItem>
                        <SelectItem value="URGENTE">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <Select
                      value={newTask.status}
                      onValueChange={(v) => setNewTask({ ...newTask, status: v })}
                    >
                      <SelectTrigger className="mt-1 border-border bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="BACKLOG">Backlog</SelectItem>
                        <SelectItem value="TODO">A Fazer</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Progresso</SelectItem>
                        <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Atribuir a</label>
                  <Select
                    value={newTask.assignee_user_id}
                    onValueChange={(v) =>
                      setNewTask({
                        ...newTask,
                        assignee_user_id: v === "__none__" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 border-border bg-background">
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateTask} 
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Tarefa'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('kanban')}
          className={view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-border'}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Kanban
        </Button>
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('list')}
          className={view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-border'}
        >
          <List className="h-4 w-4 mr-2" />
          Lista
        </Button>
        <Button
          variant={view === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('calendar')}
          className={view === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-border'}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendário
        </Button>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(['BACKLOG', 'TODO', 'EM_ANDAMENTO', 'BLOQUEADO', 'CONCLUIDO'] as const).map((status) => (
            <div
              key={status}
              className={cn('rounded-xl border-2 p-4 min-h-[400px]', statusColors[status])}
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={handleDragOver}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{statusLabels[status]}</h3>
                <Badge variant="secondary" className="bg-card">
                  {getItemsByStatus(status).length}
                </Badge>
              </div>
              <div className="space-y-3">
                {getItemsByStatus(status).map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="bg-card rounded-lg p-3 shadow-sm border border-border cursor-grab hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs">{priorityIcons[item.priority] || '🟡'}</span>
                          {item.assignee && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {item.assignee.full_name}
                            </div>
                          )}
                          {item.due_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(item.due_date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Título</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Responsável</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-4">
                      <span className="font-medium text-foreground">{item.title}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={cn('text-xs', statusColors[item.status])}>
                        {statusLabels[item.status] || item.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={priorityColors[item.priority] || priorityColors['MEDIA']}>
                        {priorityIcons[item.priority] || '🟡'} {item.priority}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.assignee?.full_name || '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Calendar View - Placeholder */}
      {view === 'calendar' && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground">Visualização de Calendário</h3>
            <p>Em breve disponível</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
