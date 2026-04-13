import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface MonthlyMetrics {
  month: string;
  monthLabel: string;
  revenue: number;
  activeClients: number;
  newClients: number;
  lostClients: number;
  tasksDone: number;
  tasksCreated: number;
}

export interface CriticalAlert {
  id: string;
  type: 'renewal' | 'overdue_task' | 'blocked_task' | 'goal_risk' | 'churn_risk';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  dueDate?: string;
}

// Fetch historical data for the last N months
export function useCEOHistoricalData(months: number = 6) {
  return useQuery({
    queryKey: ['ceo-historical-data', months],
    queryFn: async () => {
      const now = new Date();
      const monthsData: MonthlyMetrics[] = [];

      // Fetch all operational clients
      const { data: allClients, error: clientsError } = await supabase
        .from('operational_clients')
        .select('id, status_operacional, deal_value, created_at, activated_at, churn_date');
      
      if (clientsError) throw clientsError;

      // Fetch all exec cards
      const { data: allCards, error: cardsError } = await supabase
        .from('exec_cards')
        .select('id, created_at, completed_at');
      
      if (cardsError) console.error('Cards error:', cardsError);

      // Fetch all work items
      const { data: allWorkItems, error: workError } = await supabase
        .from('work_items')
        .select('id, created_at, completed_at, status');
      
      if (workError) console.error('Work items error:', workError);

      // Calculate metrics for each month
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthLabel = format(monthDate, 'MMM/yy');

        // Count active clients at end of month
        const activeClients = allClients?.filter(c => {
          const created = new Date(c.created_at);
          const isActiveStatus = c.status_operacional === 'ATIVO';
          const wasCreatedBefore = created <= monthEnd;
          const wasNotChurned = !c.churn_date || new Date(c.churn_date) > monthEnd;
          return isActiveStatus && wasCreatedBefore && wasNotChurned;
        }).length || 0;

        // Count new clients in the month
        const newClients = allClients?.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length || 0;

        // Count lost clients in the month
        const lostClients = allClients?.filter(c => {
          if (!c.churn_date) return false;
          const churnDate = new Date(c.churn_date);
          return churnDate >= monthStart && churnDate <= monthEnd;
        }).length || 0;

        // Calculate revenue from clients active in the month
        const revenue = allClients?.filter(c => {
          const created = new Date(c.created_at);
          const activated = c.activated_at ? new Date(c.activated_at) : null;
          const isActive = c.status_operacional === 'ATIVO';
          const wasActivatedInMonth = activated && activated >= monthStart && activated <= monthEnd;
          const wasCreatedInMonth = created >= monthStart && created <= monthEnd && isActive;
          return wasActivatedInMonth || wasCreatedInMonth;
        }).reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0) || 0;

        // Count tasks done in the month
        const execDone = allCards?.filter(c => {
          if (!c.completed_at) return false;
          const completed = new Date(c.completed_at);
          return completed >= monthStart && completed <= monthEnd;
        }).length || 0;

        const workDone = allWorkItems?.filter(w => {
          if (!w.completed_at) return false;
          const completed = new Date(w.completed_at);
          return completed >= monthStart && completed <= monthEnd;
        }).length || 0;

        // Count tasks created in the month
        const execCreated = allCards?.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length || 0;

        const workCreated = allWorkItems?.filter(w => {
          const created = new Date(w.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length || 0;

        monthsData.push({
          month: monthKey,
          monthLabel,
          revenue,
          activeClients,
          newClients,
          lostClients,
          tasksDone: execDone + workDone,
          tasksCreated: execCreated + workCreated,
        });
      }

      return monthsData;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
}

// Fetch critical alerts
export function useCEOAlerts() {
  return useQuery({
    queryKey: ['ceo-alerts'],
    queryFn: async () => {
      const alerts: CriticalAlert[] = [];
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Fetch clients with renewal due soon
      const { data: renewalClients, error: renewalError } = await supabase
        .from('operational_clients')
        .select('id, client_name, renewal_date, renewal_status, deal_value')
        .eq('status_operacional', 'ATIVO')
        .not('renewal_date', 'is', null)
        .lte('renewal_date', thirtyDaysFromNow.toISOString())
        .neq('renewal_status', 'RENEWED');
      
      if (!renewalError && renewalClients) {
        renewalClients.forEach(client => {
          const renewalDate = new Date(client.renewal_date!);
          const isOverdue = renewalDate < now;
          const isUrgent = renewalDate <= sevenDaysFromNow;
          
          alerts.push({
            id: `renewal-${client.id}`,
            type: 'renewal',
            severity: isOverdue ? 'high' : isUrgent ? 'medium' : 'low',
            title: isOverdue ? 'Renovação Vencida' : 'Renovação Próxima',
            description: `${client.client_name} - R$ ${Number(client.deal_value || 0).toLocaleString('pt-BR')}`,
            entityId: client.id,
            entityType: 'operational_clients',
            dueDate: client.renewal_date!,
          });
        });
      }

      // Fetch overdue tasks from exec_cards
      const { data: overdueTasks, error: overdueError } = await supabase
        .from('exec_cards')
        .select('id, title, due_date, priority')
        .is('completed_at', null)
        .not('due_date', 'is', null)
        .lt('due_date', now.toISOString());
      
      if (!overdueError && overdueTasks) {
        overdueTasks.forEach(task => {
          const dueDate = new Date(task.due_date!);
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          alerts.push({
            id: `overdue-${task.id}`,
            type: 'overdue_task',
            severity: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
            title: `Tarefa Atrasada (${daysOverdue}d)`,
            description: task.title,
            entityId: task.id,
            entityType: 'exec_cards',
            dueDate: task.due_date!,
          });
        });
      }

      // Fetch blocked/urgent tasks
      const { data: blockedTasks, error: blockedError } = await supabase
        .from('exec_cards')
        .select('id, title, priority, created_at')
        .is('completed_at', null)
        .in('priority', ['URGENTE', 'ALTA']);
      
      if (!blockedError && blockedTasks) {
        blockedTasks.slice(0, 5).forEach(task => {
          alerts.push({
            id: `blocked-${task.id}`,
            type: 'blocked_task',
            severity: task.priority === 'URGENTE' ? 'high' : 'medium',
            title: `Tarefa ${task.priority}`,
            description: task.title,
            entityId: task.id,
            entityType: 'exec_cards',
          });
        });
      }

      // Fetch work items that are blocked
      const { data: blockedWorkItems, error: blockedWorkError } = await supabase
        .from('work_items')
        .select('id, title, status, due_date')
        .eq('status', 'BLOQUEADO');
      
      if (!blockedWorkError && blockedWorkItems) {
        blockedWorkItems.forEach(item => {
          alerts.push({
            id: `blocked-work-${item.id}`,
            type: 'blocked_task',
            severity: 'high',
            title: 'Trabalho Bloqueado',
            description: item.title,
            entityId: item.id,
            entityType: 'work_items',
            dueDate: item.due_date || undefined,
          });
        });
      }

      // Check for churn risk - clients with status PAUSADO or issues
      const { data: churnRiskClients, error: churnError } = await supabase
        .from('operational_clients')
        .select('id, client_name, status_operacional, deal_value')
        .in('status_operacional', ['PAUSADO', 'EM_RISCO']);
      
      if (!churnError && churnRiskClients) {
        churnRiskClients.forEach(client => {
          alerts.push({
            id: `churn-${client.id}`,
            type: 'churn_risk',
            severity: 'high',
            title: 'Risco de Churn',
            description: `${client.client_name} - ${client.status_operacional}`,
            entityId: client.id,
            entityType: 'operational_clients',
          });
        });
      }

      // Sort by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return alerts;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}
