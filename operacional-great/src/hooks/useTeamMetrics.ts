import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMetrics {
  id: string;
  name: string;
  renewals: number;
  losses: number;
  mrr: number;
}

export function useTeamMetrics(period?: string) {
  return useQuery({
    queryKey: ['team-metrics', period],
    queryFn: async () => {
      // First get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (teamsError) throw teamsError;
      
      // Get clients data with period filter if provided
      let clientsQuery = supabase
        .from('operational_clients')
        .select('team_id, renewal_status, status_operacional, churn_date, deal_value, activated_at, renewal_date');
      
      const { data: clients, error: clientsError } = await clientsQuery;
      
      if (clientsError) throw clientsError;

      // Calculate metrics per team
      const metricsMap: Record<string, TeamMetrics> = {};
      
      // Initialize all teams with zero values
      teams?.forEach(team => {
        metricsMap[team.id] = {
          id: team.id,
          name: team.name,
          renewals: 0,
          losses: 0,
          mrr: 0,
        };
      });

      // Process clients
      clients?.forEach(client => {
        if (!client.team_id || !metricsMap[client.team_id]) return;
        
        const team = metricsMap[client.team_id];
        
        // Count renewals
        if (client.renewal_status === 'RENEWED') {
          // If period is provided, check if renewal_date is within period
          if (period) {
            const renewalDate = client.renewal_date ? new Date(client.renewal_date) : null;
            if (renewalDate) {
              const [year, month] = period.split('-').map(Number);
              const periodStart = new Date(year, month - 1, 1);
              const periodEnd = new Date(year, month, 0, 23, 59, 59);
              
              if (renewalDate >= periodStart && renewalDate <= periodEnd) {
                team.renewals++;
              }
            }
          } else {
            team.renewals++;
          }
        }
        
        // Count losses (ENCERRADO status or churn_date)
        if (client.status_operacional === 'ENCERRADO' || client.churn_date) {
          // If period is provided, check if churn_date is within period
          if (period && client.churn_date) {
            const churnDate = new Date(client.churn_date);
            const [year, month] = period.split('-').map(Number);
            const periodStart = new Date(year, month - 1, 1);
            const periodEnd = new Date(year, month, 0, 23, 59, 59);
            
            if (churnDate >= periodStart && churnDate <= periodEnd) {
              team.losses++;
            }
          } else if (!period) {
            team.losses++;
          }
        }
        
        // Calculate MRR from active clients
        if (client.status_operacional === 'ATIVO' && client.deal_value) {
          team.mrr += Number(client.deal_value);
        }
      });

      return Object.values(metricsMap);
    },
  });
}
