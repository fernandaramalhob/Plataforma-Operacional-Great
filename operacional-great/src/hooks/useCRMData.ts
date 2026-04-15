import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CRMEvent {
  id: string;
  client_id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string | null;
  sale_value: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface OperationalClient {
  id: string;
  client_name: string;
  clinic_name: string | null;
  plan: string | null;
  deal_value: number | null;
  status_operacional: string;
  team_id: string | null;
  activated_at: string | null;
  activated_by: string | null;
  onboarding_start_at: string | null;
  onboarding_done_at: string | null;
  onboarding_stage: string | null;
  briefing_completed_at: string | null;
  stage_trafego: string | null;
  stage_atendimento: string | null;
  stage_marketing: string | null;
  commercial_id: string | null;
  creative_source: string | null;
  created_at: string;
  // Churn/Loss tracking
  churn_status: string | null;
  churn_reason: string | null;
  churn_responsible_team_id: string | null;
  churn_date: string | null;
  // Renewal tracking
  renewal_status: string | null;
  renewal_date: string | null;
  renewal_responsible_team_id: string | null;
  // Renewal due date for automatic monitoring
  renewal_due_date: string | null;
  // Commercial info
  pagador_anuncio: string | null;
  // Client tier (PREMIUM or POPULAR)
  client_tier: 'PREMIUM' | 'POPULAR' | null;
  // Package type (Completo, Tráfego e Criativos, etc.)
  pacote: string | null;
  // Ad account access
  ad_account_name: string | null;
  has_recharge: boolean | null;
  recharge_value: number | null;
  start_meeting_date: string | null;
  nps_sent: boolean | null;
  nps_answered: boolean | null;
  status_updated_at: string | null;
}

export const EVENT_TYPES = {
  RENOVACAO: { label: 'Renovação', color: 'bg-success-soft text-success', icon: 'RefreshCw' },
  RENOVACAO_MENSAL: { label: 'Renovação Mensal', color: 'bg-emerald-100 text-emerald-700', icon: 'RefreshCw' },
  REUNIAO_COORDENADOR: { label: 'Reunião Coordenador', color: 'bg-blue-100 text-blue-700', icon: 'Users' },
  REUNIAO_ATENDIMENTO: { label: 'Reunião Atendimento', color: 'bg-primary-soft text-primary', icon: 'MessageSquare' },
  REUNIAO_TRAFEGO: { label: 'Reunião Tráfego', color: 'bg-warning-soft text-warning', icon: 'TrendingUp' },
  VENDA_OPERACIONAL: { label: 'Venda Operacional', color: 'bg-green-100 text-green-700', icon: 'DollarSign' },
} as const;

export function useOperationalClients() {
  return useQuery({
    queryKey: ['operational-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OperationalClient[];
    },
  });
}

export function useCRMEvents(clientId?: string) {
  return useQuery({
    queryKey: ['crm-events', clientId],
    queryFn: async () => {
      let query = supabase
        .from('crm_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: events, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(events?.map(e => e.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (events || []).map(event => ({
        ...event,
        user: profileMap.get(event.user_id) || null,
      })) as CRMEvent[];
    },
    enabled: true,
  });
}

export function useAddCRMEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      client_id: string;
      event_type: string;
      title: string;
      description?: string;
      sale_value?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('crm_events')
        .insert({
          client_id: event.client_id,
          event_type: event.event_type,
          title: event.title,
          description: event.description,
          sale_value: event.sale_value,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-events', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['crm-events'] });
      queryClient.invalidateQueries({ queryKey: ['operational-sales-metrics'] });
      // Invalidate commission-related queries
      queryClient.invalidateQueries({ queryKey: ['operational-product-sales'] });
      queryClient.invalidateQueries({ queryKey: ['ia-agenda-sales'] });
      queryClient.invalidateQueries({ queryKey: ['ia-agenda-recurrence'] });
      queryClient.invalidateQueries({ queryKey: ['ia-renewals'] });
      queryClient.invalidateQueries({ queryKey: ['operational-renewals'] });
    },
  });
}

