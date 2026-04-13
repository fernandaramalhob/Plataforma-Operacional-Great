// Commercial Context - Pipeline and Sales Management (v2)
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { SalesGoal } from '@/types';
import { useAuthSafe } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

export type PipelineStage = 'NOVO' | 'NO_SHOW' | 'TAXA_INTERESSE' | 'NEGOCIACAO' | 'PERDIDO' | 'FECHADO';

// New dropdown types for the pipeline
export type Vendedor = 'HERBERT' | 'CLED' | 'PEDRO_H' | 'PEDRO_JUAN' | 'CAETANO';
export type Equipe = string; // Now uses database team IDs

// Team IDs from database - used for round-robin distribution
export const TEAM_IDS = {
  EQUIPE_7: '0469e3aa-5b34-42e2-b89d-f412efaa27ba',
  TROPA_DE_ELITE: '38c9028d-856d-481e-95c9-bb2eb8b459f5',
} as const;
export type Faturamento = '0_A_15K' | '15K_A_30K' | '30K_A_50K' | '50K_A_100K' | '100K_PLUS' | 'NAO_INFORMADO' | 'PERSONALIZADO';
export type Pacote = 'COMPLETO' | 'TRAFEGO_E_CRIATIVOS' | 'ATENDIMENTO' | 'TRAFEGO' | 'COMPLETO_NOVA_ERA' | 'TRAFEGO_ARTES_IA' | 'TRAFEGO_CONSULTORIA' | 'IA' | 'TRAFEGO_ROTEIRO' | 'TRAFEGO_IA';
export type Periodo = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'TAXA_INTERESSE';
export type PagadorAnuncio = 'CLIENTE' | 'GREAT';
export type Indicacao = 'SIM' | 'NAO' | string;
export type TemSocio = 'SIM' | 'NAO' | 'NAO_PERGUNTADO';
export type TemMkt = 'SIM' | 'NAO' | 'NAO_PERGUNTADO';
export type TemSecretaria = 'SIM' | 'NAO' | 'NAO_PERGUNTADO';
export type SalaoOuClinica = 'SALAO' | 'CLINICA' | 'NAO_INFORMADO';

export type Agendador = 'MIGUEL' | 'PEDRO' | 'HEBERT' | 'CLED' | 'CAETANO';

export const AGENDADOR_OPTIONS: { value: Agendador; label: string }[] = [
  { value: 'MIGUEL', label: 'Miguel' },
  { value: 'PEDRO', label: 'Pedro' },
  { value: 'HEBERT', label: 'Hebert' },
  { value: 'CLED', label: 'Cled' },
  { value: 'CAETANO', label: 'Caetano' },
];

export const TEM_SOCIO_OPTIONS: { value: TemSocio; label: string }[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_PERGUNTADO', label: 'Não Perguntado' },
];

export const TEM_MKT_OPTIONS: { value: TemMkt; label: string }[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_PERGUNTADO', label: 'Não Perguntado' },
];

export const TEM_SECRETARIA_OPTIONS: { value: TemSecretaria; label: string }[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_PERGUNTADO', label: 'Não Perguntado' },
];

export const SALAO_OU_CLINICA_OPTIONS: { value: SalaoOuClinica; label: string }[] = [
  { value: 'SALAO', label: 'Salão' },
  { value: 'CLINICA', label: 'Clínica' },
  { value: 'NAO_INFORMADO', label: 'Não Informado' },
];

export type PodeInvestir = 'SIM' | 'NAO';

export const PODE_INVESTIR_OPTIONS: { value: PodeInvestir; label: string }[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
];

export interface PipelineClient {
  id: string;
  ativo: boolean;
  clientName: string;
  clinicName: string;
  telefone?: string;
  vendedor?: Vendedor;
  criativo: string;
  equipe: Equipe;
  faturamento: Faturamento;
  faturamentoPersonalizado?: string;
  podeInvestir?: PodeInvestir;
  pacote: Pacote;
  periodo: Periodo;
  indicacao?: string;
  entrada: number;
  dataEntrada: Date;
  stage: PipelineStage;
  lastStageChange?: Date;
  lostReason?: string;
  noShowReason?: string;
  notes?: string;
  agendadoPor?: Agendador;
  agendadoVia?: string;
  pagadorAnuncio?: PagadorAnuncio;
  temSocio?: TemSocio;
  temMkt?: TemMkt;
  temSecretaria?: TemSecretaria;
  salaoOuClinica?: SalaoOuClinica;
  createdByUserId: string;
  dealValue?: number;
  plan?: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'TAXA_INTERESSE';
  creativeSource?: string;
  entryDate?: Date;
  meetingDate?: string;
  meetingTime?: string;
  paymentDeadline?: Date;
  expectedCloseDate?: Date;
  assignedSDR?: string;
  assignedCloser?: string;
  followupDone?: boolean;
  createdAt?: Date;
}

export interface PaymentReminder {
  id: string;
  clientId: string;
  clientName: string;
  clinicName: string;
  dealValue: number;
  paymentDeadline: Date;
  dismissed: boolean;
  createdAt: Date;
}

