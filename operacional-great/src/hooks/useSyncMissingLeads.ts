import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { agendamentoToPipeline } from './usePipelineAgendamentoSync';

/**
 * Hook to sync missing leads from agendamento_leads to pipeline_clients
 * This handles retroactive sync for leads that were created before the sync was implemented
 */
export function useSyncMissingLeads() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const syncMissingLeads = useMutation({
    mutationFn: async () => {
      // Get all agendamento leads
      const { data: agendamentoLeads, error: agendamentoError } = await supabase
        .from('agendamento_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (agendamentoError) throw agendamentoError;

      // Get all pipeline clients
      const { data: pipelineClients, error: pipelineError } = await supabase
        .from('pipeline_clients')
        .select('id, client_name, telefone')
        .eq('ativo', true);

      if (pipelineError) throw pipelineError;

      // Find leads that don't exist in pipeline
      const existingPhones = new Set(
        (pipelineClients || [])
          .filter(c => c.telefone)
          .map(c => c.telefone!.replace(/\D/g, ''))
      );
      const existingNames = new Set(
        (pipelineClients || []).map(c => c.client_name.toLowerCase().trim())
      );

      const missingLeads = (agendamentoLeads || []).filter(lead => {
        const phoneDigits = lead.telefone?.replace(/\D/g, '') || '';
        const nameLower = lead.nome.toLowerCase().trim();
        
        // Check if already exists by phone or name
        const existsByPhone = phoneDigits && existingPhones.has(phoneDigits);
        const existsByName = existingNames.has(nameLower);
        
        return !existsByPhone && !existsByName;
      });

      if (missingLeads.length === 0) {
        return { synced: 0, total: agendamentoLeads?.length || 0 };
      }

      // Alternate team assignment
      let teamToggle = false;

      // Insert missing leads into pipeline
      const leadsToInsert = missingLeads.map(lead => {
        const team = teamToggle ? 'KAUAN' : 'LIRA';
        teamToggle = !teamToggle;

        const pipelineData = agendamentoToPipeline(lead as any, user?.id || '', team);
        return {
          ativo: pipelineData.ativo,
          client_name: pipelineData.clientName,
          clinic_name: pipelineData.clinicName,
          vendedor: pipelineData.vendedor,
          criativo: pipelineData.criativo,
          equipe: pipelineData.equipe,
          faturamento: pipelineData.faturamento,
          pacote: pipelineData.pacote,
          periodo: pipelineData.periodo,
          indicacao: pipelineData.indicacao,
          entrada: pipelineData.entrada,
          data_entrada: new Date().toISOString(),
          stage: pipelineData.stage,
          telefone: lead.telefone?.replace(/\D/g, '') || null,
          lost_reason: pipelineData.lostReason,
          created_by_user_id: user?.id,
        };
      });

      const { error: insertError } = await supabase
        .from('pipeline_clients')
        .insert(leadsToInsert);

      if (insertError) throw insertError;

      return { synced: missingLeads.length, total: agendamentoLeads?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      if (result.synced > 0) {
        toast.success(`${result.synced} leads sincronizados com o pipeline!`);
      } else {
        toast.info('Todos os leads já estão sincronizados.');
      }
    },
    onError: (error) => {
      console.error('Error syncing leads:', error);
      toast.error('Erro ao sincronizar leads');
    },
  });

  return { syncMissingLeads };
}