export function useResolveCRMEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, clientId }: { eventId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from('crm_events')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-events', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['crm-events'] });
    },
  });
}

export function useActivateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data: clientData, error: clientFetchError } = await supabase
        .from('operational_clients')
        .select('id, client_name')
        .eq('id', clientId)
        .single();

      if (clientFetchError) throw clientFetchError;

      // Update client status
      const { error: clientError } = await supabase
        .from('operational_clients')
        .update({
          status_operacional: 'ATIVO',
          onboarding_stage: 'ATIVO',
          activated_at: new Date().toISOString(),
          activated_by: user.id,
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add activation event
      const { error: eventError } = await supabase
        .from('crm_events')
        .insert({
          client_id: clientId,
          user_id: user.id,
          event_type: 'ATIVACAO',
          title: 'Cliente ativado',
          description: 'Cliente foi ativado e está pronto para operação completa.',
        });

      if (eventError) throw eventError;

      // Move card to ATIVO column in CLIENTES board
      const CLIENTS_BOARD_ID = 'c66b6085-1e12-43fa-a91d-1a721a6f7d8b';
      const ATIVO_COLUMN_ID = 'a1b3915c-18a2-4d9f-9749-3d33559589f3';
      
      await supabase
        .from('exec_cards')
        .update({ column_id: ATIVO_COLUMN_ID })
        .eq('board_id', CLIENTS_BOARD_ID)
        .eq('client_id', clientId);

      await supabase
        .from('ad_creatives')
        .update({ client_name: clientData.client_name })
        .eq('client_id', clientId);

      const { data: existingCreatives } = await supabase
        .from('ad_creatives')
        .select('image_url')
        .eq('client_id', clientId);

      const existingUrls = new Set((existingCreatives || []).map((creative) => creative.image_url));

      const { data: clientFiles } = await supabase
        .from('client_files')
        .select('file_url, uploaded_by_user_id')
        .eq('client_id', clientId);

      const missingCreativeRows = (clientFiles || [])
        .filter((file) => file.file_url && !existingUrls.has(file.file_url))
        .map((file) => ({
          client_id: clientId,
          client_name: clientData.client_name,
          image_url: file.file_url,
          image_urls: [file.file_url],
          created_by_user_id: file.uploaded_by_user_id || user.id,
          created_by_name: user.name,
          status: 'PARA_SUBIR',
        }));

      if (missingCreativeRows.length > 0) {
        const { error: creativeInsertError } = await supabase
          .from('ad_creatives')
          .insert(missingCreativeRows);

        if (creativeInsertError) throw creativeInsertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm-events'] });
      queryClient.invalidateQueries({ queryKey: ['clients-in-activation'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      queryClient.invalidateQueries({ queryKey: ['client-ad-creatives'] });
      queryClient.invalidateQueries({ queryKey: ['pending-creatives-list'] });
    },
  });
}

export function useClientStats() {
  const { data: clients } = useOperationalClients();

  const stats = {
    total: clients?.length || 0,
    novos: clients?.filter(c => c.status_operacional === 'NOVO_CLIENTE').length || 0,
    onboarding: clients?.filter(c => c.status_operacional === 'ONBOARDING').length || 0,
    ativos: clients?.filter(c => c.status_operacional === 'ATIVO').length || 0,
    pendingActivation: clients?.filter(c => 
      c.status_operacional === 'ONBOARDING' && !c.activated_at
    ).length || 0,
    perdas: clients?.filter(c => c.churn_status === 'CONFIRMED').length || 0,
    renovacoes: clients?.filter(c => c.renewal_status === 'RENEWED').length || 0,
  };

  return stats;
}

// Hook for marking client as loss (churn)
export function useMarkClientAsLoss() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      reason, 
      responsibleTeamId 
    }: { 
      clientId: string; 
      reason: string; 
      responsibleTeamId: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get client name for championship event
      const { data: client } = await supabase
        .from('operational_clients')
        .select('client_name')
        .eq('id', clientId)
        .single();

      const { error: clientError } = await supabase
        .from('operational_clients')
        .update({
          churn_status: 'CONFIRMED',
          churn_reason: reason,
          churn_responsible_team_id: responsibleTeamId,
          churn_date: new Date().toISOString(),
          status_operacional: 'ENCERRADO',
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add CRM event for the loss
      const { error: eventError } = await supabase
        .from('crm_events')
        .insert({
          client_id: clientId,
          user_id: user.id,
          event_type: 'ALERTA',
          title: 'Cliente perdido',
          description: `Motivo: ${reason}`,
        });

      if (eventError) throw eventError;

      // Register championship event for loss (-2 points)
      // Mapping from teams table to championship_teams
      const TEAM_TO_CHAMPIONSHIP_MAP: Record<string, string> = {
        '0469e3aa-5b34-42e2-b89d-f412efaa27ba': 'TIME_7',
        '38c9028d-856d-481e-95c9-bb2eb8b459f5': 'TROPA_DE_ELITE',
      };

      const championshipTeamId = TEAM_TO_CHAMPIONSHIP_MAP[responsibleTeamId];
      if (championshipTeamId) {
        // Insert championship event
        await supabase
          .from('championship_events')
          .insert({
            team_id: championshipTeamId,
            event_type: 'LOSS',
            points: -2,
            client_name: client?.client_name || 'Cliente',
            description: `Perda: ${reason}`,
            created_by: user.id,
          });

        // Update team stats
        const { data: team } = await supabase
          .from('championship_teams')
          .select('*')
          .eq('team_id', championshipTeamId)
          .single();

        if (team) {
          await supabase
            .from('championship_teams')
            .update({
              total_points: team.total_points - 2,
              losses: team.losses + 1,
            })
            .eq('team_id', championshipTeamId);

          // Recalculate rankings
          const { data: allTeams } = await supabase
            .from('championship_teams')
            .select('*')
            .order('total_points', { ascending: false });

          if (allTeams) {
            for (let i = 0; i < allTeams.length; i++) {
              await supabase
                .from('championship_teams')
                .update({ 
                  previous_rank: allTeams[i].current_rank,
                  current_rank: i + 1 
                })
                .eq('id', allTeams[i].id);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm-events'] });
      queryClient.invalidateQueries({ queryKey: ['operational-sales-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}

// Mapping from teams table to championship_teams
const TEAM_TO_CHAMPIONSHIP_MAP: Record<string, string> = {
  '0469e3aa-5b34-42e2-b89d-f412efaa27ba': 'TIME_7', // Equipe 7
  '38c9028d-856d-481e-95c9-bb2eb8b459f5': 'TROPA_DE_ELITE', // Tropa de Elite
};

// Hook for marking client as renewed
export function useMarkClientAsRenewed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      responsibleTeamId,
      renewalValue
    }: { 
      clientId: string; 
      responsibleTeamId: string;
      renewalValue?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get client name for championship event
      const { data: client } = await supabase
        .from('operational_clients')
        .select('client_name')
        .eq('id', clientId)
        .single();

      const { error: clientError } = await supabase
        .from('operational_clients')
        .update({
          renewal_status: 'RENEWED',
          renewal_date: new Date().toISOString(),
          renewal_responsible_team_id: responsibleTeamId,
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Add CRM event for the renewal (use RENOVACAO_MENSAL for commission tracking)
      const { error: eventError } = await supabase
        .from('crm_events')
        .insert({
          client_id: clientId,
          user_id: user.id,
          event_type: 'RENOVACAO_MENSAL',
          title: 'Cliente renovado',
          description: 'Contrato renovado com sucesso.',
          sale_value: renewalValue || null,
        });

      if (eventError) throw eventError;

      // Register championship event for renewal (+3 points)
      const championshipTeamId = TEAM_TO_CHAMPIONSHIP_MAP[responsibleTeamId];
      if (championshipTeamId) {
        // Insert championship event
        await supabase
          .from('championship_events')
          .insert({
            team_id: championshipTeamId,
            event_type: 'RENEWAL',
            points: 3,
            client_name: client?.client_name || 'Cliente',
            description: 'Renovação de contrato',
            created_by: user.id,
          });

        // Update team stats
        const { data: team } = await supabase
          .from('championship_teams')
          .select('*')
          .eq('team_id', championshipTeamId)
          .single();

        if (team) {
          await supabase
            .from('championship_teams')
            .update({
              total_points: team.total_points + 3,
              renewals: team.renewals + 1,
            })
            .eq('team_id', championshipTeamId);

          // Recalculate rankings
          const { data: allTeams } = await supabase
            .from('championship_teams')
            .select('*')
            .order('total_points', { ascending: false });

          if (allTeams) {
            for (let i = 0; i < allTeams.length; i++) {
              await supabase
                .from('championship_teams')
                .update({ 
                  previous_rank: allTeams[i].current_rank,
                  current_rank: i + 1 
                })
                .eq('id', allTeams[i].id);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm-events'] });
      queryClient.invalidateQueries({ queryKey: ['operational-sales-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}

// Hook for clients in loss/renewal status with team info
export function useChurnAndRenewalStats() {
  return useQuery({
    queryKey: ['churn-renewal-stats'],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('operational_clients')
        .select('*, team:teams!operational_clients_churn_responsible_team_id_fkey(id, name), renewal_team:teams!operational_clients_renewal_responsible_team_id_fkey(id, name)')
        .or('churn_status.not.is.null,renewal_status.not.is.null');

      if (error) {
        // Fallback if FK relationship doesn't work
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('operational_clients')
          .select('*')
          .or('churn_status.not.is.null,renewal_status.not.is.null');
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }

      return clients || [];
    },
  });
}

// Hook to fetch operational sales metrics by team
export function useOperationalSalesMetrics() {
  return useQuery({
    queryKey: ['operational-sales-metrics'],
    queryFn: async () => {
      // Get all VENDA_OPERACIONAL events with sale_value
      const { data: salesEvents, error: salesError } = await supabase
        .from('crm_events')
        .select(`
          id,
          client_id,
          sale_value,
          created_at,
          user_id,
          title,
          description
        `)
        .eq('event_type', 'VENDA_OPERACIONAL')
        .not('sale_value', 'is', null);

      if (salesError) throw salesError;

      // Get operational clients with their team info
      const { data: clients, error: clientsError } = await supabase
        .from('operational_clients')
        .select(`
          id,
          client_name,
          team_id,
          renewal_status,
          renewal_date,
          renewal_responsible_team_id,
          churn_status,
          churn_date,
          churn_responsible_team_id
        `);

      if (clientsError) throw clientsError;

      // Get teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) throw teamsError;

      // Map client to team
      const clientTeamMap = new Map(clients?.map(c => [c.id, c.team_id]) || []);
      const clientNameMap = new Map(clients?.map(c => [c.id, c.client_name]) || []);
      const teamNameMap = new Map(teams?.map(t => [t.id, t.name]) || []);

      const renewalEvents = (clients || [])
        .filter((client) => client.renewal_status === 'RENEWED' && client.renewal_date)
        .map((client) => {
          const teamId = client.renewal_responsible_team_id || client.team_id;
          return {
            clientId: client.id,
            clientName: client.client_name,
            teamId,
            teamName: teamNameMap.get(teamId || '') || 'Sem equipe',
            created_at: client.renewal_date as string,
          };
        });

      const lossEvents = (clients || [])
        .filter((client) => client.churn_status === 'CONFIRMED' && client.churn_date)
        .map((client) => {
          const teamId = client.churn_responsible_team_id || client.team_id;
          return {
            clientId: client.id,
            clientName: client.client_name,
            teamId,
            teamName: teamNameMap.get(teamId || '') || 'Sem equipe',
            created_at: client.churn_date as string,
          };
        });

      // Aggregate sales by team
      const teamSales: Record<string, { teamName: string; totalValue: number; salesCount: number }> = {};

      salesEvents?.forEach(event => {
        const teamId = clientTeamMap.get(event.client_id);
        if (teamId) {
          if (!teamSales[teamId]) {
            teamSales[teamId] = {
              teamName: teamNameMap.get(teamId) || 'Equipe Desconhecida',
              totalValue: 0,
              salesCount: 0,
            };
          }
          teamSales[teamId].totalValue += event.sale_value || 0;
          teamSales[teamId].salesCount += 1;
        }
      });

      // Total sales
      const totalSalesValue = salesEvents?.reduce((acc, e) => acc + (e.sale_value || 0), 0) || 0;
      const totalSalesCount = salesEvents?.length || 0;

      return {
        teamSales: Object.entries(teamSales).map(([teamId, data]) => ({
          teamId,
          ...data,
        })),
        totalSalesValue,
        totalSalesCount,
        totalRenewalsCount: renewalEvents.length,
        totalLossesCount: lossEvents.length,
        salesEvents: salesEvents?.map(e => ({
          ...e,
          clientName: clientNameMap.get(e.client_id) || 'Cliente',
          teamName: teamNameMap.get(clientTeamMap.get(e.client_id) || '') || 'Sem equipe',
        })) || [],
        renewalEvents,
        lossEvents,
      };
    },
  });
}

// Tipo para tarefa de onboarding
export interface OnboardingTask {
  id: string;
  clientId: string;
  clientName: string;
  clinicName: string | null;
  stage: string;
  taskType: 'BRIEFING' | 'ONBOARDING' | 'MARKETING' | 'TRAFEGO' | 'ATENDIMENTO';
  title: string;
  description: string;
  assignedTo?: string;
  createdAt: string;
}

// Hook para gerar tarefas automáticas de onboarding
export function useOnboardingTasks() {
  const { data: clients, isLoading } = useOperationalClients();

  const tasks: OnboardingTask[] = [];

  if (clients) {
    clients.forEach(client => {
      // Clientes NOVO_CLIENTE precisam de briefing
      if (client.status_operacional === 'NOVO_CLIENTE') {
        tasks.push({
          id: `briefing-${client.id}`,
          clientId: client.id,
          clientName: client.client_name,
          clinicName: client.clinic_name,
          stage: 'CONTRATO',
          taskType: 'BRIEFING',
          title: `Cobrar briefing do cliente ${client.client_name}`,
          description: 'Enviar formulário de briefing e aguardar preenchimento',
          createdAt: client.created_at,
        });
      }

      // Clientes em ONBOARDING - gerar tarefa baseada no stage
      if (client.status_operacional === 'ONBOARDING') {
        const stage = client.onboarding_stage || 'BRIEFING';
        
        switch (stage) {
          case 'BRIEFING':
            tasks.push({
              id: `briefing-${client.id}`,
              clientId: client.id,
              clientName: client.client_name,
              clinicName: client.clinic_name,
              stage,
              taskType: 'BRIEFING',
              title: `Cobrar briefing do cliente ${client.client_name}`,
              description: 'Enviar formulário de briefing e aguardar preenchimento',
              createdAt: client.created_at,
            });
            break;
          case 'ONBOARDING':
            tasks.push({
              id: `onboarding-${client.id}`,
              clientId: client.id,
              clientName: client.client_name,
              clinicName: client.clinic_name,
              stage,
              taskType: 'ONBOARDING',
              title: `Reunião de Onboarding: ${client.client_name}`,
              description: 'Agendar e realizar reunião de chegada',
              assignedTo: 'Isaque',
              createdAt: client.created_at,
            });
            break;
          case 'MARKETING':
            tasks.push({
              id: `marketing-${client.id}`,
              clientId: client.id,
              clientName: client.client_name,
              clinicName: client.clinic_name,
              stage,
              taskType: 'MARKETING',
              title: `Produzir artes: ${client.client_name}`,
              description: 'Criar materiais de marketing digital',
              createdAt: client.created_at,
            });
            break;
          case 'TRAFEGO':
            tasks.push({
              id: `trafego-${client.id}`,
              clientId: client.id,
              clientName: client.client_name,
              clinicName: client.clinic_name,
              stage,
              taskType: 'TRAFEGO',
              title: `Criar campanhas: ${client.client_name}`,
              description: 'Configurar campanhas de tráfego pago',
              createdAt: client.created_at,
            });
            break;
          case 'ATENDIMENTO':
            tasks.push({
              id: `atendimento-${client.id}`,
              clientId: client.id,
              clientName: client.client_name,
              clinicName: client.clinic_name,
              stage,
              taskType: 'ATENDIMENTO',
              title: `Conectar WhatsApp: ${client.client_name}`,
              description: 'Configurar canal de atendimento',
              createdAt: client.created_at,
            });
            break;
        }
      }
    });
  }

  return { 
    data: tasks, 
    isLoading,
    briefingTasks: tasks.filter(t => t.taskType === 'BRIEFING'),
    onboardingMeetings: tasks.filter(t => t.taskType === 'ONBOARDING'),
  };
}

// Constants for CLIENTES board sync
const CLIENTS_BOARD_ID = 'c66b6085-1e12-43fa-a91d-1a721a6f7d8b';
const STAGE_COLUMN_MAP: Record<string, string> = {
  'CONTRATO': '2ea4bcac-7b5b-4305-8fc0-8aec0ab9ef85', // Briefing
  'BRIEFING': '2ea4bcac-7b5b-4305-8fc0-8aec0ab9ef85', // Briefing
  'ONBOARDING': '67b3d003-334e-4845-b344-0821d80eec24', // Reunião de Start
  'DESIGN': '309c86ae-5e32-4c4f-91f7-37d98049d37d', // Marketing Digital (Design)
  'MARKETING': '309c86ae-5e32-4c4f-91f7-37d98049d37d', // Marketing Digital
  'TRAFEGO': '606ca5e0-3aba-487e-a866-f818b229752a', // Tráfego Pago
  'ATENDIMENTO': '606ca5e0-3aba-487e-a866-f818b229752a', // Tráfego Pago
  'ATIVO': 'a1b3915c-18a2-4d9f-9749-3d33559589f3', // Ativo
};

// Destination boards for automations
const DESTINATION_BOARDS = {
  DESIGN_PRODUCAO: '1a0e8a51-ff17-47a2-8c97-2eaf1129fe45',
  TRAFEGO_EXECUCAO: '3e2bda81-a3a1-40b0-bf98-1ebb06959720',
};

const DESTINATION_COLUMNS = {
  DESIGN_PRODUCAO_FIRST: '244c1cdd-b7ea-4601-b301-05186ffa713b',
  TRAFEGO_EXECUCAO_FIRST: '35311340-70ed-4b2a-97cb-91b29e50e617',
};

// Hook to update client onboarding stage and sync with CLIENTES board + trigger automations
export function useUpdateClientOnboardingStage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ clientId, stage }: { clientId: string; stage: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Get client info for card creation
      const { data: client } = await supabase
        .from('operational_clients')
        .select('client_name, clinic_name')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      // Update client onboarding stage
      const { error: clientError } = await supabase
        .from('operational_clients')
        .update({ 
          onboarding_stage: stage,
          status_operacional: stage === 'ATIVO' ? 'ATIVO' : 'ONBOARDING',
          // Update activation timestamp if moving to ATIVO
          ...(stage === 'ATIVO' ? { activated_at: new Date().toISOString(), activated_by: user.id } : {}),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Update card column in CLIENTES board
      const targetColumnId = STAGE_COLUMN_MAP[stage] || STAGE_COLUMN_MAP['BRIEFING'];
      
      await supabase
        .from('exec_cards')
        .update({ column_id: targetColumnId })
        .eq('board_id', CLIENTS_BOARD_ID)
        .eq('client_id', clientId);

      const automationsTriggered: string[] = [];

      // AUTOMATION: Create card in Design - Produção when moving to DESIGN or MARKETING stage
      if (stage === 'DESIGN' || stage === 'MARKETING') {
        // Check if card already exists in Design - Produção
        const { data: existingDesignCards } = await supabase
          .from('exec_cards')
          .select('id')
          .eq('board_id', DESTINATION_BOARDS.DESIGN_PRODUCAO)
          .eq('client_id', clientId);

        if (!existingDesignCards || existingDesignCards.length === 0) {
          const { error: designError } = await supabase
            .from('exec_cards')
            .insert({
              board_id: DESTINATION_BOARDS.DESIGN_PRODUCAO,
              column_id: DESTINATION_COLUMNS.DESIGN_PRODUCAO_FIRST,
              title: client.client_name,
              description: `🎨 Cliente de Marketing Digital\n\n**Cliente:** ${client.client_name}${client.clinic_name ? `\n**Clínica:** ${client.clinic_name}` : ''}`,
              client_id: clientId,
              priority: 'ALTA',
              order: 0,
              created_by_user_id: user.id,
            });

          if (!designError) {
            automationsTriggered.push('Design - Produção');
          }
        }
      }

      // AUTOMATION: Create card in Tráfego Pago - Execução when moving to TRAFEGO stage
      if (stage === 'TRAFEGO') {
        // Check if card already exists in Tráfego Pago - Execução
        const { data: existingTrafegoCards } = await supabase
          .from('exec_cards')
          .select('id')
          .eq('board_id', DESTINATION_BOARDS.TRAFEGO_EXECUCAO)
          .eq('client_id', clientId);

        if (!existingTrafegoCards || existingTrafegoCards.length === 0) {
          const { error: trafegoError } = await supabase
            .from('exec_cards')
            .insert({
              board_id: DESTINATION_BOARDS.TRAFEGO_EXECUCAO,
              column_id: DESTINATION_COLUMNS.TRAFEGO_EXECUCAO_FIRST,
              title: client.client_name,
              description: `📈 Cliente de Tráfego Pago\n\n**Cliente:** ${client.client_name}${client.clinic_name ? `\n**Clínica:** ${client.clinic_name}` : ''}`,
              client_id: clientId,
              priority: 'ALTA',
              order: 0,
              created_by_user_id: user.id,
            });

          if (!trafegoError) {
            automationsTriggered.push('Tráfego Pago - Execução');
          }
        }
      }

      return { clientId, stage, automationsTriggered, clientName: client.client_name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-in-activation'] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      
      // Show automation notifications
      if (result?.automationsTriggered && result.automationsTriggered.length > 0) {
        result.automationsTriggered.forEach(board => {
          toast.success(`Card criado no quadro "${board}"`, {
            description: result.clientName,
          });
        });
      }
    },
  });
}

// Hook for creating a new operational client directly
export function useCreateOperationalClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      client_name: string;
      clinic_name?: string | null;
      plan?: string | null;
      deal_value?: number | null;
      team_id?: string | null;
      creative_source?: string | null;
      pagador_anuncio?: string | null;
      activated_at?: string | null;
      pacote?: string | null;
    }) => {
      // If activated_at is provided, client starts as ATIVO
      const hasActivationDate = !!data.activated_at;
      
      const { data: newClient, error } = await supabase
        .from('operational_clients')
        .insert({
          client_name: data.client_name,
          clinic_name: data.clinic_name,
          plan: data.plan,
          deal_value: data.deal_value,
          team_id: data.team_id,
          creative_source: data.creative_source,
          pagador_anuncio: data.pagador_anuncio,
          pacote: data.pacote,
          activated_at: data.activated_at ? new Date(data.activated_at).toISOString() : null,
          status_operacional: 'EM_ATIVACAO',
          onboarding_stage: 'ACESSO_AO_BRIEFING',
        })
        .select()
        .single();

      if (error) throw error;
      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
    },
  });
}
