import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Sun, 
  Clock, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Trash2,
  Target,
  Pencil,
  Loader2,
  RefreshCw,
  StickyNote,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyDayItem {
  id: string;
  title: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  source: 'MANUAL' | 'PERMANENT';
  source_id?: string;
}

type TaskSource = 'MANUAL' | 'PERMANENT';

const priorityColors: Record<string, string> = {
  'BAIXA': 'bg-surface-2 text-muted-foreground border-border',
  'MEDIA': 'bg-info/10 text-info border-info/20',
  'ALTA': 'bg-warning/10 text-warning border-warning/20',
  'URGENTE': 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusIcons = {
  'PENDENTE': Circle,
  'EM_ANDAMENTO': Clock,
  'CONCLUIDO': CheckCircle2,
};

export default function CEOMeuDia() {
  const { user } = useAuth();
  const [items, setItems] = useState<MyDayItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [newItemSource, setNewItemSource] = useState<TaskSource>('MANUAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesLastSaved, setNotesLastSaved] = useState<Date | null>(null);
  
  // Edit dialog state
  const [editingItem, setEditingItem] = useState<MyDayItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [editStatus, setEditStatus] = useState<'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('PENDENTE');

  // Fetch items and notes from database
  const fetchData = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('my_day_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      setItems((tasksData || []).map(item => ({
        id: item.id,
        title: item.title,
        status: item.status as MyDayItem['status'],
        priority: item.priority as MyDayItem['priority'],
        source: item.source as MyDayItem['source'],
        source_id: item.source_id || undefined,
      })));

      // Fetch notes from localStorage (CEO notes are personal/local)
      const savedNotes = localStorage.getItem(`ceo_notes_${user.id}_${today}`);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Auto-save notes
  useEffect(() => {
    if (!user || !notes) return;
    
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`ceo_notes_${user.id}_${today}`, notes);
      setNotesLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, user]);

  const handleSaveNotes = () => {
    if (!user) return;
    
    setIsSavingNotes(true);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`ceo_notes_${user.id}_${today}`, notes);
    setNotesLastSaved(new Date());
    setIsSavingNotes(false);
    toast.success('Anotações salvas!');
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('my_day_items')
        .insert({
          title: newItemTitle.trim(),
          user_id: user.id,
          date: today,
          status: 'PENDENTE',
          priority: newItemPriority,
          source: newItemSource,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, {
        id: data.id,
        title: data.title,
        status: data.status as MyDayItem['status'],
        priority: data.priority as MyDayItem['priority'],
        source: data.source as MyDayItem['source'],
      }]);
      setNewItemTitle('');
      setNewItemPriority('MEDIA');
      setNewItemSource('MANUAL');
      setIsAddDialogOpen(false);
      toast.success(newItemSource === 'PERMANENT' ? 'Tarefa fixa adicionada!' : 'Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('my_day_items')
        .insert({
          title: newItemTitle.trim(),
          user_id: user.id,
          date: today,
          status: 'PENDENTE',
          priority: 'MEDIA',
          source: 'MANUAL',
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, {
        id: data.id,
        title: data.title,
        status: data.status as MyDayItem['status'],
        priority: data.priority as MyDayItem['priority'],
        source: data.source as MyDayItem['source'],
      }]);
      setNewItemTitle('');
      toast.success('Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const nextStatus = item.status === 'PENDENTE' 
      ? 'EM_ANDAMENTO' 
      : item.status === 'EM_ANDAMENTO' 
        ? 'CONCLUIDO' 
        : 'PENDENTE';

    setItems(items.map(i => 
      i.id === id ? { ...i, status: nextStatus } : i
    ));

    try {
      const { error } = await supabase
        .from('my_day_items')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
      setItems(items.map(i => 
        i.id === id ? { ...i, status: item.status } : i
      ));
    }
  };

  const handleRemoveItem = async (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    setItems(items.filter(item => item.id !== id));

    try {
      const { error } = await supabase
        .from('my_day_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item removido!');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Erro ao remover item');
      if (itemToRemove) {
        setItems(prev => [...prev, itemToRemove]);
      }
    }
  };

  const handleEditItem = (item: MyDayItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPriority(item.priority);
    setEditStatus(item.status);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('my_day_items')
        .update({
          title: editTitle.trim(),
          priority: editPriority,
          status: editStatus,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...item, title: editTitle.trim(), priority: editPriority, status: editStatus }
          : item
      ));
      setEditingItem(null);
      toast.success('Item atualizado!');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingItems = items.filter(i => i.status === 'PENDENTE');
  const inProgressItems = items.filter(i => i.status === 'EM_ANDAMENTO');
  const completedItems = items.filter(i => i.status === 'CONCLUIDO');

  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Sun className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-h1 text-foreground">Meu Dia - CEO</h1>
              <p className="text-body text-muted-foreground capitalize">{today}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{completedItems.length}/{items.length} concluídas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add */}
          <div className="rounded-lg border border-border bg-card shadow-card p-4">
            <div className="flex gap-3">
              <Input
                placeholder="Adicionar item rápido..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                className="flex-1 bg-surface-2 border-border text-foreground placeholder:text-muted-foreground"
                disabled={isSaving}
              />
              <Button onClick={handleQuickAdd} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} disabled={isSaving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tarefa Fixa
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-kpi-sm text-foreground">{pendingItems.length}</p>
                <p className="text-caption text-muted-foreground">Pendentes</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-kpi-sm text-foreground">{inProgressItems.length}</p>
                <p className="text-caption text-muted-foreground">Em andamento</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-kpi-sm text-foreground">{completedItems.length}</p>
                <p className="text-caption text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="rounded-lg border border-border bg-card shadow-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Tarefas do Dia</h2>
            </div>
            <div className="divide-y divide-border">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Sun className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhuma tarefa para hoje.</p>
                  <p className="text-sm">Adicione sua primeira tarefa acima!</p>
                </div>
              ) : (
                items.map((item) => {
                  const StatusIcon = statusIcons[item.status];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 flex items-center gap-4 group transition-colors',
                        item.status === 'CONCLUIDO' && 'bg-success/5'
                      )}
                    >
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={cn(
                          'p-1.5 rounded-full transition-colors',
                          item.status === 'PENDENTE' && 'text-muted-foreground hover:text-foreground',
                          item.status === 'EM_ANDAMENTO' && 'text-warning',
                          item.status === 'CONCLUIDO' && 'text-success'
                        )}
                      >
                        <StatusIcon className="h-5 w-5" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium',
                          item.status === 'CONCLUIDO' && 'line-through text-muted-foreground'
                        )}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn('text-xs', priorityColors[item.priority])}>
                            {item.priority}
                          </Badge>
                          {item.source === 'PERMANENT' && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Fixa
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Notes Column */}
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StickyNote className="h-5 w-5 text-yellow-500" />
                  Anotações Gerais
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {notesLastSaved && (
                <p className="text-xs text-muted-foreground">
                  Salvo às {notesLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Escreva suas anotações do dia aqui... ideias, insights, lembretes importantes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[400px] bg-surface-2 border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa ao seu dia. Tarefas fixas aparecem automaticamente todos os dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Digite o título da tarefa"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={newItemPriority} onValueChange={(v) => setNewItemPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Tipo</Label>
                <Select value={newItemSource} onValueChange={(v) => setNewItemSource(v as TaskSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Única</SelectItem>
                    <SelectItem value="PERMANENT">Fixa (Diária)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Prioridade</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
