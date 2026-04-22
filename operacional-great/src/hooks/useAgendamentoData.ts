import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { agendamentoToPipeline } from './usePipelineAgendamentoSync';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

export interface AgendamentoLead {
  id: string;
  data: string;
  nome: string;
  telefone: string;
  horario: 'MANHA' | 'TARDE' | 'NOITE';
  horario_especifico?: string; // HH:MM format for specific time
  tem_socio: 'SIM' | 'NAO';
  tem_mkt: 'SIM' | 'NAO';
  tem_secretaria: 'SIM' | 'NAO';
  salao_ou_clinica: 'SALAO' | 'CLINICA' | 'NAO_INFORMADO';
  faturamento: '0_A_15K' | '15K_A_30K' | '30K_A_50K' | '50K_A_100K' | '100K_PLUS';
  pode_investir?: 'SIM' | 'NAO' | null;
  agendado_via?: string | null;
  funil: string;
  status: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Enriched from agenda_events
  agenda_event_date?: string | null; // YYYY-MM-DD format from agenda
  agenda_event_time?: string | null; // HH:MM:SS format from agenda
}

export type AgendamentoLeadInsert = Omit<AgendamentoLead, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'> & { horario_especifico?: string; pode_investir?: 'SIM' | 'NAO' | null };
export type AgendamentoLeadUpdate = Partial<AgendamentoLeadInsert>;

// Display labels for dropdowns
export const HORARIO_OPTIONS = [
  { value: 'MANHA', label: 'MANHÃ' },
  { value: 'TARDE', label: 'TARDE' },
  { value: 'NOITE', label: 'NOITE' },
] as const;

export const TEM_SOCIO_OPTIONS = [
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
] as const;

export const TEM_MKT_OPTIONS = [
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
] as const;

export const TEM_SECRETARIA_OPTIONS = [
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
] as const;

export const SALAO_OU_CLINICA_OPTIONS = [
  { value: 'SALAO', label: 'SALÃO' },
  { value: 'CLINICA', label: 'CLÍNICA' },
  { value: 'NAO_INFORMADO', label: 'NÃO INFORMADO' },
] as const;

export const FATURAMENTO_OPTIONS = [
  { value: '0_A_15K', label: '0 - 15K' },
  { value: '15K_A_30K', label: '15K - 30K' },
  { value: '30K_A_50K', label: '30K - 50K' },
  { value: '50K_A_100K', label: '50K - 100K' },
  { value: '100K_PLUS', label: '100K +' },
] as const;

export const FUNIL_OPTIONS = [
  'INSTAGRAM',
  'CAIXA DE PERGUNT.',
  'IA',
  'PROMOÇÃO',
  'ATENÇÃO DONA',
  'JALECO',
  'NÃO IDENTIFICADO',
  'INDICAÇÃO',
  'HANNA TRA/ART',
  'RUFO',
  'SATIS-EVENTO',
  'FERRARI',
  'EVENTO WEBINARIO',
  'UM PROCEDIMENTO',
  'FUNDO + CAIXINHA',
  'BLACK FRIDAY',
  'ALANA + CAIXINHA',
  'FORMULARIO',
  'PROGRESSIVA',
  'CAIXINHA SONHO',
  'BOTOX',
  'HARMONIZAÇÃO',
  'MECHA/LUZES',
  'LABIAL',
  'LIPO DE PAPADA',
  'CAIXINHA SALÃO',
  'MELASMA',
  'VOU COLOCAR/HAN',
  'REJUVENESC/INTIMC',
  'CAIXINHA BOTOX',
  'MECHAS/LUZES HAI',
] as const;

// Status options matching Pipeline stages
export const STATUS_OPTIONS = [
  { value: 'NOVO_LEAD', label: 'Novo Lead', pipelineStage: 'NOVO' },
  { value: 'NO_SHOW', label: 'No Show', pipelineStage: 'NO_SHOW' },
  { value: 'TAXA_INTERESSE', label: 'Taxa de Interesse', pipelineStage: 'TAXA_INTERESSE' },
  { value: 'NEGOCIACAO', label: 'Negociação', pipelineStage: 'NEGOCIACAO' },
  { value: 'PERDIDO', label: 'Perdido', pipelineStage: 'PERDIDO' },
  { value: 'FECHADO', label: 'Fechado', pipelineStage: 'FECHADO' },
] as const;