export interface SDRGoal {
  id: string;
  agendador: Agendador;
  month: string;
  goalCount: number;
  createdAt: Date;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  'NOVO': 'Novo Lead',
  'NO_SHOW': 'No Show',
  'TAXA_INTERESSE': 'Taxa de Interesse',
  'NEGOCIACAO': 'Negociação',
  'PERDIDO': 'Perdido',
  'FECHADO': 'Fechado',
};

export const STAGE_ORDER: PipelineStage[] = ['NOVO', 'NO_SHOW', 'TAXA_INTERESSE', 'NEGOCIACAO', 'PERDIDO', 'FECHADO'];

export const VENDEDOR_OPTIONS: { value: Vendedor; label: string }[] = [
  { value: 'HERBERT', label: 'Herbert' },
  { value: 'CLED', label: 'Cled' },
  { value: 'PEDRO_H', label: 'Pedro H' },
  { value: 'PEDRO_JUAN', label: 'Pedro Juan' },
  { value: 'CAETANO', label: 'Caetano' },
];

export const EQUIPE_OPTIONS: { value: string; label: string }[] = [
  { value: TEAM_IDS.TROPA_DE_ELITE, label: 'Tropa de Elite' },
  { value: TEAM_IDS.EQUIPE_7, label: 'Equipe 7' },
];

export const FATURAMENTO_OPTIONS: { value: Faturamento; label: string }[] = [
  { value: '0_A_15K', label: '0-15K' },
  { value: '15K_A_30K', label: '15-30K' },
  { value: '30K_A_50K', label: '30-50K' },
  { value: '50K_A_100K', label: '50-100K' },
  { value: '100K_PLUS', label: '100K+' },
  { value: 'NAO_INFORMADO', label: 'Não Informado' },
  { value: 'PERSONALIZADO', label: 'Valor Personalizado' },
];

export const PACOTE_OPTIONS: { value: Pacote; label: string }[] = [
  { value: 'COMPLETO', label: 'Completo' },
  { value: 'TRAFEGO_E_CRIATIVOS', label: 'Tráfego e Criativos' },
  { value: 'ATENDIMENTO', label: 'Atendimento' },
  { value: 'TRAFEGO', label: 'Tráfego' },
  { value: 'COMPLETO_NOVA_ERA', label: 'Completo Nova Era' },
  { value: 'TRAFEGO_ARTES_IA', label: 'Tráfego&Artes + IA' },
  { value: 'TRAFEGO_CONSULTORIA', label: 'Tráfego+Consultoria' },
  { value: 'IA', label: 'IA' },
  { value: 'TRAFEGO_ROTEIRO', label: 'Trafego+Roteiro' },
  { value: 'TRAFEGO_IA', label: 'Tráfego+IA' },
];

export const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: 'MENSAL', label: '30 Dias' },
  { value: 'TRIMESTRAL', label: '90 Dias' },
  { value: 'SEMESTRAL', label: '180 Dias' },
  { value: 'TAXA_INTERESSE', label: 'Taxa de Interesse' },
];

export const PAGADOR_ANUNCIO_OPTIONS: { value: PagadorAnuncio; label: string }[] = [
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'GREAT', label: 'Great' },
];

export const INDICACAO_OPTIONS: { value: string; label: string }[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
];

export const LOST_REASON_OPTIONS = [
  'Sem orçamento',
  'Não respondeu',
  'Fechou com concorrente',
  'Não faz sentido agora',
  'Outro',
];

interface CommercialContextType {
  pipelineClients: PipelineClient[];
  salesGoals: SalesGoal[];
  currentGoal: SalesGoal | null;
  paymentReminders: PaymentReminder[];
  criativos: string[];
  nextTeamInQueue: Equipe;
  sdrGoals: SDRGoal[];
  getNextTeamLabel: () => string;
  addPipelineClient: (client: Omit<PipelineClient, 'id' | 'createdByUserId'>, skipAgendamentoSync?: boolean) => void;
  updatePipelineClient: (id: string, data: Partial<PipelineClient>) => void;
  movePipelineClient: (id: string, newStage: PipelineStage, lostReason?: string, extraData?: Partial<PipelineClient>) => void;
  deletePipelineClient: (id: string) => void;
  setSalesGoal: (month: string, goalValue: number) => void;
  setSDRGoal: (agendador: Agendador, month: string, goalCount: number) => void;
  dismissReminder: (id: string) => void;
  addCriativo: (criativo: string) => void;
  updateCriativo: (oldCriativo: string, newCriativo: string) => void;
  deleteCriativo: (criativo: string) => void;
  getGoalStats: () => {
    totalSold: number;
    remaining: number;
    projection: number;
    dailyNeeded: number;
    percentAchieved: number;
    daysRemaining: number;
    totalBusinessDays: number;
    businessDaysPassed: number;
    status: 'ok' | 'risk' | 'danger';
  };
  getPipelineStats: () => {
    totalValue: number;
    negotiationValue: number;
    closedValue: number;
    conversionRate: number;
    averageTicket: number;
    leadCount: number;
  };
  getStatsByVendedor: (vendedor: Vendedor) => {
    totalLeads: number;
    closedValue: number;
    closedCount: number;
    conversionRate: number;
  };
  getSDRStats: (agendador: Agendador, month?: string) => {
    closedCount: number;
    goalCount: number;
    percentAchieved: number;
  };
}

