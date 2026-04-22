import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============ Expense Types ============
export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_active: boolean | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  recurrence: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

// ============ Expense Hooks ============
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; icon?: string; color?: string }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          name: category.name,
          icon: category.icon || 'MoreHorizontal',
          color: category.color || '#6b7280',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ExpenseCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useExpenses(period?: string) {
  return useQuery({
    queryKey: ['expenses', period],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('expenses')
        .select('*, category:expense_categories(*)')
        .order('expense_date', { ascending: false });
      
      if (period) {
        const [year, month] = period.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        query = query.gte('expense_date', startDate).lte('expense_date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

// Fetch historical expenses for comparison (last N months)
export function useExpensesHistory(months: number = 6) {
  return useQuery({
    queryKey: ['expenses-history', months],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(*)')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .order('expense_date', { ascending: true });
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

// Fetch fixed/recurring expenses
export function useFixedExpenses() {
  return useQuery({
    queryKey: ['fixed-expenses'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(*)')
        .neq('recurrence', 'UNICO')
        .order('description');
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

// Generate fixed expenses for a month
export function useGenerateFixedExpenses() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (targetMonth: string) => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get all fixed expenses
      const { data: fixedExpenses, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .neq('recurrence', 'UNICO');
      
      if (fetchError) throw fetchError;
      if (!fixedExpenses || fixedExpenses.length === 0) return [];
      
      const [year, month] = targetMonth.split('-');
      const targetDate = `${year}-${month}-01`;
      
      // Check which ones already exist for this month
      const { data: existing } = await supabase
        .from('expenses')
        .select('description, category_id')
        .gte('expense_date', targetDate)
        .lte('expense_date', new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]);
      
      const existingKeys = new Set(existing?.map(e => `${e.description}-${e.category_id}`) || []);
      
      // Filter out already existing
      const toCreate = fixedExpenses.filter(exp => {
        const key = `${exp.description}-${exp.category_id}`;
        return !existingKeys.has(key);
      });
      
      if (toCreate.length === 0) return [];
      
      // Create new entries
      const newExpenses = toCreate.map(exp => ({
        category_id: exp.category_id,
        description: exp.description,
        amount: exp.amount,
        expense_date: targetDate,
        recurrence: exp.recurrence,
        notes: `Gerado automaticamente de despesa fixa`,
        created_by_user_id: exp.created_by_user_id,
      }));
      
      const { data, error } = await supabase
        .from('expenses')
        .insert(newExpenses)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] });
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...expense }: Partial<Expense> & { id: string }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('expenses')
        .update(expense)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { TeamMemberRole } from '@/types';

// Types
export interface TeamCostConfig {
  id: string;
  default_team_cost: number;
  currency: string;
  updated_by_user_id: string | null;
  updated_at: string;
}

export interface FinanceSimulation {
  id: string;
  name: string;
  base_period: string;
  new_teams_count: number;
  cost_per_team: number;
  estimated_extra_cost: number;
  estimated_revenue: number | null;
  estimated_margin: number | null;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberCost {
  id: string;
  team_id: string | null;
  role_type: TeamMemberRole;
  member_name: string | null;
  profile_id: string | null;
  monthly_salary: number;
  benefits_cost: number;
  other_costs: number;
  total_cost: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  team?: { id: string; name: string };
  profile?: { id: string; full_name: string; email: string };
}

export interface RoleCostDefault {
  id: string;
  role_type: TeamMemberRole;
  default_salary: number;
  default_benefits: number;
  default_other: number;
  updated_at: string;
  updated_by_user_id: string | null;
}

export interface CEOMetrics {
  commercial: {
    revenue: number;
    closedDeals: number;
    pipelineTotal: number;
    conversion: number;
    ticketAvg: number;
    mrrEstimated: number;
  };
  operational: {
    activeClients: number;
    newClients: number;
    onboardingClients: number;
    lostClients: number;
    tasksDone: number;
    tasksBlocked: number;
    slaOkPct: number;
  };
  productsSold: {
    total: number;
    byTeam: Record<string, { count: number; value: number }>;
  };
}

// Fetch team cost config
export function useTeamCostConfig() {
  return useQuery({
    queryKey: ['team-cost-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_cost_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as TeamCostConfig;
    },
  });
}

// Update team cost config
export function useUpdateTeamCostConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newCost: number) => {
      const { data, error } = await supabase
        .from('team_cost_config')
        .update({ 
          default_team_cost: newCost,
          updated_by_user_id: user?.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-cost-config'] });
    },
  });
}

// Fetch team member costs
export function useTeamMemberCosts(teamId?: string) {
  return useQuery({
    queryKey: ['team-member-costs', teamId],
    queryFn: async () => {
      let query = supabase
        .from('team_member_costs')
        .select('*, teams:team_id(id, name), profiles:profile_id(id, full_name, email)')
        .order('role_type');
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TeamMemberCost[];
    },
  });
}

// Fetch role cost defaults
export function useRoleCostDefaults() {
  return useQuery({
    queryKey: ['role-cost-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_cost_defaults')
        .select('*')
        .order('role_type');
      
      if (error) throw error;
      return data as RoleCostDefault[];
    },
  });
}

// Update role cost default
export function useUpdateRoleCostDefault() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (update: { 
      role_type: TeamMemberRole; 
      default_salary: number; 
      default_benefits: number; 
      default_other: number;
    }) => {
      const { data, error } = await supabase
        .from('role_cost_defaults')
        .update({ 
          default_salary: update.default_salary,
          default_benefits: update.default_benefits,
          default_other: update.default_other,
          updated_by_user_id: user?.id 
        })
        .eq('role_type', update.role_type)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-cost-defaults'] });
    },
  });
}

// Create team member cost
export function useCreateTeamMemberCost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (member: {
      team_id: string;
      role_type: TeamMemberRole;
      member_name?: string;
      profile_id?: string;
      monthly_salary: number;
      benefits_cost: number;
      other_costs: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('team_member_costs')
        .insert({
          ...member,
          created_by_user_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-costs'] });
    },
  });
}

// Update team member cost
export function useUpdateTeamMemberCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamMemberCost> & { id: string }) => {
      const { data, error } = await supabase
        .from('team_member_costs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-costs'] });
    },
  });
}