export type AgendamentoStatus = typeof STATUS_OPTIONS[number]['value'];

// Map pipeline stage to agendamento status
export const PIPELINE_STAGE_TO_STATUS: Record<string, AgendamentoStatus> = {
  'NOVO': 'NOVO_LEAD',
  'NO_SHOW': 'NO_SHOW',
  'TAXA_INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
};

export function useAgendamentoData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commercial = useCommercialSafe();

  // Fetch all leads enriched with agenda event data
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['agendamento-leads'],
    queryFn: async () => {
      // Fetch agendamento leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('agendamento_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch all agenda events to enrich leads with actual meeting times
      const { data: agendaEvents, error: agendaError } = await supabase
        .from('agenda_events')
        .select('client_phone, event_date, event_time')
        .order('event_date', { ascending: false });

      if (agendaError) {
        console.error('Error fetching agenda events:', agendaError);
        // Return leads without enrichment if agenda fetch fails
        return leadsData as AgendamentoLead[];
      }

      // Create a map of phone -> latest agenda event (by event_date)
      const phoneToLatestEvent = new Map<string, { event_date: string; event_time: string }>();
      agendaEvents?.forEach(event => {
        if (!event.client_phone) return;
        const existing = phoneToLatestEvent.get(event.client_phone);
        // Keep the latest event_date for each phone
        if (!existing || event.event_date > existing.event_date) {
          phoneToLatestEvent.set(event.client_phone, {
            event_date: event.event_date,
            event_time: event.event_time,
          });
        }
      });

      // Enrich leads with agenda data
      const enrichedLeads = leadsData.map(lead => {
        const agendaEvent = phoneToLatestEvent.get(lead.telefone);
        return {
          ...lead,
          agenda_event_date: agendaEvent?.event_date || null,
          agenda_event_time: agendaEvent?.event_time || null,
        };
      });

      return enrichedLeads as AgendamentoLead[];
    },
  });

  // Create lead
  const createLead = useMutation({
    mutationFn: async (lead: AgendamentoLeadInsert) => {
      // Format phone number to WhatsApp standard
      const formattedPhone = formatPhoneForWhatsApp(lead.telefone);

      // Check for existing lead with same phone to prevent duplicates (suffix matching)
      const phoneDigits = formattedPhone.replace(/\D/g, '');
      const last8 = phoneDigits.slice(-8);

      // Also try matching with fewer digits for short numbers
      const last7 = phoneDigits.slice(-7);

      const { data: existingLeads } = await supabase
        .from('agendamento_leads')
        .select('id, nome, telefone, data, status')
        .or(`telefone.like.%${last8},telefone.like.%${last7}`)
        .limit(5);

      // Find best match by comparing last 8 digits
      const matchedLead = existingLeads?.find(el => {
        const elDigits = el.telefone.replace(/\D/g, '');
        return elDigits.slice(-8) === last8 || elDigits.slice(-7) === last7;
      });

      if (matchedLead) {
        throw new Error(`DUPLICATE:⚠️ Esse lead já foi cadastrado!\n\nNome: "${matchedLead.nome}"\nData: ${matchedLead.data}\nStatus: ${matchedLead.status}\n\nEdite o lead existente na planilha.`);
      }
      
      const { data, error } = await supabase
        .from('agendamento_leads')
        .insert({
          ...lead,
          telefone: formattedPhone,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Sync to Pipeline (with skipAgendamentoSync=true to prevent loop) — MUST await to prevent race conditions
      if (commercial?.addPipelineClient) {
        const pipelineData = agendamentoToPipeline(
          { ...lead, telefone: formattedPhone, id: data.id, created_at: data.created_at, updated_at: data.updated_at, created_by_user_id: data.created_by_user_id },
          user?.id || '',
          commercial.nextTeamInQueue
        );
        // Add telefone to pipeline data
        await commercial.addPipelineClient({ ...pipelineData, telefone: formattedPhone }, true);
      }
      
      // Create agenda event automatically if phone is provided
      if (formattedPhone && formattedPhone.length >= 12) {
        try {
          // Parse date from lead.data (DD/MM/YYYY format)
          const dateParts = lead.data.split('/');
          let eventDate: string;
          
          if (dateParts.length === 3) {
            // Use the lead's date
            eventDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          } else {
            // Default to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            eventDate = tomorrow.toISOString().split('T')[0];
          }
          
          // Use specific time if provided, otherwise map from horario
          let eventTime: string;
          if (lead.horario_especifico) {
            eventTime = `${lead.horario_especifico}:00`;
          } else {
            const timeMap: Record<string, string> = {
              'MANHA': '10:00:00',
              'TARDE': '14:00:00',
              'NOITE': '19:00:00',
            };
            eventTime = timeMap[lead.horario] || '10:00:00';
          }
          
          await supabase.from('agenda_events').insert({
            title: `Reunião com ${lead.nome}`,
            description: `Lead do Controle de Agendamento\nFunil: ${lead.funil}\nFaturamento: ${lead.faturamento}`,
            client_name: lead.nome,
            client_phone: formattedPhone,
            event_date: eventDate,
            event_time: eventTime,
            duration_minutes: 60,
            color: '#22c55e',
            created_by_user_id: user?.id,
          });
        } catch (agendaError) {
          console.error('Error creating agenda event:', agendaError);
          // Don't fail the main operation
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Lead adicionado com sucesso!');
    },
    onError: (error) => {
      const isDuplicate = error instanceof Error && error.message.startsWith('DUPLICATE:');
      const msg = isDuplicate
        ? error.message.replace('DUPLICATE:', '')
        : 'Erro ao adicionar lead';
      console.error('Error creating lead:', error);
      toast.error(msg, { 
        duration: isDuplicate ? 8000 : 4000,
        style: isDuplicate ? { whiteSpace: 'pre-line' } : undefined,
      });
    },
  });

  // Update lead
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & AgendamentoLeadUpdate) => {
      const { data, error } = await supabase
        .from('agendamento_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // If status changed to "PAGOU TAXA DE INT", move existing lead to NEGOCIACAO in Pipeline
      if (updates.status === 'PAGOU TAXA DE INT' && commercial) {
        const fullLead = data as AgendamentoLead;
        
        // Find existing pipeline client by phone (primary) or name (fallback)
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^55/, '');
        const leadPhone = normalizePhone(fullLead.telefone);
        
        const existingClient = commercial.pipelineClients.find(c => {
          if (c.telefone && leadPhone) {
            const clientPhone = normalizePhone(c.telefone);
            return clientPhone === leadPhone;
          }
          return c.clientName.toLowerCase() === fullLead.nome.toLowerCase();
        });
        
        if (existingClient) {
          // Move existing client to NEGOCIACAO
          commercial.movePipelineClient(existingClient.id, 'NEGOCIACAO');
          toast.success('Lead transferido para Negociação no Pipeline!');
        }
        // Do NOT create new pipeline client here - it should already exist from initial creation
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
    },
    onError: (error) => {
      console.error('Error updating lead:', error);
      toast.error('Erro ao atualizar lead');
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      // First, get the lead to find its phone/name for matching agenda events
      const leadToDelete = leads.find(l => l.id === id);
      
      const { error } = await supabase
        .from('agendamento_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Also delete corresponding agenda events (by phone or name match)
      if (leadToDelete) {
        try {
          // Delete by phone number match
          if (leadToDelete.telefone) {
            await supabase
              .from('agenda_events')
              .delete()
              .eq('client_phone', leadToDelete.telefone);
          }
          // Also delete by exact name match (as fallback)
          await supabase
            .from('agenda_events')
            .delete()
            .eq('client_name', leadToDelete.nome);
        } catch (agendaError) {
          console.error('Error deleting agenda events:', agendaError);
          // Don't fail the main operation
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Lead removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao remover lead');
    },
  });

  // Duplicate lead
  const duplicateLead = useMutation({
    mutationFn: async (lead: AgendamentoLead) => {
      const { id, created_at, updated_at, created_by_user_id, ...leadData } = lead;
      const { data, error } = await supabase
        .from('agendamento_leads')
        .insert({
          ...leadData,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      toast.success('Lead duplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Error duplicating lead:', error);
      toast.error('Erro ao duplicar lead');
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    duplicateLead,
  };
}
