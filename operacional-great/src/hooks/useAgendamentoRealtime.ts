import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on agendamento_leads and pipeline_clients
 * and invalidates the relevant queries so the UI updates instantly.
 */
export function useAgendamentoRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('agendamento-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamento_leads' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
          // Also refresh agendamento in case the trigger updated status
          queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_events' },
        () => {
          // Refresh agendamento-leads since it's enriched with agenda data
          queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
          queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
