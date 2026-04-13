import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that sets up real-time subscriptions for all CEO-relevant tables.
 * This ensures the CEO dashboard is always up-to-date with the latest data
 * from both commercial and operational sources.
 */
export function useCEORealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all CEO-related realtime updates
    const channel = supabase
      .channel('ceo-realtime-updates')
      // Pipeline clients (Commercial)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-clients'] });
        }
      )
      // Operational clients
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operational_clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-historical-data'] });
          queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
          queryClient.invalidateQueries({ queryKey: ['clients-to-renew'] });
        }
      )
      // CRM Events (sales, renewals, etc.)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['crm-events'] });
        }
      )
      // Exec cards (tasks/kanban)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exec_cards' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-historical-data'] });
          queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
        }
      )
      // Work items (tasks)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-historical-data'] });
          queryClient.invalidateQueries({ queryKey: ['work-items'] });
        }
      )
      // Championship events
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'championship_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-championship-teams'] });
          queryClient.invalidateQueries({ queryKey: ['championship-events'] });
        }
      )
      // Championship teams
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'championship_teams' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-championship-teams'] });
        }
      )
      // Teams
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-teams'] });
          queryClient.invalidateQueries({ queryKey: ['team-total-costs'] });
          queryClient.invalidateQueries({ queryKey: ['team-costs-by-sector'] });
        }
      )
      // Activity logs (for real-time feed)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      // Team member costs
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_member_costs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-member-costs'] });
          queryClient.invalidateQueries({ queryKey: ['team-total-costs'] });
          queryClient.invalidateQueries({ queryKey: ['team-costs-by-sector'] });
        }
      )
      // Expenses
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] });
          queryClient.invalidateQueries({ queryKey: ['expenses-history'] });
        }
      )
      // Finance simulations
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'finance_simulations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['finance-simulations'] });
        }
      )
      // Commercial goals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commercial_goals' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['commercial-goals'] });
        }
      )
      // SDR goals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sdr_goals' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sdr-goals'] });
        }
      )
      // Profiles (for team assignments)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ceo-profiles'] });
        }
      )
      // Agenda events (commercial meetings)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
        }
      )
      // Meetings (operational)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['meetings'] });
        }
      )
      // Commission config (CEO editable rates)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commission_config' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['commission-config'] });
        }
      )
      // Commercial goals (synced between Commercial and CEO)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commercial_goals' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['commercial-goals'] });
          queryClient.invalidateQueries({ queryKey: ['ceo-metrics'] });
        }
      )
      // SDR goals
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sdr_goals' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sdr-goals-db'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook for granular real-time subscriptions to specific tables.
 * Use this when you only need updates from specific sources.
 */
export function useCEORealtimeTable(
  table: 'pipeline_clients' | 'operational_clients' | 'crm_events' | 'exec_cards' | 'championship_events',
  queryKeys: string[]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`ceo-${table}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, table, queryKeys]);
}
