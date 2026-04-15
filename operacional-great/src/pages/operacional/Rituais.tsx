import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format, addHours, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Calendar,
  Video,
  Users,
  Clock,
  FileText,
  CheckSquare,
  CheckCircle,
  ChevronRight,
  User,
  Building2,
  Globe,
  ListTodo,
  X,
  Target,
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  datetime_start: string;
  datetime_end: string;
  agenda: string | null;
  notes: string | null;
  participants: any;
  scope: string;
  team_id: string | null;
  created_by_user_id: string;
  recording_link: string | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  assignee_user_id: string | null;
  due_date: string | null;
  workitem_id: string | null;
  status: string;
  created_at: string;
  assignee?: {
    id: string;
    full_name: string;
  } | null;
  meeting?: {
    title: string;
  } | null;
}

const scopeLabels: Record<string, string> = {
  'GERAL': 'Geral',
  'EQUIPE': 'Equipe',
  'CLIENTE': 'Cliente',
};

const scopeIcons: Record<string, React.ElementType> = {
  'GERAL': Globe,
  'EQUIPE': Users,
  'CLIENTE': Building2,
};

const scopeColors: Record<string, string> = {
  'GERAL': 'bg-primary/10 text-primary border-primary/20',
  'EQUIPE': 'bg-warning/10 text-warning border-warning/20',
  'CLIENTE': 'bg-info/10 text-info border-info/20',
};

const actionStatusColors: Record<string, string> = {
  'ABERTO': 'bg-muted text-muted-foreground',
  'EM_ANDAMENTO': 'bg-warning/10 text-warning',
  'CONCLUIDO': 'bg-success/10 text-success',
};

// Template de rituais padrão
const ritualTemplates = [
  {
    id: 'daily-standup',
    name: 'Daily Standup (Equipe)',
    scope: 'EQUIPE',
    duration: 15,
    agenda: '• Prioridades do dia\n• Bloqueios\n• Clientes em risco',
  },
  {
    id: 'weekly-review',
    name: 'Weekly Ops Review (Geral)',
    scope: 'GERAL',
    duration: 45,
    agenda: '• Métricas da semana\n• SLA e gargalos\n• Decisões',
  },
  {
    id: 'client-review',
    name: 'Revisão de Cliente',
    scope: 'CLIENTE',
    duration: 30,
    agenda: '• Resumo Tráfego\n• Resumo Atendimento\n• Entregas e próximos passos',
  },
];

function toIsoFromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : '';
}

