import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSafe } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { normalizePhoneForMatch, getPhoneMatchCandidates } from '@/lib/phoneUtils';
import { PIPELINE_STAGE_TO_STATUS } from './useAgendamentoData';

// Types matching the database schema
export interface PipelineClientDB {
  id: string;
  ativo: boolean | null;
  client_name: string;
  clinic_name: string | null;
  telefone: string | null;
  vendedor: string | null;
  criativo: string | null;
  equipe: string | null;
  faturamento: string | null;
  pacote: string | null;
  periodo: string | null;
  indicacao: string | null;
  entrada: number | null;
  data_entrada: string | null;
  stage: string | null;
  last_stage_change: string | null;
  lost_reason: string | null;
  no_show_reason: string | null;
  notes: string | null;
  agendado_por: string | null;
  pagador_anuncio: string | null;
  tem_socio: string | null;
  tem_mkt: string | null;
  tem_secretaria: string | null;
  meeting_date: string | null;
  meeting_time: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type PipelineClientInsert = Omit<PipelineClientDB, 'id' | 'created_at' | 'updated_at'>;
export type PipelineClientUpdate = Partial<PipelineClientInsert>;

export function usePipelineData() {
  const queryClient = useQueryClient();
  const authContext = useAuthSafe();
  const user = authContext?.user;

  // Fetch all pipeline clients
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['pipeline-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PipelineClientDB[];
    },
  });

  // Create a new pipeline client
  const createClient = useMutation({
    mutationFn: async (client: PipelineClientInsert) => {
      const { data, error } = await supabase
        .from('pipeline_clients')
        .insert({
          ...client,
          created_by_user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating pipeline client:', error);
      toast.error('Erro ao criar lead');
    },
  });

  // Update a pipeline client
  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PipelineClientUpdate }) => {
      const { data: updated, error } = await supabase
        .from('pipeline_clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
    },
    onError: (error) => {
      console.error('Error updating pipeline client:', error);
      toast.error('Erro ao atualizar lead');
    },
  });

  // Delete a pipeline client
  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
      toast.success('Lead removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting pipeline client:', error);
      toast.error('Erro ao remover lead');
    },
  });

  // Move client to a new stage
  const moveClient = useMutation({
    mutationFn: async ({ 
      id, 
      newStage, 
      lostReason,
      noShowReason,
      extraData 
    }: { 
      id: string; 
      newStage: string; 
      lostReason?: string;
      noShowReason?: string;
      extraData?: PipelineClientUpdate;
    }) => {
      const updateData: PipelineClientUpdate = {
        ...extraData,
        stage: newStage,
        last_stage_change: new Date().toISOString(),
      };

      if (newStage === 'PERDIDO' && lostReason) {
        updateData.lost_reason = lostReason;
        updateData.ativo = false;
      }

      if (newStage === 'NO_SHOW' && noShowReason) {
        updateData.no_show_reason = noShowReason;
      }

      const { data: updated, error } = await supabase
        .from('pipeline_clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sync status to agendamento_leads by phone
      const client = clients.find(c => c.id === id);
      if (client?.telefone) {
        try {
          const newAgendamentoStatus = PIPELINE_STAGE_TO_STATUS[newStage as keyof typeof PIPELINE_STAGE_TO_STATUS];
          if (newAgendamentoStatus) {
            const candidates = getPhoneMatchCandidates(client.telefone);
            
            // Update for each candidate phone format
            for (const phone of candidates) {
              await supabase
                .from('agendamento_leads')
                .update({ status: newAgendamentoStatus })
                .eq('telefone', phone);
            }
            
            console.log(`[Pipeline Sync] Updated agendamento status to ${newAgendamentoStatus} for phone candidates:`, candidates);
          }
        } catch (syncError) {
          console.error('Error syncing to agendamento_leads:', syncError);
        }
      }

      // When closed, create operational client
      if (newStage === 'FECHADO') {
        if (client) {
          const { data: existing } = await supabase
            .from('operational_clients')
            .select('id')
            .eq('commercial_id', id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('operational_clients').insert({
              client_name: client.client_name,
              clinic_name: client.clinic_name,
              plan: client.periodo,
              deal_value: client.entrada || 0,
              status_operacional: 'NOVO_CLIENTE',
              onboarding_stage: 'CONTRATO',
              commercial_id: id,
              pagador_anuncio: extraData?.pagador_anuncio || client.pagador_anuncio,
              team_id: extraData?.equipe || client.equipe || null,
              pacote: client.pacote || null,
            });

            // Auto-create "Reunião de Onboarding" task in Cleriston's Meu Dia
            const CLERISTON_USER_ID = '44c3f442-d2bd-4419-ae9c-cc92241c1ac3';
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            await supabase.from('my_day_items').insert({
              title: `Reunião de Onboarding: ${client.client_name}`,
              user_id: CLERISTON_USER_ID,
              date: today,
              status: 'PENDENTE',
              priority: 'ALTA',
              source: 'MANUAL',
              deadline_notified: false,
            });
          }
        }
      }

      return updated;
    },
    // Optimistic update: immediately move the card in cache
    onMutate: async (variables) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['pipeline-clients'] });

      // Snapshot the previous value
      const previousClients = queryClient.getQueryData<PipelineClientDB[]>(['pipeline-clients']);

      // Optimistically update the cache
      queryClient.setQueryData<PipelineClientDB[]>(['pipeline-clients'], (old) => {
        if (!old) return old;
        return old.map(c => {
          if (c.id !== variables.id) return c;
          return {
            ...c,
            stage: variables.newStage,
            last_stage_change: new Date().toISOString(),
            ...(variables.newStage === 'PERDIDO' && variables.lostReason ? { lost_reason: variables.lostReason, ativo: false } : {}),
            ...(variables.newStage === 'NO_SHOW' && variables.noShowReason ? { no_show_reason: variables.noShowReason } : {}),
            ...(variables.extraData || {}),
          } as PipelineClientDB;
        });
      });

      return { previousClients };
    },
    onError: (error, _variables, context) => {
      console.error('Error moving pipeline client:', error);
      toast.error('Erro ao mover lead');
      // Rollback to previous state on error
      if (context?.previousClients) {
        queryClient.setQueryData(['pipeline-clients'], context.previousClients);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      if (variables.newStage === 'FECHADO') {
        queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      }
    },
  });

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    moveClient,
  };
}

// Hook for real-time subscription
export function usePipelineRealtime() {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  const channel = supabase
    .channel('pipeline-clients-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pipeline_clients',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
