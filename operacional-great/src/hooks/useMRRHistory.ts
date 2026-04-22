import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MRRHistoryData {
  month: string;
  monthLabel: string;
  mrrForecast: number;
  mrrActual: number;
}

export function useMRRHistory(months: number = 6) {
  return useQuery({
    queryKey: ['mrr-history', months],
    queryFn: async () => {
      // Get all active clients with their data
      const { data: operationalClients, error } = await supabase
        .from('operational_clients')
        .select('*');
      
      if (error) throw error;

      const now = new Date();
      const historyData: MRRHistoryData[] = [];

      // Calculate MRR for each of the last N months
      for (let i = months - 1; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const periodStart = startOfMonth(targetDate);
        const periodEnd = endOfMonth(targetDate);
        const monthKey = format(targetDate, 'yyyy-MM');
        const monthLabel = format(targetDate, 'MMM/yy', { locale: ptBR });

        // Calculate MRR Forecast for this month
        // MRR = Monthly Recurring Revenue - only counts RENEWAL payments, not initial sales
        // Initial sale is NOT MRR - only subsequent recurring payments count
        let mrrForecast = 0;
        
        operationalClients?.forEach(client => {
          // Skip if client was churned before this period
          if (client.churn_date) {
            const churnDate = new Date(client.churn_date);
            if (churnDate < periodStart) return;
          }
          
          // Skip if not active
          if (client.status_operacional !== 'ATIVO') return;
          
          const value = Number(client.deal_value) || 0;
          if (value <= 0) return;
          
          // Use "Desde" (created_at) as the reference date for MRR calculations
          const startDate = new Date(client.created_at);
          
          // Skip if client didn't exist yet in this period
          if (startDate > periodEnd) return;
          
          const plan = client.plan?.toUpperCase() || 'MENSAL';
          
          // Get the month of start date (0-indexed)
          const startMonth = startDate.getMonth();
          const startYear = startDate.getFullYear();
          
          // Get the target period month (0-indexed)
          const targetMonth = targetDate.getMonth();
          const targetYear = targetDate.getFullYear();
          
          // Calculate total months since start date
          const monthsSinceStart = (targetYear - startYear) * 12 + (targetMonth - startMonth);
          
          // Skip if this period is before start
          if (monthsSinceStart < 0) return;
          
          // MRR only counts RECURRING payments, NOT the initial sale (month 0)
          // Month 0 = initial purchase (not MRR)
          // Month 1+ = recurring payments (MRR)
          
          if (plan === 'MENSAL') {
            // Monthly: first RENEWAL is month 1, then every month after
            // Month 0 = initial sale, Month 1+ = MRR
            if (monthsSinceStart >= 1) {
              mrrForecast += value;
            }
          } else if (plan === 'TRIMESTRAL') {
            // Quarterly: first RENEWAL is month 3, then every 3 months (6, 9, 12...)
            // Month 0 = initial sale, Month 3, 6, 9... = MRR
            if (monthsSinceStart >= 3 && monthsSinceStart % 3 === 0) {
              mrrForecast += value;
            }
          } else if (plan === 'SEMESTRAL') {
            // Semestral: first RENEWAL is month 6, then every 6 months (12, 18...)
            // Month 0 = initial sale, Month 6, 12, 18... = MRR
            if (monthsSinceStart >= 6 && monthsSinceStart % 6 === 0) {
              mrrForecast += value;
            }
          } else if (plan === 'ANUAL') {
            // Annual: first RENEWAL is month 12, then every 12 months
            // Month 0 = initial sale, Month 12, 24... = MRR
            if (monthsSinceStart >= 12 && monthsSinceStart % 12 === 0) {
              mrrForecast += value;
            }
          }
        });

        // Calculate MRR Actual (confirmed renewals in this period)
        const mrrActual = operationalClients?.filter(client => {
          if (client.renewal_status !== 'RENEWED') return false;
          if (client.renewal_date) {
            const renewalDate = new Date(client.renewal_date);
            return renewalDate >= periodStart && renewalDate <= periodEnd;
          }
          return false;
        }).reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0) || 0;

        historyData.push({
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          mrrForecast,
          mrrActual,
        });
      }

      return historyData;
    },
    staleTime: 60000, // 1 minute
  });
}