const CommercialContext = createContext<CommercialContextType | undefined>(undefined);

const currentMonth = new Date().toISOString().slice(0, 7);

export function CommercialProvider({ children }: { children: React.ReactNode }) {
  const authContext = useAuthSafe();
  const user = authContext?.user;
  const logActivity = authContext?.logActivity ?? (() => {});
  const queryClient = useQueryClient();

  // Fetch pipeline clients from database
  const { data: dbPipelineClients = [] } = useQuery({
    queryKey: ['pipeline-clients-db'],
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pipeline clients:', error);
        return [];
      }

      return (data || []).map((c: any): PipelineClient => ({
        id: c.id,
        ativo: c.ativo ?? true,
        clientName: c.client_name,
        clinicName: c.clinic_name || c.client_name,
        telefone: c.telefone,
        vendedor: c.vendedor as Vendedor,
        criativo: c.criativo || '',
        equipe: c.equipe as Equipe || 'LIRA',
        faturamento: c.faturamento as Faturamento || 'NAO_INFORMADO',
        faturamentoPersonalizado: c.faturamento_personalizado || undefined,
        podeInvestir: c.pode_investir as PodeInvestir | undefined,
        pacote: c.pacote as Pacote || 'COMPLETO',
        periodo: c.periodo as Periodo || 'MENSAL',
        indicacao: c.indicacao,
        entrada: Number(c.entrada) || 0,
        dataEntrada: c.data_entrada ? new Date(c.data_entrada) : new Date(c.created_at),
        stage: c.stage as PipelineStage || 'NOVO',
        lastStageChange: c.last_stage_change ? new Date(c.last_stage_change) : undefined,
        lostReason: c.lost_reason,
        noShowReason: c.no_show_reason,
        notes: c.notes,
        agendadoPor: c.agendado_por as Agendador,
        agendadoVia: c.agendado_via || undefined,
        pagadorAnuncio: c.pagador_anuncio as PagadorAnuncio,
        temSocio: c.tem_socio as TemSocio,
        temMkt: c.tem_mkt as TemMkt,
        temSecretaria: c.tem_secretaria as TemSecretaria,
        salaoOuClinica: c.salao_ou_clinica as SalaoOuClinica,
        meetingDate: c.meeting_date,
        meetingTime: c.meeting_time,
        createdByUserId: c.created_by_user_id || '',
        followupDone: c.followup_done ?? false,
        createdAt: c.created_at ? new Date(c.created_at) : undefined,
      }));
    },
  });

  // Fetch sales goals from database
  const { data: dbSalesGoals = [] } = useQuery({
    queryKey: ['commercial-goals-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_goals')
        .select('*')
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching commercial goals:', error);
        return [];
      }

      return (data || []).map((g: any): SalesGoal => ({
        id: g.id,
        month: g.month,
        goalValue: Number(g.goal_value) || 100000,
        currentValue: 0,
        createdByUserId: g.created_by_user_id || '',
        createdAt: new Date(g.created_at),
      }));
    },
  });

  // Fetch SDR goals from database
  const { data: dbSDRGoals = [] } = useQuery({
    queryKey: ['sdr-goals-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_goals')
        .select('*')
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching SDR goals:', error);
        return [];
      }

      return (data || []).map((g: any): SDRGoal => ({
        id: g.id,
        agendador: g.agendador as Agendador,
        month: g.month,
        goalCount: g.goal_count,
        createdAt: new Date(g.created_at),
      }));
    },
  });

  // Fetch criativos from database
  const { data: dbCriativos = [] } = useQuery({
    queryKey: ['criativos-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching criativos:', error);
        return [];
      }

      return (data || []).map((c: any) => c.name as string);
    },
  });

  // Fetch payment reminders from database
  const { data: dbPaymentReminders = [] } = useQuery({
    queryKey: ['payment-reminders-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('dismissed', false)
        .order('payment_deadline', { ascending: true });

      if (error) {
        console.error('Error fetching payment reminders:', error);
        return [];
      }

      return (data || []).map((r: any): PaymentReminder => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name,
        clinicName: r.clinic_name || r.client_name,
        dealValue: Number(r.deal_value) || 0,
        paymentDeadline: new Date(r.payment_deadline),
        dismissed: r.dismissed,
        createdAt: new Date(r.created_at),
      }));
    },
  });

  // Fetch team pointer from database
  const { data: dbTeamPointer = TEAM_IDS.EQUIPE_7 } = useQuery({
    queryKey: ['commercial-settings-team-pointer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_settings')
        .select('setting_value')
        .eq('setting_key', 'last_team_pointer')
        .single();

      if (error) {
        console.error('Error fetching team pointer:', error);
        return TEAM_IDS.EQUIPE_7;
      }

      return data?.setting_value || TEAM_IDS.EQUIPE_7;
    },
  });

  // Use database data
  const pipelineClients = dbPipelineClients;
  const salesGoals = dbSalesGoals;
  const sdrGoals = dbSDRGoals;
  const criativos = dbCriativos;
  const paymentReminders = dbPaymentReminders;
  const lastTeamPointer = dbTeamPointer;

  // Calculate next team in queue (opposite of last assigned) - Round-robin between Equipe 7 and Tropa de Elite
  const nextTeamInQueue: string = lastTeamPointer === TEAM_IDS.TROPA_DE_ELITE 
    ? TEAM_IDS.EQUIPE_7 
    : TEAM_IDS.TROPA_DE_ELITE;

  const getNextTeamLabel = useCallback(() => {
    const team = EQUIPE_OPTIONS.find(e => e.value === nextTeamInQueue);
    return team?.label || 'Equipe';
  }, [nextTeamInQueue]);

  const currentGoal = salesGoals.find(g => g.month === currentMonth) || null;

  // Update team pointer in database
  const updateTeamPointer = useCallback(async (newPointer: Equipe) => {
    try {
      await supabase
        .from('commercial_settings')
        .upsert({
          setting_key: 'last_team_pointer',
          setting_value: newPointer,
          updated_at: new Date().toISOString(),
          updated_by_user_id: user?.id,
        }, { onConflict: 'setting_key' });

      queryClient.invalidateQueries({ queryKey: ['commercial-settings-team-pointer'] });
    } catch (error) {
      console.error('Error updating team pointer:', error);
    }
  }, [user, queryClient]);

  // Mutex to prevent concurrent addPipelineClient calls from creating duplicates
  const addPipelineClientLockRef = useRef(false);

  const addPipelineClient = useCallback(async (client: Omit<PipelineClient, 'id' | 'createdByUserId'>, skipAgendamentoSync = false) => {
    // Mutex guard — wait if another call is in progress
    if (addPipelineClientLockRef.current) {
      console.log('[Pipeline] addPipelineClient already in progress, skipping to prevent duplicate');
      return;
    }
    addPipelineClientLockRef.current = true;

    try {
      // Normalize phone to WhatsApp format (55XXXXXXXXXXX)
      const normalizedPhone = client.telefone ? formatPhoneForWhatsApp(client.telefone) : undefined;

      // Check for existing pipeline client with same phone to prevent duplicates
      if (normalizedPhone) {
        // Extract last 8 digits for suffix-based matching (catches formatting variations)
        const phoneDigits = normalizedPhone.replace(/\D/g, '');
        const last8 = phoneDigits.slice(-8);
        
        // Use SQL suffix match for robust dedup — matches any phone ending in the same 8 digits
        const { data: existing } = await supabase
          .from('pipeline_clients')
          .select('id')
          .not('telefone', 'is', null)
          .filter('telefone', 'like', `%${last8}`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          console.log(`[Pipeline] Client with phone ending in ${last8} already exists (id: ${existing.id}), skipping duplicate creation`);
          queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
          return;
        }
      }

      const { data: newClient, error } = await supabase
        .from('pipeline_clients')
        .insert({
          client_name: client.clientName,
          clinic_name: client.clinicName || client.clientName,
          telefone: normalizedPhone,
          vendedor: client.vendedor,
          criativo: client.criativo,
          equipe: client.equipe,
          faturamento: client.faturamento,
          faturamento_personalizado: client.faturamentoPersonalizado,
          pode_investir: client.podeInvestir,
          pacote: client.pacote,
          periodo: client.periodo,
          indicacao: client.indicacao,
          entrada: client.entrada,
          data_entrada: client.dataEntrada?.toISOString() || new Date().toISOString(),
          stage: client.stage,
          agendado_por: client.agendadoPor,
          pagador_anuncio: client.pagadorAnuncio,
          tem_socio: client.temSocio,
          tem_mkt: client.temMkt,
          tem_secretaria: client.temSecretaria,
          salao_ou_clinica: client.salaoOuClinica,
          meeting_date: client.meetingDate,
          meeting_time: client.meetingTime,
          notes: client.notes,
          ativo: true,
          agendado_via: client.agendadoVia || null,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating pipeline client:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });

      // Update team pointer after adding client
      await updateTeamPointer(client.equipe);
      logActivity('CLIENT_CREATED', 'Pipeline', newClient.id, `Cliente ${client.clientName} adicionado ao pipeline`);
      
      // Sync to Agendamento (if not already coming from there)
      if (!skipAgendamentoSync) {
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        
        const faturamentoMap: Record<Faturamento, string> = {
          '0_A_15K': '0_A_15K',
          '15K_A_30K': '15K_A_30K',
          '30K_A_50K': '30K_A_50K',
          '50K_A_100K': '50K_A_100K',
          '100K_PLUS': '100K_PLUS',
          'NAO_INFORMADO': '0_A_15K',
          'PERSONALIZADO': '30K_A_50K',
        };
        
        // Updated to new aligned status values (1:1 with pipeline)
        const statusMap: Record<PipelineStage, string> = {
          'NOVO': 'NOVO_LEAD',
          'NO_SHOW': 'NO_SHOW',
          'TAXA_INTERESSE': 'TAXA_INTERESSE',
          'NEGOCIACAO': 'NEGOCIACAO',
          'PERDIDO': 'PERDIDO',
          'FECHADO': 'FECHADO',
        };
        
        const mapTemSocio = (value?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' => {
          return value === 'SIM' ? 'SIM' : 'NAO';
        };
        const mapTemMkt = (value?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' => {
          return value === 'SIM' ? 'SIM' : 'NAO';
        };
        const mapTemSecretaria = (value?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' => {
          return value === 'SIM' ? 'SIM' : 'NAO';
        };

        // Check for existing agendamento lead with same phone before inserting
        let agendamentoExists = false;
        if (normalizedPhone) {
          const last8 = normalizedPhone.replace(/\D/g, '').slice(-8);

          const { data: existingAgendamento } = await supabase
            .from('agendamento_leads')
            .select('id')
            .filter('telefone', 'like', `%${last8}`)
            .limit(1)
            .maybeSingle();

          if (existingAgendamento) {
            agendamentoExists = true;
            console.log(`[Pipeline→Agendamento] Lead with phone ending in ${last8} already exists, skipping duplicate`);
          }
        }

        if (!agendamentoExists) {
          await supabase.from('agendamento_leads').insert({
            data: dateStr,
            nome: client.clientName,
            telefone: normalizedPhone || '',
            horario: 'MANHA',
            tem_socio: mapTemSocio(client.temSocio),
            tem_mkt: mapTemMkt(client.temMkt),
            tem_secretaria: mapTemSecretaria(client.temSecretaria),
            salao_ou_clinica: client.salaoOuClinica || 'NAO_INFORMADO',
            faturamento: faturamentoMap[client.faturamento] || '0_A_15K',
            funil: client.criativo || 'NÃO IDENTIFICADO',
            status: statusMap[client.stage] || 'ENTRAR EM CONTATO',
            created_by_user_id: user?.id,
            agendado_via: (client as any).agendadoVia || null,
          });
        }

        // Create agenda event if phone number is provided (independent of agendamento existence)
        if (normalizedPhone) {
          const last8Agenda = normalizedPhone.replace(/\D/g, '').slice(-8);

          const { data: existingEvent } = await supabase
            .from('agenda_events')
            .select('id')
            .filter('client_phone', 'like', `%${last8Agenda}`)
            .limit(1)
            .maybeSingle();

          if (!existingEvent) {
            const eventDate = client.meetingDate || (() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toISOString().split('T')[0];
            })();
            const eventTime = client.meetingTime ? `${client.meetingTime}:00` : '10:00:00';
            
            await supabase.from('agenda_events').insert({
              title: `Reunião com ${client.clientName}`,
              description: `Lead do Pipeline - ${client.criativo || 'Sem criativo'}`,
              client_name: client.clientName,
              client_phone: normalizedPhone,
              event_date: eventDate,
              event_time: eventTime,
              duration_minutes: 60,
              color: '#3b82f6',
              created_by_user_id: user?.id,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error syncing to agendamento:', error);
    } finally {
      addPipelineClientLockRef.current = false;
    }
  }, [user, logActivity, queryClient, updateTeamPointer]);

  const updatePipelineClient = useCallback(async (id: string, data: Partial<PipelineClient>) => {
    console.log('updatePipelineClient called with:', { id, data });
    try {
      const updateData: Record<string, any> = {};
      if (data.clientName !== undefined) updateData.client_name = data.clientName;
      if (data.clinicName !== undefined) updateData.clinic_name = data.clinicName;
      if (data.telefone !== undefined) updateData.telefone = data.telefone;
      if (data.vendedor !== undefined) updateData.vendedor = data.vendedor;
      if (data.criativo !== undefined) updateData.criativo = data.criativo;
      if (data.equipe !== undefined) updateData.equipe = data.equipe;
      if (data.faturamento !== undefined) updateData.faturamento = data.faturamento;
      if (data.faturamentoPersonalizado !== undefined) updateData.faturamento_personalizado = data.faturamentoPersonalizado;
      if (data.pacote !== undefined) updateData.pacote = data.pacote;
      if (data.periodo !== undefined) updateData.periodo = data.periodo;
      if (data.indicacao !== undefined) updateData.indicacao = data.indicacao;
      if (data.entrada !== undefined) updateData.entrada = data.entrada;
      if (data.stage !== undefined) updateData.stage = data.stage;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.agendadoPor !== undefined) updateData.agendado_por = data.agendadoPor;
      if (data.pagadorAnuncio !== undefined) updateData.pagador_anuncio = data.pagadorAnuncio;
      if (data.temSocio !== undefined) updateData.tem_socio = data.temSocio;
      if (data.temMkt !== undefined) updateData.tem_mkt = data.temMkt;
      if (data.temSecretaria !== undefined) updateData.tem_secretaria = data.temSecretaria;
      if (data.salaoOuClinica !== undefined) updateData.salao_ou_clinica = data.salaoOuClinica;
      if (data.meetingDate !== undefined) updateData.meeting_date = data.meetingDate;
      if (data.meetingTime !== undefined) updateData.meeting_time = data.meetingTime;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;
      if (data.lostReason !== undefined) updateData.lost_reason = data.lostReason;
      if (data.noShowReason !== undefined) updateData.no_show_reason = data.noShowReason;
      if (data.followupDone !== undefined) updateData.followup_done = data.followupDone;
      if (data.agendadoVia !== undefined) updateData.agendado_via = data.agendadoVia;

      console.log('Supabase update payload:', updateData);

      const { data: updatedData, error } = await supabase
        .from('pipeline_clients')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('Supabase update result:', { updatedData, error });

      if (error) {
        console.error('Error updating pipeline client:', error);
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      logActivity('CLIENT_UPDATED', 'Pipeline', id, 'Cliente atualizado');
    } catch (error) {
      console.error('Error updating pipeline client:', error);
    }
  }, [logActivity, queryClient]);

  const movePipelineClient = useCallback(async (id: string, newStage: PipelineStage, lostReason?: string, extraData?: Partial<PipelineClient>) => {
    const client = pipelineClients.find(c => c.id === id);
    const clientWithExtras = client ? { ...client, ...extraData } : null;
    
    try {
      const updateData: Record<string, any> = {
        stage: newStage,
        last_stage_change: new Date().toISOString(),
      };

      if (newStage === 'PERDIDO') {
        if (lostReason) updateData.lost_reason = lostReason;
        updateData.ativo = false;
      } else {
        // Ensure ativo is true when moving to any non-PERDIDO stage (especially FECHADO)
        updateData.ativo = true;
      }

      if (extraData) {
        if (extraData.vendedor !== undefined) updateData.vendedor = extraData.vendedor;
        if (extraData.pacote !== undefined) updateData.pacote = extraData.pacote;
        if (extraData.periodo !== undefined) updateData.periodo = extraData.periodo;
        if (extraData.entrada !== undefined) updateData.entrada = extraData.entrada;
        if (extraData.pagadorAnuncio !== undefined) updateData.pagador_anuncio = extraData.pagadorAnuncio;
        if (extraData.noShowReason !== undefined) updateData.no_show_reason = extraData.noShowReason;
        if (extraData.equipe !== undefined) updateData.equipe = extraData.equipe;
        if (extraData.clinicName !== undefined) updateData.clinic_name = extraData.clinicName;
      }

      const { error } = await supabase
        .from('pipeline_clients')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error moving pipeline client:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      
      logActivity('CLIENT_MOVED', 'Pipeline', id, `Cliente movido para ${STAGE_LABELS[newStage]}`);
    } catch (error) {
      console.error('Error in movePipelineClient:', error);
    }
  }, [pipelineClients, logActivity, queryClient, updateTeamPointer]);

  const deletePipelineClient = useCallback(async (id: string) => {
    const client = pipelineClients.find(c => c.id === id);
    
    try {
      const { error } = await supabase
        .from('pipeline_clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting pipeline client:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      logActivity('CLIENT_DELETED', 'Pipeline', id, `Cliente ${client?.clientName} removido`);
      
      // Also delete corresponding agenda events
      if (client) {
        if (client.telefone) {
          await supabase
            .from('agenda_events')
            .delete()
            .eq('client_phone', client.telefone);
        }
        await supabase
          .from('agenda_events')
          .delete()
          .eq('client_name', client.clientName);
      }
    } catch (error) {
      console.error('Error deleting pipeline client:', error);
    }
  }, [pipelineClients, logActivity, queryClient]);

  const setSalesGoal = useCallback(async (month: string, goalValue: number) => {
    try {
      const { data: existing } = await supabase
        .from('commercial_goals')
        .select('id')
        .eq('month', month)
        .single();
      
      if (existing) {
        await supabase
          .from('commercial_goals')
          .update({ goal_value: goalValue, updated_at: new Date().toISOString() })
          .eq('month', month);
        logActivity('GOAL_UPDATED', 'SalesGoal', existing.id, `Meta atualizada para R$ ${goalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        const { data: newGoal } = await supabase
          .from('commercial_goals')
          .insert({ month, goal_value: goalValue, created_by_user_id: user?.id })
          .select()
          .single();
        if (newGoal) {
          logActivity('GOAL_CREATED', 'SalesGoal', newGoal.id, `Meta de R$ ${goalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} definida para ${month}`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['commercial-goals-db'] });
    } catch (error) {
      console.error('Error syncing goal to database:', error);
    }
  }, [user, logActivity, queryClient]);

  const setSDRGoal = useCallback(async (agendador: Agendador, month: string, goalCount: number) => {
    try {
      const { data: existing } = await supabase
        .from('sdr_goals')
        .select('id')
        .eq('agendador', agendador)
        .eq('month', month)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('sdr_goals')
          .update({ goal_count: goalCount, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) {
          console.error('Error updating SDR goal:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('sdr_goals')
          .insert({ agendador, month, goal_count: goalCount, created_by_user_id: user?.id });
        
        if (error) {
          console.error('Error inserting SDR goal:', error);
          throw error;
        }
      }
      
      // Invalidate and immediately refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['sdr-goals-db'] });
      await queryClient.refetchQueries({ queryKey: ['sdr-goals-db'] });
    } catch (error) {
      console.error('Error syncing SDR goal to database:', error);
      throw error; // Re-throw so caller can handle
    }
  }, [user, queryClient]);

  const dismissReminder = useCallback(async (id: string) => {
    try {
      await supabase
        .from('payment_reminders')
        .update({ dismissed: true, dismissed_by_user_id: user?.id })
        .eq('id', id);
      
      queryClient.invalidateQueries({ queryKey: ['payment-reminders-db'] });
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  }, [user, queryClient]);

  const addCriativo = useCallback(async (criativo: string) => {
    const upperCriativo = criativo.toUpperCase();
    if (!criativos.includes(upperCriativo)) {
      try {
        await supabase
          .from('criativos')
          .insert({ name: upperCriativo, created_by_user_id: user?.id });
        
        queryClient.invalidateQueries({ queryKey: ['criativos-db'] });
      } catch (error) {
        console.error('Error adding criativo:', error);
      }
    }
  }, [criativos, user, queryClient]);

  const updateCriativo = useCallback(async (oldCriativo: string, newCriativo: string) => {
    try {
      // Update the criativo name
      await supabase
        .from('criativos')
        .update({ name: newCriativo.toUpperCase(), updated_at: new Date().toISOString() })
        .eq('name', oldCriativo);
      
      // Update all pipeline clients that use this criativo
      await supabase
        .from('pipeline_clients')
        .update({ criativo: newCriativo.toUpperCase() })
        .eq('criativo', oldCriativo);
      
      queryClient.invalidateQueries({ queryKey: ['criativos-db'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
    } catch (error) {
      console.error('Error updating criativo:', error);
    }
  }, [queryClient]);

  const deleteCriativo = useCallback(async (criativo: string) => {
    try {
      await supabase
        .from('criativos')
        .update({ is_active: false })
        .eq('name', criativo);
      
      queryClient.invalidateQueries({ queryKey: ['criativos-db'] });
    } catch (error) {
      console.error('Error deleting criativo:', error);
    }
  }, [queryClient]);

  const getGoalStats = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const countBusinessDays = (startDate: Date, endDate: Date): number => {
      let count = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    };
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const today = new Date(year, month, now.getDate());
    
    const totalBusinessDays = countBusinessDays(startOfMonth, endOfMonth);
    const businessDaysPassed = countBusinessDays(startOfMonth, today);
    const businessDaysRemaining = countBusinessDays(
      new Date(year, month, now.getDate() + 1), 
      endOfMonth
    );
    
    // Use lastStageChange (when moved to FECHADO) instead of dataEntrada (when entered pipeline)
    const closedThisMonth = pipelineClients.filter(c => {
      if (c.stage !== 'FECHADO') return false;
      const closeDate = c.lastStageChange ? new Date(c.lastStageChange) : new Date(c.dataEntrada);
      return closeDate >= startOfMonth && closeDate <= endOfMonth;
    });
    const totalSold = closedThisMonth.reduce((sum, c) => sum + c.entrada, 0);
    
    const goalValue = currentGoal?.goalValue || 100000;
    const remaining = Math.max(0, goalValue - totalSold);
    const dailyAverage = businessDaysPassed > 0 ? totalSold / businessDaysPassed : 0;
    const projection = dailyAverage * totalBusinessDays;
    const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : remaining;
    const percentAchieved = goalValue > 0 ? (totalSold / goalValue) * 100 : 0;
    
    const expectedProgress = (businessDaysPassed / totalBusinessDays) * 100;
    let status: 'ok' | 'risk' | 'danger' = 'ok';
    if (percentAchieved < expectedProgress * 0.8) {
      status = 'danger';
    } else if (percentAchieved < expectedProgress) {
      status = 'risk';
    }

    return {
      totalSold,
      remaining,
      projection,
      dailyNeeded,
      percentAchieved,
      daysRemaining: businessDaysRemaining,
      totalBusinessDays,
      businessDaysPassed,
      status,
    };
  }, [pipelineClients, currentGoal]);

  const getPipelineStats = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const activeClients = pipelineClients.filter(c => c.stage !== 'PERDIDO' && c.ativo);
    const negotiationClients = pipelineClients.filter(c => c.stage === 'NEGOCIACAO' && c.ativo);
    
    // Fechados no mês - inclui TAXA_INTERESSE para faturamento/comissão
    // Use lastStageChange (when moved to FECHADO) instead of dataEntrada (when entered pipeline)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const closedClientsThisMonth = pipelineClients.filter(c => {
      if (c.stage !== 'FECHADO') return false;
      const closeDate = c.lastStageChange ? new Date(c.lastStageChange) : new Date(c.dataEntrada);
      return closeDate >= startOfMonth && closeDate <= endOfMonth;
    });
    
    // Para taxa de conversão e número de contratos - exclui TAXA_INTERESSE
    const allClosedClientsForConversion = pipelineClients.filter(c => 
      c.stage === 'FECHADO' && c.periodo !== 'TAXA_INTERESSE'
    );
    
    // Para ticket médio - exclui TAXA_INTERESSE
    const closedClientsForTicket = pipelineClients.filter(c => 
      c.stage === 'FECHADO' && c.periodo !== 'TAXA_INTERESSE'
    );
    const closedValueForTicket = closedClientsForTicket.reduce((sum, c) => sum + c.entrada, 0);
    
    const totalValue = activeClients.reduce((sum, c) => sum + c.entrada, 0);
    const negotiationValue = negotiationClients.reduce((sum, c) => sum + c.entrada, 0);
    // closedValue inclui TAXA_INTERESSE para faturamento
    const closedValue = closedClientsThisMonth.reduce((sum, c) => sum + c.entrada, 0);
    
    // Taxa de conversão e contagem de contratos excluem TAXA_INTERESSE
    const totalEntries = pipelineClients.filter(c => c.ativo && c.periodo !== 'TAXA_INTERESSE').length;
    const closedCount = allClosedClientsForConversion.length;
    const conversionRate = totalEntries > 0 ? (closedCount / totalEntries) * 100 : 0;
    
    const averageTicket = closedClientsForTicket.length > 0 
      ? closedValueForTicket / closedClientsForTicket.length 
      : 0;
    
    const leadCount = pipelineClients.filter(c => 
      c.stage !== 'FECHADO' && c.stage !== 'PERDIDO' && c.ativo
    ).length;

    return {
      totalValue,
      negotiationValue,
      closedValue,
      conversionRate,
      averageTicket,
      leadCount,
    };
  }, [pipelineClients]);

  const getStatsByVendedor = useCallback((vendedor: Vendedor) => {
    const vendedorClients = pipelineClients.filter(c => c.vendedor === vendedor);
    const closedClients = vendedorClients.filter(c => c.stage === 'FECHADO');
    
    const totalLeads = vendedorClients.length;
    const closedValue = closedClients.reduce((sum, c) => sum + c.entrada, 0);
    const closedCount = closedClients.length;
    const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0;

    return {
      totalLeads,
      closedValue,
      closedCount,
      conversionRate,
    };
  }, [pipelineClients]);

  const getSDRStats = useCallback((agendador: Agendador, month?: string) => {
    const targetMonth = month || currentMonth;
    // Use UTC dates to avoid timezone issues
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    
    // For SDR stats, count by closing date (last_stage_change), not entry date
    const closedLeads = pipelineClients.filter(c => {
      if (c.agendadoPor !== agendador || c.stage !== 'FECHADO') return false;
      
      // Use last_stage_change (closing date) for filtering
      if (!c.lastStageChange) return false;
      const closingDate = c.lastStageChange instanceof Date ? c.lastStageChange : new Date(c.lastStageChange);
      
      return closingDate >= monthStart && closingDate <= monthEnd;
    });
    
    const closedCount = closedLeads.length;
    const goalData = sdrGoals.find(g => g.agendador === agendador && g.month === targetMonth);
    const goalCount = goalData?.goalCount || 10;
    const percentAchieved = goalCount > 0 ? (closedCount / goalCount) * 100 : 0;

    return {
      closedCount,
      goalCount,
      percentAchieved,
    };
  }, [pipelineClients, sdrGoals, currentMonth]);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('commercial-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_clients' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_goals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['commercial-goals-db'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sdr_goals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sdr-goals-db'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['criativos-db'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_reminders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['payment-reminders-db'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['commercial-settings-team-pointer'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <CommercialContext.Provider value={{
      pipelineClients,
      salesGoals,
      currentGoal,
      paymentReminders,
      criativos,
      nextTeamInQueue,
      sdrGoals,
      getNextTeamLabel,
      addPipelineClient,
      updatePipelineClient,
      movePipelineClient,
      deletePipelineClient,
      setSalesGoal,
      setSDRGoal,
      dismissReminder,
      addCriativo,
      updateCriativo,
      deleteCriativo,
      getGoalStats,
      getPipelineStats,
      getStatsByVendedor,
      getSDRStats,
    }}>
      {children}
    </CommercialContext.Provider>
  );
}

export function useCommercial() {
  const context = useContext(CommercialContext);
  if (context === undefined) {
    throw new Error('useCommercial must be used within a CommercialProvider');
  }
  return context;
}

export function useCommercialSafe() {
  return useContext(CommercialContext);
}
