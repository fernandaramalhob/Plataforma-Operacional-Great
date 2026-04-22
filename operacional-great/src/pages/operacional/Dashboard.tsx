import { KPICard } from '@/components/dashboard/KPICard';
import { TeamCard } from '@/components/operacional/TeamCard';
import { WidgetCard } from '@/components/operacional/WidgetCard';
import { ClientOnboardingFlow, OnboardingProgress, OnboardingStage, ClientTierBadge } from '@/components/operacional/ClientOnboardingFlow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useOperational } from '@/contexts/OperationalContext';
import { EQUIPE_OPTIONS } from '@/contexts/CommercialContext';
import { useUpcomingTasks, useUpcomingMeetings, useBlockedTasks, useOverdueTasks } from '@/hooks/useOperationalData';
import { useOperationalClients } from '@/hooks/useCRMData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPreference } from '@/hooks/useUserPreference';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Users, 
  AlertTriangle,
  Calendar,
  Target,
  UserPlus,
  Clock,
  ClipboardList,
  Video,
  Loader2,
  LogOut,
  Rocket,
  ArrowRight,
  Filter,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation } from '@tanstack/react-query';

function toIsoFromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : '';
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getEquipeLabel(equipe: string, teams: { id: string; name: string }[]): string {
  // First check if it's a team_id (UUID)
  const teamById = teams.find(t => t.id === equipe);
  if (teamById) return teamById.name;
  
  // Fallback to old EQUIPE_OPTIONS for backward compatibility
  const found = EQUIPE_OPTIONS.find(e => e.value === equipe);
  return found?.label || equipe;
}