// Delete team member cost
export function useDeleteTeamMemberCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('team_member_costs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-costs'] });
    },
  });
}

// Fetch finance simulations
export function useFinanceSimulations() {
  return useQuery({
    queryKey: ['finance-simulations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_simulations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FinanceSimulation[];
    },
  });
}

// Create finance simulation
export function useCreateFinanceSimulation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (simulation: {
      name: string;
      base_period: string;
      new_teams_count: number;
      cost_per_team: number;
      estimated_revenue?: number;
      notes?: string;
    }) => {
      const estimated_margin = simulation.estimated_revenue 
        ? simulation.estimated_revenue - (simulation.new_teams_count * simulation.cost_per_team)
        : null;

      const { data, error } = await supabase
        .from('finance_simulations')
        .insert({
          ...simulation,
          estimated_margin,
          created_by_user_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-simulations'] });
    },
  });
}

// Delete finance simulation
export function useDeleteFinanceSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance_simulations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-simulations'] });
    },
  });
}

// Calculate team total cost from members
export function useTeamTotalCosts() {
  return useQuery({
    queryKey: ['team-total-costs'],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('team_member_costs')
        .select('*, teams:team_id(id, name)')
        .eq('is_active', true);
      
      if (error) throw error;

      // Group by team
      const teamCosts: Record<string, {
        teamId: string;
        teamName: string;
        totalCost: number;
        memberCount: number;
        byRole: Record<string, { count: number; cost: number }>;
      }> = {};

      members?.forEach((member: any) => {
        const teamId = member.team_id || 'no-team';
        const teamName = member.teams?.name || 'Sem equipe';
        
        if (!teamCosts[teamId]) {
          teamCosts[teamId] = {
            teamId,
            teamName,
            totalCost: 0,
            memberCount: 0,
            byRole: {},
          };
        }

        teamCosts[teamId].totalCost += member.total_cost || 0;
        teamCosts[teamId].memberCount += 1;

        if (!teamCosts[teamId].byRole[member.role_type]) {
          teamCosts[teamId].byRole[member.role_type] = { count: 0, cost: 0 };
        }
        teamCosts[teamId].byRole[member.role_type].count += 1;
        teamCosts[teamId].byRole[member.role_type].cost += member.total_cost || 0;
      });

      return Object.values(teamCosts);
    },
  });
}