export default function Rituais() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('calendario');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof ritualTemplates[0] | null>(null);
  
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    scope: 'GERAL',
    datetime_start: '',
    datetime_end: '',
    agenda: '',
  });

  const [newAction, setNewAction] = useState({
    title: '',
    assignee_user_id: '',
    due_date: '',
  });

  // Fetch meetings
  const { data: meetings, isLoading } = useQuery({
    queryKey: ['meetings-rituais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('datetime_start', { ascending: true });

      if (error) throw error;
      return data as Meeting[];
    },
  });

  // Fetch action items
  const { data: actionItems } = useQuery({
    queryKey: ['action-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_action_items')
        .select(`
          *,
          assignee:profiles!meeting_action_items_assignee_user_id_fkey(id, full_name),
          meeting:meetings!meeting_action_items_meeting_id_fkey(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ActionItem[];
    },
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-rituais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: typeof newMeeting) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: meetingData.title,
          scope: meetingData.scope,
          datetime_start: toIsoFromLocalInput(meetingData.datetime_start),
          datetime_end: meetingData.datetime_end
            ? toIsoFromLocalInput(meetingData.datetime_end)
            : addHours(new Date(meetingData.datetime_start), 1).toISOString(),
          agenda: meetingData.agenda || null,
          created_by_user_id: user.id,
          participants: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-rituais'] });
      toast({
        title: 'Reunião criada',
        description: 'A reunião foi agendada com sucesso.',
      });
      setIsCreateOpen(false);
      setNewMeeting({
        title: '',
        scope: 'GERAL',
        datetime_start: '',
        datetime_end: '',
        agenda: '',
      });
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar reunião',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create action item mutation
  const createActionMutation = useMutation({
    mutationFn: async (actionData: typeof newAction & { meeting_id: string }) => {
      const { data, error } = await supabase
        .from('meeting_action_items')
        .insert({
          meeting_id: actionData.meeting_id,
          title: actionData.title,
          assignee_user_id: actionData.assignee_user_id || null,
          due_date: actionData.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['work-items-execucao'] });
      toast({
        title: 'Ação criada',
        description: 'A ação foi criada e uma tarefa foi gerada automaticamente.',
      });
      setIsAddActionOpen(false);
      setNewAction({ title: '', assignee_user_id: '', due_date: '' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update action status mutation
  const updateActionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('meeting_action_items')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
    },
  });

  const handleSelectTemplate = (template: typeof ritualTemplates[0]) => {
    setSelectedTemplate(template);
    setNewMeeting({
      ...newMeeting,
      title: template.name,
      scope: template.scope,
      agenda: template.agenda,
    });
  };

  const handleCreateMeeting = () => {
    if (!newMeeting.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, insira um título para a reunião.',
        variant: 'destructive',
      });
      return;
    }
    if (!newMeeting.datetime_start) {
      toast({
        title: 'Data obrigatória',
        description: 'Por favor, selecione uma data e hora.',
        variant: 'destructive',
      });
      return;
    }
    createMeetingMutation.mutate(newMeeting);
  };

  const handleCreateAction = () => {
    if (!newAction.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, insira um título para a ação.',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedMeeting) return;
    
    createActionMutation.mutate({
      ...newAction,
      meeting_id: selectedMeeting.id,
    });
  };

  const handleOpenMeetingActions = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsAddActionOpen(true);
  };

  const upcomingMeetings = meetings?.filter(m => !isPast(parseISO(m.datetime_start))) || [];
  const pastMeetings = meetings?.filter(m => isPast(parseISO(m.datetime_start))) || [];
  const todayMeetings = meetings?.filter(m => isToday(parseISO(m.datetime_start))) || [];
  
  const openActions = actionItems?.filter(a => a.status !== 'CONCLUIDO') || [];
  const meetingActions = selectedMeeting 
    ? actionItems?.filter(a => a.meeting_id === selectedMeeting.id) || []
    : [];

  const getMeetingDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rituais & Reuniões</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie reuniões, decisões e ações
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nova Reunião</DialogTitle>
            </DialogHeader>
            
            {/* Templates */}
            <div className="py-4">
              <Label className="mb-3 block">Templates de Rituais</Label>
              <div className="grid grid-cols-3 gap-3">
                {ritualTemplates.map((template) => {
                  const ScopeIcon = scopeIcons[template.scope];
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <ScopeIcon className="h-4 w-4 text-muted-foreground" />
                          <Badge className={scopeColors[template.scope]} variant="outline">
                            {scopeLabels[template.scope]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.duration} min</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  placeholder="Nome da reunião"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Escopo</Label>
                  <Select
                    value={newMeeting.scope}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, scope: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GERAL">🌐 Geral</SelectItem>
                      <SelectItem value="EQUIPE">👥 Equipe</SelectItem>
                      <SelectItem value="CLIENTE">🏢 Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datetime">Data e Hora *</Label>
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={newMeeting.datetime_start}
                    onChange={(e) => setNewMeeting({ ...newMeeting, datetime_start: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda">Pauta</Label>
                <Textarea
                  id="agenda"
                  value={newMeeting.agenda}
                  onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                  placeholder="Tópicos da reunião..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateMeeting} disabled={createMeetingMutation.isPending}>
                {createMeetingMutation.isPending ? 'Criando...' : 'Criar Reunião'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Próximas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pastMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openActions.length}</p>
                <p className="text-sm text-muted-foreground">Ações Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ritualTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendario">
            <Calendar className="h-4 w-4 mr-2" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="acoes">
            <ListTodo className="h-4 w-4 mr-2" />
            Action Items
            {openActions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {openActions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Calendário Tab */}
        <TabsContent value="calendario" className="mt-6">
          <div className="space-y-6">
            {/* Upcoming Meetings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Próximas Reuniões</h3>
              {upcomingMeetings.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma reunião agendada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => {
                    const ScopeIcon = scopeIcons[meeting.scope] || Globe;
                    const meetingActionCount = actionItems?.filter(a => a.meeting_id === meeting.id).length || 0;
                    return (
                      <Card key={meeting.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted flex flex-col items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(meeting.datetime_start), 'MMM', { locale: ptBR }).toUpperCase()}
                              </span>
                              <span className="text-lg font-bold">
                                {format(parseISO(meeting.datetime_start), 'dd')}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{meeting.title}</h4>
                                <Badge className={scopeColors[meeting.scope]} variant="outline">
                                  <ScopeIcon className="h-3 w-3 mr-1" />
                                  {scopeLabels[meeting.scope]}
                                </Badge>
                                {meetingActionCount > 0 && (
                                  <Badge variant="secondary">
                                    <ListTodo className="h-3 w-3 mr-1" />
                                    {meetingActionCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(meeting.datetime_start), 'HH:mm')} - {format(parseISO(meeting.datetime_end), 'HH:mm')}
                                </span>
                                <span>{getMeetingDateLabel(meeting.datetime_start)}</span>
                              </div>
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenMeetingActions(meeting)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ação
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Reuniões Anteriores</h3>
                <div className="space-y-3">
                  {pastMeetings.slice(0, 5).map((meeting) => {
                    const ScopeIcon = scopeIcons[meeting.scope] || Globe;
                    const meetingActionCount = actionItems?.filter(a => a.meeting_id === meeting.id).length || 0;
                    return (
                      <Card key={meeting.id} className="opacity-75 hover:opacity-100 transition-opacity">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted/50 flex flex-col items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(meeting.datetime_start), 'MMM', { locale: ptBR }).toUpperCase()}
                              </span>
                              <span className="text-lg font-bold text-muted-foreground">
                                {format(parseISO(meeting.datetime_start), 'dd')}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-muted-foreground">{meeting.title}</h4>
                                <Badge variant="outline" className="opacity-75">
                                  <ScopeIcon className="h-3 w-3 mr-1" />
                                  {scopeLabels[meeting.scope]}
                                </Badge>
                                {meetingActionCount > 0 && (
                                  <Badge variant="secondary">
                                    <ListTodo className="h-3 w-3 mr-1" />
                                    {meetingActionCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(meeting.datetime_start), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>

                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenMeetingActions(meeting)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ação
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="acoes" className="mt-6">
          <div className="space-y-6">
            {/* Open Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ações Abertas</h3>
              {openActions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma ação pendente</p>
                    <p className="text-sm mt-2">As ações criadas nas reuniões aparecerão aqui</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {openActions.map((action) => (
                    <Card key={action.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-warning" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{action.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              {action.meeting && (
                                <span className="flex items-center gap-1">
                                  <Video className="h-3 w-3" />
                                  {action.meeting.title}
                                </span>
                              )}
                              {action.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {action.assignee.full_name}
                                </span>
                              )}
                              {action.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(action.due_date), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                          </div>

                          <Badge className={actionStatusColors[action.status]}>
                            {action.status === 'ABERTO' ? 'Aberto' : 
                             action.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Concluído'}
                          </Badge>

                          <Select
                            value={action.status}
                            onValueChange={(value) => updateActionStatusMutation.mutate({ id: action.id, status: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ABERTO">Aberto</SelectItem>
                              <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* All Actions */}
            {actionItems && actionItems.length > openActions.length && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Ações Concluídas</h3>
                <div className="space-y-3">
                  {actionItems
                    .filter(a => a.status === 'CONCLUIDO')
                    .slice(0, 5)
                    .map((action) => (
                      <Card key={action.id} className="opacity-60">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-success" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium line-through">{action.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {action.meeting && (
                                  <span>{action.meeting.title}</span>
                                )}
                                {action.assignee && (
                                  <span>{action.assignee.full_name}</span>
                                )}
                              </div>
                            </div>

                            <Badge className={actionStatusColors['CONCLUIDO']}>
                              Concluído
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-3 gap-4">
            {ritualTemplates.map((template) => {
              const ScopeIcon = scopeIcons[template.scope];
              return (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className={scopeColors[template.scope]} variant="outline">
                        <ScopeIcon className="h-3 w-3 mr-1" />
                        {scopeLabels[template.scope]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{template.duration} min</span>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {template.agenda}
                    </div>
                    <Button className="w-full mt-4" variant="outline" onClick={() => {
                      handleSelectTemplate(template);
                      setIsCreateOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Usar Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Action Item Dialog */}
      <Dialog open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Adicionar Ação - {selectedMeeting?.title}
            </DialogTitle>
          </DialogHeader>
          
          {/* Existing Actions for this meeting */}
          {meetingActions.length > 0 && (
            <div className="py-4 border-b">
              <Label className="mb-3 block text-sm">Ações desta reunião</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {meetingActions.map((action) => (
                  <div key={action.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{action.title}</span>
                    <Badge className={actionStatusColors[action.status]} variant="outline">
                      {action.status === 'ABERTO' ? 'Aberto' : 
                       action.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Concluído'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-title">Ação *</Label>
              <Input
                id="action-title"
                value={newAction.title}
                onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                placeholder="Descreva a ação a ser executada"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={newAction.assignee_user_id}
                  onValueChange={(value) => setNewAction({ ...newAction, assignee_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-due">Prazo</Label>
                <Input
                  id="action-due"
                  type="date"
                  value={newAction.due_date}
                  onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-info/10 border border-info/20">
              <p className="text-sm text-info flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Uma tarefa será criada automaticamente no Execução
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateAction} disabled={createActionMutation.isPending}>
              {createActionMutation.isPending ? 'Criando...' : 'Criar Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