export default function OperacionalDashboard() {
  const { user, isAdmin } = useAuth();
  const { operationalClients, getClientsByStatus, getTeamStats } = useOperational();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [isConfirmClientDialogOpen, setIsConfirmClientDialogOpen] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [isOnboardingFlowOpen, setIsOnboardingFlowOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isCreateMeetingDialogOpen, setIsCreateMeetingDialogOpen] = useState(false);
  const [selectedClientForConfirm, setSelectedClientForConfirm] = useState<any>(null);
  const [selectedClientForOnboarding, setSelectedClientForOnboarding] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Editable commercial data for client confirmation
  const [confirmClientData, setConfirmClientData] = useState({
    pacote: '', // Package type (Completo, Tráfego e Criativos, etc.)
    periodo: '', // Billing period (Mensal, Trimestral, Semestral)
    pagadorAnuncio: '',
    equipe: '',
  });
  
  // New task form state
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIA',
    assignee_user_id: '',
  });
  
  // New meeting form state
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: '',
    datetime_start: '',
    datetime_end: '',
    agenda: '',
  });
  
  const today = new Date().toDateString();
  const { value: lastCheckIn, setValue: setLastCheckIn } = useUserPreference<string | null>(
    'great_last_checkin',
    null,
  );
  const { value: checkInTime, setValue: setCheckInTime } = useUserPreference<string | null>(
    'great_checkin_time',
    null,
  );
  const isCheckedIn = lastCheckIn === today;

  // Real data from database
  const { data: upcomingTasks, isLoading: tasksLoading } = useUpcomingTasks(5);
  const { data: upcomingMeetings, isLoading: meetingsLoading } = useUpcomingMeetings(3);
  const { data: blockedTasks, isLoading: blockedLoading } = useBlockedTasks();
  const { data: overdueTasks } = useOverdueTasks();

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
    mutationFn: async (taskData: typeof newTaskForm) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('work_items')
        .insert({
          title: taskData.title,
          description: taskData.description || null,
          priority: taskData.priority,
          status: 'TODO',
          assignee_user_id: taskData.assignee_user_id || null,
          reporter_user_id: user.id,
          type: 'TASK',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Se tem responsável, adicionar ao Meu Dia dessa pessoa
      if (taskData.assignee_user_id) {
        const today = new Date().toISOString().split('T')[0];
        const { error: myDayError } = await supabase
          .from('my_day_items')
          .insert({
            title: taskData.title,
            user_id: taskData.assignee_user_id,
            date: today,
            status: 'PENDENTE',
            priority: taskData.priority,
            source: 'WORK_ITEM',
            source_id: data.id,
          });
        
        if (myDayError) {
          console.error('Error adding to my_day_items:', myDayError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-day-items'] });
      setNewTaskForm({ title: '', description: '', priority: 'MEDIA', assignee_user_id: '' });
      setIsCreateTaskDialogOpen(false);
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa: ' + (error.message || 'Erro desconhecido'));
    },
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData: typeof newMeetingForm) => {
      if (!user) throw new Error('Usuário não autenticado');

      const datetimeStartIso = toIsoFromLocalInput(meetingData.datetime_start);
      const datetimeEndIso = meetingData.datetime_end
        ? toIsoFromLocalInput(meetingData.datetime_end)
        : new Date(new Date(meetingData.datetime_start).getTime() + 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: meetingData.title,
          datetime_start: datetimeStartIso,
          datetime_end: datetimeEndIso,
          agenda: meetingData.agenda || null,
          created_by_user_id: user.id,
          scope: 'GERAL',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
      setNewMeetingForm({ title: '', datetime_start: '', datetime_end: '', agenda: '' });
      setIsCreateMeetingDialogOpen(false);
      toast.success('Reunião agendada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating meeting:', error);
      toast.error('Erro ao agendar reunião: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const handleCreateTask = () => {
    if (!newTaskForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!newTaskForm.assignee_user_id) {
      toast.error('Selecione um responsável para a tarefa');
      return;
    }
    createTaskMutation.mutate(newTaskForm);
  };

  const handleCreateMeeting = () => {
    if (!newMeetingForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!newMeetingForm.datetime_start) {
      toast.error('Data/hora é obrigatória');
      return;
    }
    createMeetingMutation.mutate(newMeetingForm);
  };

  const handleCheckIn = async () => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await Promise.all([setLastCheckIn(today), setCheckInTime(time)]);
    setIsCheckInDialogOpen(false);
    toast.success('Check-in realizado com sucesso!', {
      description: `Você fez check-in às ${time}`,
    });
  };

  const handleCheckOut = () => {
    const checkOutTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setIsCheckOutDialogOpen(false);
    toast.success('Check-out realizado com sucesso!', {
      description: `Check-in: ${checkInTime} → Check-out: ${checkOutTime}`,
    });
  };

  const handleConfirmClient = async () => {
    if (!selectedClientForConfirm || !user) return;
    
    if (!confirmClientData.equipe) {
      toast.error('Selecione a equipe antes de confirmar o cliente');
      return;
    }
    
    setIsCreatingTask(true);
    try {
      // First, create the client in operational_clients table if it doesn't exist there
      // (clients from OperationalContext have IDs like "op-1", not UUIDs)
      let operationalClientId: string;
      
      // Check if this is a context-based client (not from database)
      if (selectedClientForConfirm.id.startsWith('op-')) {
        // Insert the client into the database with commercial data - directly as ATIVO
        const { data: newClient, error: insertError } = await supabase
          .from('operational_clients')
          .insert({
            client_name: selectedClientForConfirm.clientName,
            clinic_name: selectedClientForConfirm.clinicName || null,
            pacote: confirmClientData.pacote || selectedClientForConfirm.pacote || null,
            deal_value: selectedClientForConfirm.entrada || 0,
            status_operacional: 'ATIVO',
            onboarding_stage: 'ATIVO',
            activated_at: new Date().toISOString(),
            commercial_id: selectedClientForConfirm.commercialId || null,
            pagador_anuncio: confirmClientData.pagadorAnuncio || selectedClientForConfirm.pagadorAnuncio || null,
            team_id: confirmClientData.equipe || selectedClientForConfirm.equipe || selectedClientForConfirm.team_id || null,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        operationalClientId = newClient.id;
      } else {
        // Client already exists in database, update it with commercial data - directly as ATIVO
        operationalClientId = selectedClientForConfirm.id;
        
        const { error: updateError } = await supabase
          .from('operational_clients')
          .update({
            onboarding_stage: 'ATIVO',
            status_operacional: 'ATIVO',
            activated_at: new Date().toISOString(),
            pacote: confirmClientData.pacote || undefined,
            pagador_anuncio: confirmClientData.pagadorAnuncio || undefined,
            team_id: confirmClientData.equipe || undefined,
          })
          .eq('id', operationalClientId);
        
        if (updateError) throw updateError;
      }

      // Create a work item (card) for the client with a checklist of phases
      const checklistItems = [
        { id: '1', text: 'Onboarding - Reunião de chegada', checked: false },
        { id: '2', text: 'Briefing - Coletar informações do cliente', checked: false },
        { id: '3', text: 'Design/Artes - Criar identidade visual', checked: false },
        { id: '4', text: 'Tráfego - Configurar campanhas', checked: false },
        { id: '5', text: 'Atendimento - Configurar fluxo de atendimento', checked: false },
      ];

      const { error: workItemError } = await supabase
        .from('work_items')
        .insert({
          title: taskTitle || `Cliente: ${selectedClientForConfirm.clientName}`,
          description: taskDescription || `Checklist de ativação do cliente ${selectedClientForConfirm.clientName}`,
          type: 'TASK',
          status: 'TODO',
          priority: 'ALTA',
          reporter_user_id: user.id,
          related_client_id: operationalClientId,
        });

      if (workItemError) {
        console.error('Work item error:', workItemError);
      }

      // Also create an exec card with checklist in the CLIENTES board
      const CLIENTS_BOARD_ID = 'c66b6085-1e12-43fa-a91d-1a721a6f7d8b';
      const ATIVO_COLUMN_ID = 'a1b3915c-18a2-4d9f-9749-3d33559589f3';
      
      await supabase
        .from('exec_cards')
        .insert({
          board_id: CLIENTS_BOARD_ID,
          column_id: ATIVO_COLUMN_ID,
          title: selectedClientForConfirm.clientName,
          description: taskDescription || `Cliente ativo - ${selectedClientForConfirm.clientName}`,
          client_id: operationalClientId,
          priority: 'ALTA',
          order: 0,
          created_by_user_id: user.id,
          checklist: checklistItems,
        });

      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      
      toast.success('Cliente ativado com sucesso!', {
        description: `${selectedClientForConfirm.clientName} foi confirmado como ativo com checklist de fases.`,
      });
      
      setIsConfirmClientDialogOpen(false);
      setSelectedClientForConfirm(null);
      setTaskTitle('');
      setTaskDescription('');
      setConfirmClientData({ pacote: '', periodo: '', pagadorAnuncio: '', equipe: '' });
    } catch (error) {
      console.error('Error confirming client:', error);
      toast.error('Erro ao confirmar cliente');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openConfirmClientDialog = (client: any) => {
    setSelectedClientForConfirm(client);
    setTaskTitle(`Onboarding: ${client.clientName || client.client_name}`);
    
    // Initialize commercial data from commercial context
    // pacote = package type (Completo, Tráfego e Criativos, etc.)
    // periodo = billing period (MENSAL, TRIMESTRAL, SEMESTRAL)
    const pacoteValue = client.pacote || '';
    const periodoValue = client.periodo || client.plan || ''; // plan is the billing period
    const pagadorValue = client.pagadorAnuncio || client.pagador_anuncio || '';
    const equipeValue = client.equipe || client.team_id || '';
    
    setConfirmClientData({
      pacote: pacoteValue,
      periodo: periodoValue,
      pagadorAnuncio: pagadorValue,
      equipe: equipeValue,
    });
    
    // Build initial description with commercial info
    updateTaskDescription(pacoteValue, pagadorValue, equipeValue);
    setIsConfirmClientDialogOpen(true);
  };

  // Package type labels (what the client bought: Completo, Tráfego e Criativos, etc.)
  const PACOTE_LABELS: Record<string, string> = {
    COMPLETO: 'Completo',
    TRAFEGO_E_CRIATIVOS: 'Tráfego e Criativos',
    TRAFEGO_E_ARTES: 'Tráfego e Artes',
    ATENDIMENTO: 'Atendimento',
    TRAFEGO: 'Tráfego',
    CONSULTORIA_COMERCIAL: 'Consultoria Comercial',
  };
  
  // Period labels (billing frequency)
  const PLAN_LABELS: Record<string, string> = {
    MENSAL: 'Mensal',
    TRIMESTRAL: 'Trimestral',
    SEMESTRAL: 'Semestral',
  };
  
  const updateTaskDescription = (pacote: string, pagadorAnuncio: string, equipe?: string) => {
    const pacoteLabel = PACOTE_LABELS[pacote] || pacote || 'Não informado';
    const pagadorLabel = pagadorAnuncio === 'CLIENTE' 
      ? 'Cliente paga anúncio' 
      : pagadorAnuncio === 'GREAT' 
        ? 'Empresa paga anúncio' 
        : 'Não informado';
    const equipeLabel = equipe ? getEquipeLabel(equipe, teams) : 'Não informado';
    
    setTaskDescription(`Pacote: ${pacoteLabel}\n${pagadorLabel}\nEquipe: ${equipeLabel}`);
  };

  const openOnboardingFlow = (client: any) => {
    setSelectedClientForOnboarding({
      id: client.id,
      clientName: client.clientName || client.client_name,
      clinicName: client.clinicName || client.clinic_name,
      onboardingStage: (client.onboardingStage || client.onboarding_stage || 'CONTRATO') as OnboardingStage,
      clientTier: client.clientTier || client.client_tier || null,
    });
    setIsOnboardingFlowOpen(true);
  };

  // Get clients from database (operational_clients table)
  const { data: dbClients, isLoading: dbClientsLoading } = useOperationalClients();
  
  // Fetch teams for display
  const DEFAULT_TEAMS = [
    { id: 'equipe-7', name: 'Equipe 7' },
    { id: 'tropa-de-elite', name: 'Tropa de Elite' },
  ];

  const { data: dbTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const teams = dbTeams.length > 0 ? dbTeams : DEFAULT_TEAMS;
  
  // Filter by status from database
  const newClientsFromDB = (dbClients || []).filter(
    c => c.status_operacional === 'NOVO_CLIENTE' && 
         (selectedTeamFilter === 'all' || c.team_id === selectedTeamFilter)
  );
  const activeClientsFromDB = (dbClients || []).filter(
    c => c.status_operacional === 'ATIVO'
  );
  const clientsInActivation = (dbClients || []).filter(
    c => c.status_operacional === 'ONBOARDING' && 
         c.onboarding_stage !== 'CONCLUIDO' &&
         (selectedTeamFilter === 'all' || c.team_id === selectedTeamFilter)
  );
  
  // Filter lost and renewed clients
  const lostClients = (dbClients || []).filter(
    c => c.churn_status === 'CONFIRMED' &&
         (selectedTeamFilter === 'all' || c.churn_responsible_team_id === selectedTeamFilter || c.team_id === selectedTeamFilter)
  );
  const renewedClients = (dbClients || []).filter(
    c => c.renewal_status === 'RENEWED' &&
         (selectedTeamFilter === 'all' || c.renewal_responsible_team_id === selectedTeamFilter || c.team_id === selectedTeamFilter)
  );

  // Calculate team stats from database
  const getTeamStatsFromDB = (teamId: string | null | undefined) => {
    // Only count clients that have this specific team_id assigned
    // If teamId is null/undefined, return empty stats (don't count unassigned clients)
    if (!teamId) {
      return {
        total: 0,
        novos: 0,
        emOnboarding: 0,
        ativos: 0,
        churned: 0,
        renewals: 0,
      };
    }
    
    const teamClients = (dbClients || []).filter(c => c.team_id === teamId);
    const activeClients = teamClients.filter(c => 
      c.status_operacional !== 'ENCERRADO' && c.churn_status !== 'CONFIRMED'
    );
    
    return {
      total: activeClients.length,
      novos: activeClients.filter(c => c.status_operacional === 'NOVO_CLIENTE').length,
      emOnboarding: activeClients.filter(c => c.status_operacional === 'ONBOARDING').length,
      ativos: activeClients.filter(c => c.status_operacional === 'ATIVO').length,
      churned: teamClients.filter(c => c.churn_status === 'CONFIRMED').length,
      renewals: teamClients.filter(c => c.renewal_status === 'RENEWED').length,
    };
  };

  // Get team IDs from database - match by actual team names
  const tropaEliteTeam = teams.find(t => t.name.toLowerCase().includes('tropa') || t.name.toLowerCase().includes('elite'));
  const equipe7Team = teams.find(t => t.name.toLowerCase().includes('equipe 7') || t.name === 'Equipe 7');
  
  const tropaEliteStatsFromDB = getTeamStatsFromDB(tropaEliteTeam?.id || null);
  const equipe7StatsFromDB = getTeamStatsFromDB(equipe7Team?.id || null);

  // Team stats from context (for localStorage-based team assignment display)
  const liraStats = getTeamStats('LIRA');
  const kauanStats = getTeamStats('KAUAN');

  // Merge DB stats with context stats (prioritize DB if available)
  const mergedTropaEliteStats = tropaEliteTeam 
    ? { ...tropaEliteStatsFromDB, tarefasAtrasadas: overdueTasks?.filter(t => t.team_id === tropaEliteTeam.id).length || 0 }
    : { ...liraStats, tarefasAtrasadas: 0 };
  
  const mergedEquipe7Stats = equipe7Team 
    ? { ...equipe7StatsFromDB, tarefasAtrasadas: overdueTasks?.filter(t => t.team_id === equipe7Team.id).length || 0 }
    : { ...kauanStats, tarefasAtrasadas: 0 };

  // Calculate totals from database
  const totalNovos = newClientsFromDB.length;
  const totalAtivos = activeClientsFromDB.length;
  const totalOnboarding = clientsInActivation.length;
  const totalChurned = lostClients.length;
  const slaAtRisk = (overdueTasks?.length || 0) + (blockedTasks?.length || 0);
  
  // State for loss details dialog
  const [selectedLossClient, setSelectedLossClient] = useState<any>(null);
  const [isLossDetailsDialogOpen, setIsLossDetailsDialogOpen] = useState(false);
  
  const openLossDetailsDialog = (client: any) => {
    setSelectedLossClient(client);
    setIsLossDetailsDialogOpen(true);
  };

  const priorityClasses: Record<string, string> = {
    'BAIXA': 'bg-surface-2 text-muted-foreground border-border',
    'MEDIA': 'bg-info/10 text-info border-info/20',
    'ALTA': 'bg-warning/10 text-warning border-warning/20',
    'URGENTE': 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[2.9rem] font-black tracking-[-0.06em] text-foreground md:text-[3.4rem]">
            Operação Great
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Visão geral da execução operacional
          </p>
          <span className="mt-5 block h-1.5 w-14 rounded-full bg-primary" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            data-cy="btn-criar-tarefa"
            variant="outline"
            size="sm"
            className="h-14 rounded-[1.4rem] border-black/8 bg-white/86 px-6 text-sm font-semibold text-foreground shadow-[0_16px_40px_rgba(24,17,14,0.08)] hover:bg-white"
            onClick={() => setIsCreateTaskDialogOpen(true)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Criar tarefa
          </Button>
          {isCheckedIn ? (
            <Button 
              size="sm"
              variant="outline"
              className="h-14 rounded-[1.4rem] border-black/8 bg-white/86 px-6 text-sm font-semibold text-foreground shadow-[0_16px_40px_rgba(24,17,14,0.08)] hover:bg-white"
              onClick={() => setIsCheckOutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Fazer check-out
            </Button>
          ) : null}
          <Button
            data-cy="btn-checkin"
            size="sm"
            className={cn(
              'h-14 rounded-[1.4rem] px-6 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(225,6,0,0.28)]',
              isCheckedIn ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary-hover'
            )}
            onClick={() => isCheckedIn ? toast.info(`Você já fez check-in hoje às ${checkInTime}!`) : setIsCheckInDialogOpen(true)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isCheckedIn ? `Check-in ${checkInTime} ✓` : 'Fazer check-in'}
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          data-cy="card-clientes-ativos"
          data-value-cy="card-clientes-ativos-value"
          label="Clientes Ativos"
          value={totalAtivos}
          changeLabel={`${totalOnboarding} em onboarding agora`}
          icon={<CheckCircle className="h-8 w-8" />}
          iconColor="success"
        />
        <KPICard
          data-cy="card-novos-clientes"
          data-value-cy="card-novos-clientes-value"
          label="Novos Clientes"
          value={totalNovos}
          changeLabel={`${newClientsFromDB.length} aguardando confirmação`}
          icon={<UserPlus className="h-8 w-8" />}
          iconColor="primary"
        />
        <KPICard
          data-cy="card-churned"
          data-value-cy="card-churned-value"
          label="Churned"
          value={totalChurned}
          changeLabel={`${renewedClients.length} renovações concluídas`}
          icon={<TrendingDown className="h-8 w-8" />}
          iconColor="danger"
        />
        <KPICard
          data-cy="card-sla-risco"
          data-value-cy="card-sla-risco-value"
          label="SLA em risco"
          value={slaAtRisk}
          changeLabel={`${blockedTasks?.length || 0} bloqueadas • ${overdueTasks?.length || 0} atrasadas`}
          icon={<AlertTriangle className="h-8 w-8" />}
          iconColor="danger"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <TeamCard
          data-cy="equipe-tropa-elite"
          statPrefix="tropa"
          title="Tropa de Elite"
          subtitle="Time Lira"
          stats={mergedTropaEliteStats}
        />
        <TeamCard
          data-cy="equipe-7"
          statPrefix="equipe7"
          title="Equipe 7"
          subtitle="Time Kauan"
          stats={mergedEquipe7Stats}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-foreground shadow-sm">
              <Filter className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground md:text-base">Filtrar por equipe:</span>
          </div>
          <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
            <SelectTrigger className="h-12 w-full rounded-2xl border-black/8 bg-white/86 px-4 shadow-sm md:w-[240px]">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-black/8 bg-white/96">
              <SelectItem value="all">Todas as equipes</SelectItem>
              {tropaEliteTeam && (
                <SelectItem value={tropaEliteTeam.id}>Tropa de Elite</SelectItem>
              )}
              {equipe7Team && (
                <SelectItem value={equipe7Team.id}>Equipe 7</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <WidgetCard
          title="Novos Clientes"
          count={newClientsFromDB.length}
          action={{ label: 'Ver clientes', href: '/operacional/crm' }}
        >
          {dbClientsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground/50" />
              <p className="text-body text-muted-foreground">Carregando...</p>
            </div>
          ) : newClientsFromDB.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary/6 text-primary">
                <Users className="h-10 w-10" />
              </div>
              <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">Nenhum cliente novo ainda</p>
              <p className="mt-2 text-sm text-muted-foreground/80">
                Clientes fechados no comercial aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
              {newClientsFromDB.slice(0, 6).map((client) => (
                <div
                  key={client.id}
                  className="group flex flex-col gap-4 rounded-[1.5rem] border border-black/6 bg-white/72 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_36px_rgba(24,17,14,0.08)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/6 text-primary">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{client.client_name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <span>R$ {(client.deal_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        {client.plan && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{PLAN_LABELS[client.plan] || client.plan}</span>
                          </>
                        )}
                        {client.pacote && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="font-medium text-primary">
                              {PACOTE_LABELS[client.pacote] || client.pacote}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Inline team selector */}
                    <Select
                      value={client.team_id || '__none__'}
                      onValueChange={async (v) => {
                        const newTeamId = v === '__none__' ? null : v;
                        const { error } = await supabase
                          .from('operational_clients')
                          .update({ team_id: newTeamId })
                          .eq('id', client.id);
                        if (error) {
                          toast.error('Erro ao alterar equipe');
                        } else {
                          queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
                          toast.success(`Equipe alterada para ${teams.find(t => t.id === v)?.name || 'Sem equipe'}`);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-[150px] rounded-xl border-black/8 bg-white text-xs hover:border-black/20">
                        <SelectValue placeholder="Equipe..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-black/8 bg-white/96">
                        <SelectItem value="__none__">Sem equipe</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-10 rounded-xl bg-primary px-4 text-white opacity-90 shadow-[0_14px_28px_rgba(225,6,0,0.2)] transition hover:bg-primary-hover hover:opacity-100"
                      onClick={() => openConfirmClientDialog({
                        id: client.id,
                        clientName: client.client_name,
                        clinicName: client.clinic_name,
                        entrada: client.deal_value || 0,
                        deal_value: client.deal_value || 0,
                        pacote: client.pacote || '',
                        periodo: client.plan || '',
                        pagador_anuncio: client.pagador_anuncio,
                        equipe: client.team_id || '',
                        team_id: client.team_id,
                        commercialId: client.commercial_id,
                      })}
                    >
                      <Rocket className="h-4 w-4 mr-1" />
                      Confirmar
                    </Button>
                    <p className="text-xs text-muted-foreground/70">
                      {formatTimeAgo(new Date(client.created_at))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        <WidgetCard 
          title="Ações Rápidas"
        >
          <div className="space-y-3">
            <button
              data-cy="acao-rapida-nova-tarefa"
              className="flex h-16 w-full items-center justify-between rounded-[1.35rem] border border-black/6 bg-white/78 px-5 text-left transition hover:bg-white hover:shadow-[0_14px_30px_rgba(24,17,14,0.08)]"
              onClick={() => setIsCreateTaskDialogOpen(true)}
            >
              <span className="flex items-center gap-3 font-semibold text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                Criar nova tarefa
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              data-cy="acao-rapida-nova-reuniao"
              className="flex h-16 w-full items-center justify-between rounded-[1.35rem] border border-black/6 bg-white/78 px-5 text-left transition hover:bg-white hover:shadow-[0_14px_30px_rgba(24,17,14,0.08)]"
              onClick={() => setIsCreateMeetingDialogOpen(true)}
            >
              <span className="flex items-center gap-3 font-semibold text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Video className="h-5 w-5" />
                </span>
                Agendar reunião
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              className="flex h-16 w-full items-center justify-between rounded-[1.35rem] border border-black/6 bg-white/78 px-5 text-left transition hover:bg-white hover:shadow-[0_14px_30px_rgba(24,17,14,0.08)]"
              onClick={() => setSelectedTeamFilter('all')}
            >
              <span className="flex items-center gap-3 font-semibold text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <UserPlus className="h-5 w-5" />
                </span>
                Revisar entrada de clientes
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="rounded-[1.35rem] border border-primary/12 bg-primary/5 px-5 py-4 text-sm text-muted-foreground">
              Ao confirmar um cliente novo, a plataforma já ativa o card e prepara o checklist inicial da operação.
            </div>
          </div>
        </WidgetCard>
        </div>
      </section>

      {/* Second Widgets Row - Tasks & Meetings */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-grid">
        {/* Tasks - Real Data */}
        <WidgetCard
          data-cy="card-proximas-tarefas"
          title="Próximas Tarefas"
          action={{ label: 'Ver todas', href: '/operacional/meu-dia' }}
        >
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !upcomingTasks || upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-body text-muted-foreground">Nenhuma tarefa pendente</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-primary"
                onClick={() => setIsCreateTaskDialogOpen(true)}
              >
                Criar tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  data-cy="proxima-tarefa-item"
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-surface-3 flex items-center justify-center">
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-body font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        {task.due_date && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(task.due_date), "dd MMM", { locale: ptBR })}</span>
                          </>
                        )}
                        {task.assignee && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{task.assignee.full_name.split(' ')[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={priorityClasses[task.priority] || priorityClasses['BAIXA']}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>

        {/* Meetings - Real Data including Onboarding meetings */}
        <WidgetCard
          data-cy="card-proximas-reunioes"
          title="Próximas Reuniões"
          count={upcomingMeetings?.length || 0}
          action={{ label: 'Ver agenda', href: '/operacional/reunioes' }}
        >
          {meetingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !upcomingMeetings || upcomingMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-body text-muted-foreground">Nenhuma reunião agendada</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-primary"
                onClick={() => setIsCreateMeetingDialogOpen(true)}
              >
                Agendar reunião
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {upcomingMeetings.map((meeting) => {
                const isOnboarding = meeting.scope === 'ONBOARDING';
                return (
                  <div
                    key={meeting.id}
                    data-cy="proxima-reuniao-item"
                    onClick={() => navigate('/operacional/reunioes')}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                      isOnboarding
                        ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10'
                        : 'bg-surface-2 hover:bg-surface-3'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isOnboarding ? 'bg-primary/10' : 'bg-info/10'
                      }`}>
                        {isOnboarding ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <Video className="h-4 w-4 text-info" />
                        )}
                      </div>
                      <div>
                        <p className="text-body font-medium text-foreground">{meeting.title}</p>
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(meeting.datetime_start), "dd MMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-caption ${
                        isOnboarding 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {isOnboarding ? 'Onboarding' : (meeting.scope === 'GERAL' ? 'Geral' : meeting.scope)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      </section>

      {/* Third Widgets Row - Losses and Renewals */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-grid">
        {/* Losses (Perdas) */}
        <WidgetCard
          data-cy="card-perdas"
          title="Perdas"
          count={lostClients.length}
          tone="danger"
          action={{ label: 'Ver detalhes', href: '/operacional/inteligencia' }}
        >
          {dbClientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lostClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingDown className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-body text-muted-foreground">Nenhuma perda registrada</p>
              <p className="text-caption text-muted-foreground/70 mt-1">
                Clientes cancelados aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {lostClients.slice(0, 5).map((client) => {
                const team = teams?.find(t => t.id === client.churn_responsible_team_id);
                return (
                  <div
                    key={client.id}
                    data-cy="perda-item"
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer"
                    onClick={() => openLossDetailsDialog(client)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-body font-medium text-foreground">{client.client_name}</p>
                        <p className="text-caption text-muted-foreground line-clamp-1">
                          {client.churn_reason || 'Motivo não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-caption border-destructive/30 text-destructive">
                        {team?.name || 'Sem equipe'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>

        {/* Renewals (Renovações) */}
        <WidgetCard
          data-cy="card-renovacoes"
          title="Renovações"
          count={renewedClients.length}
          tone="success"
          action={{ label: 'Ver detalhes', href: '/operacional/inteligencia' }}
        >
          {dbClientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : renewedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-body text-muted-foreground">Nenhuma renovação registrada</p>
              <p className="text-caption text-muted-foreground/70 mt-1">
                Clientes renovados aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {renewedClients.slice(0, 5).map((client) => {
                const team = teams?.find(t => t.id === client.renewal_responsible_team_id);
                return (
                  <div
                    key={client.id}
                    data-cy="renovacao-item"
                    className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-body font-medium text-foreground">{client.client_name}</p>
                        <p className="text-caption text-muted-foreground">
                          {client.renewal_date ? format(new Date(client.renewal_date), "dd MMM yyyy", { locale: ptBR }) : 'Data não informada'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-caption border-success/30 text-success">
                        {team?.name || 'Sem equipe'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      </section>

      {/* Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Check-in</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você está prestes a registrar seu check-in de hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckInDialogOpen(false)} className="border-border">
              Cancelar
            </Button>
            <Button onClick={handleCheckIn}>
              Confirmar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Check-out</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você fez check-in às {checkInTime}. Deseja registrar seu check-out agora ({new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckOutDialogOpen(false)} className="border-border">
              Cancelar
            </Button>
            <Button onClick={handleCheckOut} className="bg-primary hover:bg-primary/90">
              <LogOut className="h-4 w-4 mr-2" />
              Confirmar Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Client Dialog */}
      <Dialog open={isConfirmClientDialogOpen} onOpenChange={setIsConfirmClientDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Confirmar Cliente
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Confirme o cliente para ativá-lo diretamente. Um card com checklist de fases será criado automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedClientForConfirm && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface-2 border border-border">
                <p className="font-medium text-foreground">{selectedClientForConfirm.clientName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>R$ {selectedClientForConfirm.entrada.toLocaleString('pt-BR')}</span>
                  {confirmClientData.periodo && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{PLAN_LABELS[confirmClientData.periodo] || confirmClientData.periodo}</span>
                    </>
                  )}
                  {confirmClientData.pacote && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="font-medium text-primary">{PACOTE_LABELS[confirmClientData.pacote] || confirmClientData.pacote}</span>
                    </>
                  )}
                  {confirmClientData.pagadorAnuncio && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{confirmClientData.pagadorAnuncio === 'CLIENTE' ? 'Cliente paga' : 'Empresa paga'}</span>
                    </>
                  )}
                  {confirmClientData.equipe && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{getEquipeLabel(confirmClientData.equipe, teams)}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Commercial Data Fields */}
              <div className="p-3 rounded-lg bg-surface-2 border border-border space-y-3">
                <p className="text-caption font-medium text-muted-foreground uppercase tracking-wide">Dados Comerciais</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-caption text-muted-foreground">Pacote</Label>
                    <Select
                      value={confirmClientData.pacote}
                      onValueChange={(v) => {
                        setConfirmClientData(prev => ({ ...prev, pacote: v }));
                        updateTaskDescription(v, confirmClientData.pagadorAnuncio, confirmClientData.equipe);
                      }}
                    >
                      <SelectTrigger className="bg-background border-border h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="COMPLETO">Completo</SelectItem>
                        <SelectItem value="TRAFEGO_E_CRIATIVOS">Tráfego e Criativos</SelectItem>
                        <SelectItem value="TRAFEGO_E_ARTES">Tráfego e Artes</SelectItem>
                        <SelectItem value="ATENDIMENTO">Atendimento</SelectItem>
                        <SelectItem value="TRAFEGO">Tráfego</SelectItem>
                        <SelectItem value="CONSULTORIA_COMERCIAL">Consultoria Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-caption text-muted-foreground">Período</Label>
                    <Select
                      value={confirmClientData.periodo}
                      onValueChange={(v) => setConfirmClientData((prev) => ({ ...prev, periodo: v }))}
                    >
                      <SelectTrigger className="bg-background border-border h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="MENSAL">Mensal</SelectItem>
                        <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                        <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-caption text-muted-foreground">Pagador de Anúncio</Label>
                    <Select
                      value={confirmClientData.pagadorAnuncio}
                      onValueChange={(v) => {
                        setConfirmClientData(prev => ({ ...prev, pagadorAnuncio: v }));
                        updateTaskDescription(confirmClientData.pacote, v, confirmClientData.equipe);
                      }}
                    >
                      <SelectTrigger className="bg-background border-border h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="CLIENTE">Cliente paga anúncio</SelectItem>
                        <SelectItem value="GREAT">Empresa paga anúncio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-caption text-muted-foreground">Equipe *</Label>
                    <Select
                      value={confirmClientData.equipe}
                      onValueChange={(v) => {
                        setConfirmClientData(prev => ({ ...prev, equipe: v }));
                        updateTaskDescription(confirmClientData.pacote, confirmClientData.pagadorAnuncio, v);
                      }}
                    >
                      <SelectTrigger className="bg-background border-border h-9">
                        <SelectValue placeholder="Selecione a equipe..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Título do Card</Label>
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ex: Onboarding: Nome do Cliente"
                  className="bg-white border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Descrição (Atualiza automaticamente)</Label>
                <Textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Detalhes da tarefa..."
                  className="bg-white border-border min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmClientDialogOpen(false)} 
              className="border-border"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmClient}
              disabled={isCreatingTask}
              className="bg-primary hover:bg-primary/90"
            >
              {isCreatingTask && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Onboarding Flow Dialog */}
      {selectedClientForOnboarding && (
        <ClientOnboardingFlow
          client={selectedClientForOnboarding}
          open={isOnboardingFlowOpen}
          onOpenChange={(open) => {
            setIsOnboardingFlowOpen(open);
            if (!open) setSelectedClientForOnboarding(null);
          }}
        />
      )}

      {/* Create Task Dialog */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent data-cy="modal-nova-tarefa" className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Criar Nova Tarefa
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie uma tarefa e atribua a um membro da equipe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Título *</Label>
              <Input
                data-cy="input-tarefa-titulo"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                placeholder="Ex: Configurar campanha de anúncios"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Descrição</Label>
              <Textarea
                data-cy="input-tarefa-descricao"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Detalhes da tarefa..."
                className="bg-background border-border min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Prioridade</Label>
                <Select
                  value={newTaskForm.priority}
                  onValueChange={(v) => setNewTaskForm({ ...newTaskForm, priority: v })}
                >
                  <SelectTrigger className="bg-background border-border">
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

              <div className="space-y-2">
                <Label className="text-foreground">Atribuir a</Label>
                <Select
                  value={newTaskForm.assignee_user_id}
                  onValueChange={(v) =>
                    setNewTaskForm({
                      ...newTaskForm,
                      assignee_user_id: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger data-cy="select-assignee" className="bg-background border-border">
                    <SelectValue placeholder="Selecione..." />
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
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateTaskDialogOpen(false)} 
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              data-cy="btn-salvar-tarefa"
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateMeetingDialogOpen} onOpenChange={setIsCreateMeetingDialogOpen}>
        <DialogContent data-cy="modal-nova-reuniao" className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Agendar Reunião
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Agende uma nova reunião para a equipe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Título *</Label>
              <Input
                data-cy="input-reuniao-titulo"
                value={newMeetingForm.title}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                placeholder="Ex: Alinhamento semanal"
                className="bg-background border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Início *</Label>
                <Input
                  type="datetime-local"
                  value={newMeetingForm.datetime_start}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, datetime_start: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Fim</Label>
                <Input
                  type="datetime-local"
                  value={newMeetingForm.datetime_end}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, datetime_end: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Pauta</Label>
              <Textarea
                value={newMeetingForm.agenda}
                onChange={(e) => setNewMeetingForm({ ...newMeetingForm, agenda: e.target.value })}
                placeholder="Tópicos a serem discutidos..."
                className="bg-background border-border min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateMeetingDialogOpen(false)} 
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              data-cy="btn-salvar-reuniao"
              onClick={handleCreateMeeting}
              disabled={createMeetingMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createMeetingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar Reunião
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loss Details Dialog */}
      <Dialog open={isLossDetailsDialogOpen} onOpenChange={setIsLossDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Detalhes da Perda
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Informações sobre o cliente perdido
            </DialogDescription>
          </DialogHeader>
          
          {selectedLossClient && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="font-semibold text-foreground text-lg">{selectedLossClient.client_name}</p>
                {selectedLossClient.clinic_name && (
                  <p className="text-sm text-muted-foreground">{selectedLossClient.clinic_name}</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Motivo do Cancelamento</Label>
                  <p className="text-sm text-foreground mt-1 p-3 bg-surface-2 rounded-lg">
                    {selectedLossClient.churn_reason || 'Motivo não informado'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Equipe Responsável</Label>
                    <p className="text-sm text-foreground mt-1">
                      {teams?.find(t => t.id === selectedLossClient.churn_responsible_team_id)?.name || 'Não definida'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data da Perda</Label>
                    <p className="text-sm text-foreground mt-1">
                      {selectedLossClient.churn_date 
                        ? format(new Date(selectedLossClient.churn_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Não informada'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Valor do Contrato</Label>
                  <p className="text-sm text-foreground mt-1">
                    R$ {(selectedLossClient.deal_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsLossDetailsDialogOpen(false)} 
              className="border-border"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