// Fetch CEO metrics - consolidated data from commercial and operational
// REAL-TIME: This hook is invalidated by useCEORealtime when any relevant table changes
// NOTE: Commercial pipeline data comes from CommercialContext (localStorage), not database
// Use useCEOMetricsWithCommercial hook in pages that have access to CommercialContext
export function useCEOMetrics(period: string = format(new Date(), 'yyyy-MM')) {
  return useQuery({
    queryKey: ['ceo-metrics', period],
    queryFn: async () => {
      const periodDate = parseISO(`${period}-01`);
      const startDate = startOfMonth(periodDate);
      const endDate = endOfMonth(periodDate);

      // Fetch ALL operational clients data
      const { data: operationalClients, error: opError } = await supabase
        .from('operational_clients')
        .select('*, teams!operational_clients_team_id_fkey(name)');
      if (opError) throw opError;

      // Fetch crm events (operational sales) for the period
      const { data: crmEvents, error: crmError } = await supabase
        .from('crm_events')
        .select('*, operational_clients(team_id, teams!operational_clients_team_id_fkey(name))')
        .eq('event_type', 'VENDA_OPERACIONAL')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (crmError) console.error('CRM events fetch error:', crmError);

      // Fetch exec cards (tasks) for throughput - ALL cards for the period
      const { data: execCards, error: execError } = await supabase
        .from('exec_cards')
        .select('*, exec_columns(name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (execError) console.error('Exec cards fetch error:', execError);

      // Fetch work items (alternative tasks) for the period
      const { data: workItems, error: workError } = await supabase
        .from('work_items')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (workError) console.error('Work items fetch error:', workError);

      // Fetch championship events for the period
      const { data: champEvents, error: champError } = await supabase
        .from('championship_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (champError) console.error('Championship events fetch error:', champError);

      // Fetch agenda events (commercial meetings) for the period
      const { data: agendaEvents, error: agendaError } = await supabase
        .from('agenda_events')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0]);
      
      if (agendaError) console.error('Agenda events fetch error:', agendaError);

      // Fetch agendamento leads for commercial metrics
      const { data: agendamentoLeads, error: agendaLeadsError } = await supabase
        .from('agendamento_leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (agendaLeadsError) console.error('Agendamento leads fetch error:', agendaLeadsError);

      // Fetch pipeline_clients that are FECHADO (closed deals from commercial)
      const { data: pipelineClients, error: pipelineError } = await supabase
        .from('pipeline_clients')
        .select('*')
        .eq('stage', 'FECHADO')
        .gte('last_stage_change', startDate.toISOString())
        .lte('last_stage_change', endDate.toISOString());
      
      if (pipelineError) console.error('Pipeline clients fetch error:', pipelineError);

      // Calculate commercial revenue from FECHADO pipeline clients only
      const closedDealsCount = pipelineClients?.length || 0;
      const revenueFromClosedDeals = pipelineClients?.reduce((sum, c) => {
        const entrada = Number(c.entrada) || 0;
        return sum + entrada;
      }, 0) || 0;
      
      const ticketAvg = closedDealsCount > 0 ? revenueFromClosedDeals / closedDealsCount : 0;
      const totalMeetings = agendaEvents?.length || 0;
      const conversion = totalMeetings > 0 ? (closedDealsCount / totalMeetings) * 100 : 0;

      // Count renewals in the period
      const renewalsCount = operationalClients?.filter(c => {
        if (c.renewal_status !== 'RENEWED') return false;
        if (c.renewal_date) {
          const renewalDate = new Date(c.renewal_date);
          return renewalDate >= startDate && renewalDate <= endDate;
        }
        return false;
      }).length || 0;

      // Calculate operational metrics - CURRENT STATE
      const activeClients = operationalClients?.filter(c => c.status_operacional === 'ATIVO').length || 0;
      const periodNewClients = operationalClients?.filter(c => {
        const createdAt = new Date(c.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      }) || [];
      const newClientsCount = periodNewClients.length;
      const onboardingClients = operationalClients?.filter(c => 
        c.status_operacional === 'ONBOARDING' || c.status_operacional === 'NOVO_CLIENTE'
      ).length || 0;
      
      const lostClients = operationalClients?.filter(c => {
        if (c.status_operacional !== 'ENCERRADO' && c.status_operacional !== 'CANCELADO') return false;
        if (c.churn_date) {
          const churnDate = new Date(c.churn_date);
          return churnDate >= startDate && churnDate <= endDate;
        }
        const createdAt = new Date(c.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      }).length || 0;

      // Combined tasks metrics from exec_cards and work_items
      const execTasksDone = execCards?.filter(c => {
        // Check if in a "done" column or has completed_at
        const columnName = (c as any).exec_columns?.name?.toLowerCase() || '';
        return c.completed_at || columnName.includes('conclu') || columnName.includes('done') || columnName.includes('feito');
      }).length || 0;
      
      const workTasksDone = workItems?.filter(w => 
        w.status === 'CONCLUIDA' || w.status === 'DONE' || w.completed_at
      ).length || 0;
      const tasksDone = execTasksDone + workTasksDone;
      
      // Count blocked tasks
      const execTasksBlocked = execCards?.filter(c => 
        !c.completed_at && (c.priority === 'URGENTE' || c.priority === 'ALTA')
      ).length || 0;
      const workTasksBlocked = workItems?.filter(w => 
        w.status === 'BLOQUEADO' || w.status === 'BLOCKED'
      ).length || 0;
      const tasksBlocked = execTasksBlocked + workTasksBlocked;

      // Products sold by team from crm_events
      const productsSoldByTeam: Record<string, { count: number; value: number }> = {};
      let totalProductsSold = 0;
      let totalProductsValue = 0;

      crmEvents?.forEach(event => {
        const teamName = (event as any).operational_clients?.teams?.name || 'Sem equipe';
        if (!productsSoldByTeam[teamName]) {
          productsSoldByTeam[teamName] = { count: 0, value: 0 };
        }
        productsSoldByTeam[teamName].count += 1;
        productsSoldByTeam[teamName].value += event.sale_value || 0;
        totalProductsSold += 1;
        totalProductsValue += event.sale_value || 0;
      });

      // Also count championship sale events
      const saleEvents = champEvents?.filter(e => e.event_type === 'ITEM_SOLD') || [];
      saleEvents.forEach(event => {
        const teamId = event.team_id;
        // Find team name from operational clients
        const teamData = operationalClients?.find(c => c.team_id === teamId);
        const teamName = (teamData as any)?.teams?.name || teamId || 'Sem equipe';
        
        if (!productsSoldByTeam[teamName]) {
          productsSoldByTeam[teamName] = { count: 0, value: 0 };
        }
        productsSoldByTeam[teamName].count += 1;
        productsSoldByTeam[teamName].value += event.points * 100; // Approximate value from points
        totalProductsSold += 1;
        totalProductsValue += event.points * 100;
      });

      // Calculate MRR properly - only count RECURRING payments, NOT initial sales
      // MRR = Monthly Recurring Revenue = only renewal/recurring payments
      // Month 0 (initial purchase) is NOT MRR - only subsequent payments count
      // Monthly: starts from month 1 | Quarterly: month 3, 6, 9... | Semestral: month 6, 12...
      const mrrEstimated = operationalClients
        ?.filter(c => c.status_operacional === 'ATIVO')
        .reduce((sum, c) => {
          const value = Number(c.deal_value) || 0;
          if (value <= 0) return sum;
          
          const plan = c.plan?.toUpperCase() || 'MENSAL';
          // "Desde" (created_at) is the reference date for MRR cycle calculations
          const startDate_client = new Date(c.created_at);
          const startMonth = startDate_client.getMonth();
          const startYear = startDate_client.getFullYear();
          const periodMonth = periodDate.getMonth();
          const periodYear = periodDate.getFullYear();
          
          // Calculate months since client started
          const monthsDiff = (periodYear - startYear) * 12 + (periodMonth - startMonth);
          
          if (monthsDiff < 0) return sum; // Client started after this period
          
          // MRR only counts RECURRING payments, NOT the initial sale (month 0)
          if (plan === 'MENSAL') {
            // Monthly: first RENEWAL is month 1, then every month
            if (monthsDiff >= 1) {
              return sum + value;
            }
          } else if (plan === 'TRIMESTRAL') {
            // Quarterly: first RENEWAL is month 3, then every 3 months (6, 9, 12...)
            if (monthsDiff >= 3 && monthsDiff % 3 === 0) {
              return sum + value;
            }
          } else if (plan === 'SEMESTRAL') {
            // Semestral: first RENEWAL is month 6, then every 6 months (12, 18...)
            if (monthsDiff >= 6 && monthsDiff % 6 === 0) {
              return sum + value;
            }
          } else if (plan === 'ANUAL') {
            // Annual: first RENEWAL is month 12, then every 12 months
            if (monthsDiff >= 12 && monthsDiff % 12 === 0) {
              return sum + value;
            }
          }
          return sum;
        }, 0) || 0;

      // Calculate actual recurrence (confirmed renewals in the period)
      const recurrenceActual = operationalClients?.filter(c => {
        if (c.renewal_status !== 'RENEWED') return false;
        if (c.renewal_date) {
          const renewalDate = new Date(c.renewal_date);
          return renewalDate >= startDate && renewalDate <= endDate;
        }
        return false;
      }).reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0) || 0;

      // Count clients pending renewal
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const clientsToRenew = operationalClients?.filter(c => {
        if (c.status_operacional !== 'ATIVO') return false;
        if (c.renewal_status === 'PENDING' || c.renewal_status === 'OVERDUE') return true;
        if (c.renewal_date) {
          const renewalDate = new Date(c.renewal_date);
          return renewalDate <= thirtyDaysFromNow && c.renewal_status !== 'RENEWED';
        }
        return false;
      }).length || 0;

      // Total pipeline value (all clients in system)
      const pipelineTotal = operationalClients?.length || 0;

      return {
        commercial: {
          revenue: revenueFromClosedDeals,
          closedDeals: closedDealsCount,
          pipelineTotal,
          conversion,
          ticketAvg,
          mrrEstimated,
          recurrenceActual,
          totalMeetings,
          agendamentoCount: agendamentoLeads?.length || 0,
        },
        operational: {
          activeClients,
          newClients: newClientsCount,
          onboardingClients,
          lostClients,
          tasksDone,
          tasksBlocked,
          slaOkPct: tasksDone + tasksBlocked > 0 ? (tasksDone / (tasksDone + tasksBlocked)) * 100 : 100,
          clientsToRenew,
          renewals: renewalsCount,
        },
        productsSold: {
          total: totalProductsSold,
          totalValue: totalProductsValue,
          byTeam: productsSoldByTeam,
        },
      } as CEOMetrics & { 
        commercial: { totalMeetings: number; agendamentoCount: number; recurrenceActual: number }; 
        productsSold: { totalValue: number }; 
        operational: { clientsToRenew: number; renewals: number } 
      };
    },
    staleTime: 5000, // 5 seconds - shorter stale time for real-time feel
    refetchInterval: 30000, // Auto-refetch every 30 seconds as backup
  });
}

// Fetch team costs grouped by sector (comercial vs operacional)
export function useTeamCostsBySector() {
  return useQuery({
    queryKey: ['team-costs-by-sector'],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('team_member_costs')
        .select('*, teams:team_id(id, name), profile:profile_id(operational_role, commercial_role)')
        .eq('is_active', true);
      
      if (error) throw error;

      const sectors: {
        comercial: { teams: Record<string, { totalCost: number; memberCount: number }>; totalCost: number };
        operacional: { teams: Record<string, { totalCost: number; memberCount: number }>; totalCost: number };
      } = {
        comercial: { teams: {}, totalCost: 0 },
        operacional: { teams: {}, totalCost: 0 },
      };

      members?.forEach((member: any) => {
        const teamName = member.teams?.name || 'Sem equipe';
        const cost = member.total_cost || 0;
        
        // Determine sector based on role_type or profile role
        const roleType = member.role_type?.toUpperCase() || '';
        const isCommercial = ['SDR', 'CLOSER', 'COORDENADOR_COMERCIAL'].includes(roleType) ||
          member.profile?.commercial_role;
        
        const sector = isCommercial ? 'comercial' : 'operacional';
        
        if (!sectors[sector].teams[teamName]) {
          sectors[sector].teams[teamName] = { totalCost: 0, memberCount: 0 };
        }
        
        sectors[sector].teams[teamName].totalCost += cost;
        sectors[sector].teams[teamName].memberCount += 1;
        sectors[sector].totalCost += cost;
      });

      return sectors;
    },
  });
}

// Fetch clients that need renewal soon
export function useClientsToRenew() {
  return useQuery({
    queryKey: ['clients-to-renew'],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('operational_clients')
        .select('*, teams!operational_clients_team_id_fkey(name)')
        .eq('status_operacional', 'ATIVO')
        .or(`renewal_status.eq.PENDING,renewal_status.eq.OVERDUE,renewal_date.lte.${thirtyDaysFromNow.toISOString()}`);
      
      if (error) throw error;
      return data;
    },
  });
}

// Fetch teams data for the CEO module
export function useCEOTeams() {
  return useQuery({
    queryKey: ['ceo-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

// Fetch championship teams for ranking
export function useCEOChampionshipTeams() {
  return useQuery({
    queryKey: ['ceo-championship-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('championship_teams')
        .select('*')
        .order('total_points', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Fetch profiles for team member assignment
export function useCEOProfiles() {
  return useQuery({
    queryKey: ['ceo-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, team_id, operational_role')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });
}
