import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCommercial, VENDEDOR_OPTIONS, PERIODO_OPTIONS } from '@/contexts/CommercialContext';
import { MonthPeriodFilter, useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { cn, formatBRL } from '@/lib/utils';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Percent, 
  Banknote, 
  Trophy,
  HelpCircle,
  Briefcase,
  RefreshCw,
  Package,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Calendar,
  Repeat,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { useCommissionRates } from '@/hooks/useCommissionConfig';
import { CommissionConfigDialog } from '@/components/ceo/CommissionConfigDialog';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// Default fallback rates (used when DB values not yet loaded)
const DEFAULT_RATES = {
  HERBERT_RATE: 0.03,
  CLED_DIRECT_RATE: 0.015,
  CLED_BONUS_RATE: 0.03,
  RENEWAL_RATE: 0.03,
  PRODUCT_SALES_RATE: 0.25,
  GESTOR_COUNT: 4,
  IA_AGENDA_SALES_RATE: 0.20,
  IA_AGENDA_RECURRENCE_RATE: 0.20,
  IA_RENEWAL_RATE: 0.03,
};

const ROLE_BADGES: Record<string, string> = {
  'SDR': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'CLOSER': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'COORDENADOR': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'GESTOR': 'bg-green-500/20 text-green-400 border-green-500/30',
  'IA': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

// Hook to fetch operational renewal data
function useOperationalRenewals(selectedMonth: string) {
  return useQuery({
    queryKey: ['operational-renewals', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('operational_clients')
        .select(`
          id,
          client_name,
          plan,
          deal_value,
          renewal_status,
          renewal_date,
          renewal_responsible_team_id,
          teams!operational_clients_renewal_responsible_team_id_fkey(id, name)
        `)
        .eq('renewal_status', 'RENEWED')
        .gte('renewal_date', startDate.toISOString())
        .lte('renewal_date', endDate.toISOString());

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to fetch clients close to commission goal (monthly clients with renewal tracking)
// Uses real renewal events from CRM to track consecutive renewals
function useClientsNearCommissionGoal() {
  return useQuery({
    queryKey: ['clients-near-commission-goal'],
    queryFn: async () => {
      // Get all monthly active clients with their renewal history
      const { data: clients, error } = await supabase
        .from('operational_clients')
        .select(`
          id,
          client_name,
          clinic_name,
          plan,
          deal_value,
          status_operacional,
          created_at,
          activated_at,
          renewal_status,
          renewal_date,
          team_id,
          teams!operational_clients_team_id_fkey(id, name)
        `)
        .eq('plan', 'MENSAL')
        .in('status_operacional', ['ATIVO', 'NOVO_CLIENTE']);

      if (error) throw error;

      // Fetch all renewal events for these clients from crm_events
      const clientIds = (clients || []).map(c => c.id);
      let renewalEventsByClient: Record<string, number> = {};

      if (clientIds.length > 0) {
        const { data: renewalEvents } = await supabase
          .from('crm_events')
          .select('client_id, created_at')
          .in('client_id', clientIds)
          .eq('event_type', 'RENOVACAO_MENSAL')
          .order('created_at', { ascending: true });

        // Count consecutive renewals per client
        (renewalEvents || []).forEach(event => {
          renewalEventsByClient[event.client_id] = (renewalEventsByClient[event.client_id] || 0) + 1;
        });
      }

      // Calculate renewal months for each client
      const now = new Date();
      const clientsWithMonths = (clients || []).map((client: any) => {
        // Use real renewal count from CRM events if available
        const renewalCount = renewalEventsByClient[client.id] || 0;
        
        // Fallback: calculate based on activated_at if no renewal events
        const activatedAt = client.activated_at ? new Date(client.activated_at) : new Date(client.created_at);
        const monthsActive = Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
        
        // Use the higher of actual renewals vs calculated months active
        const renewalMonths = Math.max(renewalCount, Math.max(0, monthsActive));
        const monthsToGoal = Math.max(0, 3 - renewalMonths);
        const isEligibleForCommission = renewalMonths >= 3;
        
        // Commission is 3% of total value paid (deal_value * months renewed)
        const totalValuePaid = (client.deal_value || 0) * Math.min(renewalMonths, 3);
        const potentialCommission = totalValuePaid * DEFAULT_RATES.RENEWAL_RATE;

        return {
          ...client,
          renewalMonths,
          monthsToGoal,
          isEligibleForCommission,
          potentialCommission,
          totalValuePaid,
          teamName: client.teams?.name || 'Sem equipe',
        };
      });

      // Sort by closest to goal first (1 month away, then 2 months, then already eligible)
      return clientsWithMonths.sort((a, b) => {
        if (a.monthsToGoal === 0 && b.monthsToGoal === 0) return 0;
        if (a.monthsToGoal === 0) return 1;
        if (b.monthsToGoal === 0) return -1;
        return a.monthsToGoal - b.monthsToGoal;
      });
    },
  });
}

// Hook to fetch CRM product sales events (operational sales)
function useOperationalProductSales(selectedMonth: string) {
  return useQuery({
    queryKey: ['operational-product-sales', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Fetch product sales from crm_events (VENDA_PRODUTO represents operational product sales)
      const { data, error } = await supabase
        .from('crm_events')
        .select(`
          id,
          title,
          event_type,
          sale_value,
          created_at,
          client_id,
          user_id,
          operational_clients!crm_events_client_id_fkey(
            id,
            client_name,
            team_id,
            teams!operational_clients_team_id_fkey(id, name)
          ),
          profiles!crm_events_user_id_fkey(
            id,
            full_name,
            operational_role
          )
        `)
        .in('event_type', ['VENDA_PRODUTO', 'VENDA_OPERACIONAL'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const totalValue = (data || []).reduce((sum, sale) => sum + (sale.sale_value || 0), 0);

      return {
        sales: data || [],
        totalValue,
        count: data?.length || 0,
      };
    },
  });
}
// Fetch gestors from profiles
function useGestors() {
  return useQuery({
    queryKey: ['gestors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, operational_role, team_id')
        .eq('operational_role', 'GESTOR')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to fetch IA agenda sales from CRM events - includes VENDA_AGENDA and VENDA_OPERACIONAL with item "Agenda"
function useIAAgendaSales(selectedMonth: string) {
  return useQuery({
    queryKey: ['ia-agenda-sales', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Fetch agenda sales from CRM events - both VENDA_AGENDA and VENDA_OPERACIONAL with Agenda item
      const { data: allSales, error } = await supabase
        .from('crm_events')
        .select(`
          id,
          title,
          description,
          sale_value,
          created_at,
          event_type,
          client_id,
          operational_clients!crm_events_client_id_fkey(
            id,
            client_name,
            team_id
          )
        `)
        .in('event_type', ['VENDA_AGENDA', 'VENDA_OPERACIONAL'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Filter: include VENDA_AGENDA or VENDA_OPERACIONAL where description contains "Item vendido: Agenda"
      const agendaSales = (allSales || []).filter(sale => 
        sale.event_type === 'VENDA_AGENDA' || 
        (sale.event_type === 'VENDA_OPERACIONAL' && sale.description?.toLowerCase().includes('item vendido: agenda'))
      );

      const totalValue = agendaSales.reduce((sum, sale) => sum + (sale.sale_value || 0), 0);

      return {
        events: agendaSales,
        totalValue,
        count: agendaSales.length,
      };
    },
  });
}

// Hook to fetch IA recurring agenda revenue - includes RECORRENCIA_AGENDA and VENDA_OPERACIONAL with item "Recorrência"
function useIAAgendaRecurrence(selectedMonth: string) {
  return useQuery({
    queryKey: ['ia-agenda-recurrence', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      // Fetch all relevant events - RECORRENCIA_AGENDA and VENDA_OPERACIONAL
      const { data: allEvents, error } = await supabase
        .from('crm_events')
        .select(`
          id,
          title,
          description,
          sale_value,
          created_at,
          event_type,
          client_id,
          operational_clients!crm_events_client_id_fkey(
            id,
            client_name,
            team_id
          )
        `)
        .in('event_type', ['RECORRENCIA_AGENDA', 'VENDA_OPERACIONAL'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Filter: include RECORRENCIA_AGENDA or VENDA_OPERACIONAL where description contains "Item vendido: Recorrência"
      const recurrenceEvents = (allEvents || []).filter(event => 
        event.event_type === 'RECORRENCIA_AGENDA' || 
        (event.event_type === 'VENDA_OPERACIONAL' && event.description?.toLowerCase().includes('item vendido: recorrência'))
      );

      const totalValue = recurrenceEvents.reduce((sum, event) => sum + (event.sale_value || 0), 0);

      return {
        events: recurrenceEvents,
        count: recurrenceEvents.length,
        totalValue,
      };
    },
  });
}

// Hook to fetch IA monthly renewals (clients that renewed)
function useIARenewals(selectedMonth: string) {
  return useQuery({
    queryKey: ['ia-renewals', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all renewals for the period
      const { data, error } = await supabase
        .from('operational_clients')
        .select(`
          id,
          client_name,
          deal_value,
          renewal_status,
          renewal_date
        `)
        .eq('renewal_status', 'RENEWED')
        .gte('renewal_date', startDate.toISOString())
        .lte('renewal_date', endDate.toISOString());

      if (error) throw error;

      const totalValue = (data || []).reduce((sum, client) => sum + (client.deal_value || 0), 0);
      const commission = totalValue * DEFAULT_RATES.IA_RENEWAL_RATE;

      return {
        renewals: data || [],
        count: data?.length || 0,
        totalValue,
        commission,
      };
    },
  });
}

// Hook to fetch IA commission evolution for the last 6 months
function useIACommissionEvolution() {
  return useQuery({
    queryKey: ['ia-commission-evolution'],
    queryFn: async () => {
      const months: { month: string; label: string; startDate: Date; endDate: Date }[] = [];
      const now = new Date();
      
      // Generate last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        months.push({
          month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
          startDate: date,
          endDate,
        });
      }

      const results = await Promise.all(months.map(async ({ month, label, startDate, endDate }) => {
        // Fetch agenda sales (VENDA_AGENDA or VENDA_OPERACIONAL with agenda item)
        const { data: agendaSales } = await supabase
          .from('crm_events')
          .select('id, sale_value, description, event_type')
          .in('event_type', ['VENDA_AGENDA', 'VENDA_OPERACIONAL'])
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const filteredAgendaSales = (agendaSales || []).filter(sale => 
          sale.event_type === 'VENDA_AGENDA' || 
          (sale.event_type === 'VENDA_OPERACIONAL' && sale.description?.toLowerCase().includes('item vendido: agenda'))
        );
        const agendaSalesValue = filteredAgendaSales.reduce((sum, s) => sum + (s.sale_value || 0), 0);

        // Fetch recurrence (RECORRENCIA_AGENDA or VENDA_OPERACIONAL with recurrence item)
        const { data: recurrenceEvents } = await supabase
          .from('crm_events')
          .select('id, sale_value, description, event_type')
          .in('event_type', ['RECORRENCIA_AGENDA', 'VENDA_OPERACIONAL'])
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const filteredRecurrence = (recurrenceEvents || []).filter(event => 
          event.event_type === 'RECORRENCIA_AGENDA' || 
          (event.event_type === 'VENDA_OPERACIONAL' && event.description?.toLowerCase().includes('item vendido: recorrência'))
        );
        const recurrenceValue = filteredRecurrence.reduce((sum, e) => sum + (e.sale_value || 0), 0);

        // Fetch renewals
        const { data: renewals } = await supabase
          .from('operational_clients')
          .select('id, deal_value')
          .eq('renewal_status', 'RENEWED')
          .gte('renewal_date', startDate.toISOString())
          .lte('renewal_date', endDate.toISOString());

        const renewalsValue = (renewals || []).reduce((sum, r) => sum + (r.deal_value || 0), 0);

        // Calculate commissions
        const agendaCommission = agendaSalesValue * DEFAULT_RATES.IA_AGENDA_SALES_RATE;
        const recurrenceCommission = recurrenceValue * DEFAULT_RATES.IA_AGENDA_RECURRENCE_RATE;
        const renewalCommission = renewalsValue * DEFAULT_RATES.IA_RENEWAL_RATE;
        const total = agendaCommission + recurrenceCommission + renewalCommission;

        return {
          month: label,
          agenda: agendaCommission,
          recorrencia: recurrenceCommission,
          renovacoes: renewalCommission,
          total,
        };
      }));

      return results;
    },
  });
}

export default function CEOComissoes() {
  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const { filterByMonth } = useMonthFilter();
  const { pipelineClients } = useCommercial();
  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  
  // Get configurable commission rates
  const { rates: RATES, isLoading: ratesLoading } = useCommissionRates();

  // Data fetching
  const { data: renewals = [] } = useOperationalRenewals(selectedMonth);
  const { data: operationalSales } = useOperationalProductSales(selectedMonth);
  const { data: gestors = [] } = useGestors();
  const { data: clientsNearGoal = [] } = useClientsNearCommissionGoal();
  const { data: iaAgendaSales } = useIAAgendaSales(selectedMonth);
  const { data: iaAgendaRecurrence } = useIAAgendaRecurrence(selectedMonth);
  const { data: iaRenewals } = useIARenewals(selectedMonth);
  const { data: iaEvolution = [] } = useIACommissionEvolution();

  // Calculate Herbert's total sales for Cled's bonus
  const herbertTotalSales = useMemo(() => {
    return pipelineClients
      .filter(c => {
        const clientDate = c.dataEntrada || c.entryDate;
        return c.vendedor === 'HERBERT' && 
               c.stage === 'FECHADO' && 
               filterByMonth(clientDate ? new Date(clientDate) : undefined, selectedMonth);
      })
      .reduce((sum, c) => sum + (c.entrada || 0), 0);
  }, [pipelineClients, selectedMonth, filterByMonth]);

  // Commercial vendedor stats with commissions
  const vendedorStats = useMemo(() => {
    const VENDEDOR_ROLE_MAP: Record<string, string> = {
      'HERBERT': 'CLOSER',
      'CLED': 'COORDENADOR',
      'PEDRO_H': 'CLOSER',
      'PEDRO_JUAN': 'CLOSER',
    };

    return VENDEDOR_OPTIONS.map(v => {
      const vendedorClients = pipelineClients.filter(c => {
        const clientDate = c.dataEntrada || c.entryDate;
        return c.vendedor === v.value && filterByMonth(clientDate ? new Date(clientDate) : undefined, selectedMonth);
      });
      
      const closedClients = vendedorClients.filter(c => c.stage === 'FECHADO');
      const closedValue = closedClients.reduce((sum, c) => sum + (c.entrada || 0), 0);

      // Calculate commissions
      let directCommission = 0;
      let bonusCommission = 0;
      let commissionRate = 0;

      if (v.value === 'HERBERT') {
        directCommission = closedValue * RATES.HERBERT_RATE;
        commissionRate = RATES.HERBERT_RATE * 100;
      } else if (v.value === 'CLED') {
        directCommission = closedValue * RATES.CLED_DIRECT_RATE;
        bonusCommission = herbertTotalSales * RATES.CLED_BONUS_RATE;
        commissionRate = RATES.CLED_DIRECT_RATE * 100;
      }

      const totalCommission = directCommission + bonusCommission;

      return {
        vendedor: v.value,
        name: v.label,
        role: VENDEDOR_ROLE_MAP[v.value] || 'CLOSER',
        closedCount: closedClients.length,
        closedValue,
        directCommission,
        bonusCommission,
        totalCommission,
        commissionRate,
      };
    });
  }, [pipelineClients, selectedMonth, filterByMonth, herbertTotalSales, RATES]);

  // Total commercial commission
  const totalCommercialCommission = useMemo(() => {
    return vendedorStats.reduce((sum, v) => sum + v.totalCommission, 0);
  }, [vendedorStats]);

  const totalCommercialSales = useMemo(() => {
    return vendedorStats.reduce((sum, v) => sum + v.closedValue, 0);
  }, [vendedorStats]);

  // Operational renewal commissions by team
  const renewalCommissionsByTeam = useMemo(() => {
    const teamMap: Record<string, { teamName: string; renewals: number; totalValue: number; commission: number }> = {};

    renewals.forEach((renewal: any) => {
      const team = renewal.teams;
      if (!team) return;

      const teamId = team.id;
      const teamName = team.name || 'Equipe Desconhecida';
      const clientValue = renewal.deal_value || 0;
      const commission = clientValue * RATES.RENEWAL_RATE;

      if (!teamMap[teamId]) {
        teamMap[teamId] = { teamName, renewals: 0, totalValue: 0, commission: 0 };
      }

      teamMap[teamId].renewals += 1;
      teamMap[teamId].totalValue += clientValue;
      teamMap[teamId].commission += commission;
    });

    return Object.entries(teamMap).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [renewals, RATES]);

  // Total renewal commission
  const totalRenewalCommission = useMemo(() => {
    return renewalCommissionsByTeam.reduce((sum, t) => sum + t.commission, 0);
  }, [renewalCommissionsByTeam]);

  // Product sales commission calculation (from real CRM events)
  const productSalesTotal = operationalSales?.totalValue || 0;

  const productSalesCommission = productSalesTotal * RATES.PRODUCT_SALES_RATE;
  const perGestorCommission = productSalesCommission / RATES.GESTOR_COUNT;

  // Total operational commission
  const totalOperationalCommission = totalRenewalCommission + productSalesCommission;

  // IA commission calculations
  const iaAgendaSalesCommission = (iaAgendaSales?.totalValue || 0) * RATES.IA_AGENDA_SALES_RATE;
  const iaRecurrenceCommission = (iaAgendaRecurrence?.totalValue || 0) * RATES.IA_AGENDA_RECURRENCE_RATE;
  const iaRenewalCommission = iaRenewals?.commission || 0;
  const totalIACommission = iaAgendaSalesCommission + iaRecurrenceCommission + iaRenewalCommission;

  // Chart data for comparison
  const commissionComparisonData = [
    { name: 'Comercial', value: totalCommercialCommission },
    { name: 'Operacional', value: totalOperationalCommission },
    { name: 'IA', value: totalIACommission },
  ];

  const operationalBreakdownData = [
    { name: 'Renovações', value: totalRenewalCommission },
    { name: 'Vendas de Produtos', value: productSalesCommission },
  ];

  const iaBreakdownData = [
    { name: 'Vendas Agenda', value: iaAgendaSalesCommission },
    { name: 'Recorrência Agenda', value: iaRecurrenceCommission },
    { name: 'Renovações Mensais', value: iaRenewalCommission },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Banknote className="h-8 w-8 text-primary" />
            Comissões
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada das comissões comerciais e operacionais — {currentMonth}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CommissionConfigDialog />
          <MonthPeriodFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Comissões</p>
                  <p className="text-2xl font-bold">
                    {formatBRL(totalCommercialCommission + totalOperationalCommission + totalIACommission)}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Total de Comissões</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma das comissões comerciais, operacionais e IA do período selecionado.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Comerciais</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {formatBRL(totalCommercialCommission)}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Comissões Comerciais</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Herbert: 3% vendas próprias. Cled: 1.5% vendas próprias + 3% vendas do Herbert.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Operacionais</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {formatBRL(totalOperationalCommission)}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Comissões Operacionais</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    3% sobre renovações (clientes mensais 3+ meses) + 25% vendas de produtos (dividido entre 4 gestores).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões IA</p>
                  <p className="text-2xl font-bold text-cyan-500">
                    {formatBRL(totalIACommission)}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Comissões IA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    20% sobre vendas de agenda + 20% recorrência agenda + 3% renovações mensais.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p className="text-2xl font-bold">
                    R$ {(totalCommercialSales / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">Faturamento Total</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor total de vendas fechadas no setor comercial no período.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Commercial, Operational, and IA */}
      <Tabs defaultValue="commercial" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="commercial" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Comercial
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2">
            <Users className="h-4 w-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-2">
            <Bot className="h-4 w-4" />
            IA
          </TabsTrigger>
        </TabsList>

        {/* Commercial Tab */}
        <TabsContent value="commercial" className="space-y-6">
          {/* Commission Details Cards */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Comissões por Vendedor
              </CardTitle>
              <CardDescription>
                Detalhamento das comissões do time comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendedorStats
                  .filter(v => v.role !== 'SDR')
                  .map(stat => (
                    <Card key={stat.vendedor} className="border-border/30 bg-surface-2">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {stat.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-lg">{stat.name}</p>
                            <Badge variant="outline" className={ROLE_BADGES[stat.role]}>
                              {stat.role}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Vendas próprias</span>
                            <span className="font-medium">
                              R$ {stat.closedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Percent className="h-3 w-3" />
                              Comissão direta ({stat.commissionRate}%)
                            </span>
                            <span className="font-medium text-success">
                              R$ {stat.directCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {stat.vendedor === 'CLED' && (
                            <>
                              <div className="border-t border-border/30 pt-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Vendas do Herbert</span>
                                  <span className="font-medium">
                                    R$ {herbertTotalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Percent className="h-3 w-3" />
                                  Bônus Herbert (3%)
                                </span>
                                <span className="font-medium text-amber-400">
                                  R$ {stat.bonusCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}

                          <div className="border-t border-primary/30 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Total Comissão</span>
                              <span className="font-bold text-lg text-success">
                                R$ {stat.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Commercial Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Ranking por Comissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="w-12 text-muted-foreground">#</TableHead>
                    <TableHead className="text-muted-foreground">Vendedor</TableHead>
                    <TableHead className="text-muted-foreground text-center">Fechados</TableHead>
                    <TableHead className="text-muted-foreground text-right">Faturamento</TableHead>
                    <TableHead className="text-muted-foreground text-right">Taxa</TableHead>
                    <TableHead className="text-muted-foreground text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedorStats
                    .filter(v => v.totalCommission > 0)
                    .sort((a, b) => b.totalCommission - a.totalCommission)
                    .map((stat, index) => (
                      <TableRow key={stat.vendedor} className={cn(
                        "border-border/20",
                        index === 0 && "bg-yellow-500/5",
                        index === 1 && "bg-gray-500/5",
                        index === 2 && "bg-amber-500/5"
                      )}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {index < 3 ? (
                              <Trophy className={cn(
                                "h-5 w-5",
                                index === 0 && "text-yellow-400",
                                index === 1 && "text-gray-300",
                                index === 2 && "text-amber-600"
                              )} />
                            ) : (
                              <span className="text-muted-foreground font-medium">{index + 1}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {stat.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{stat.name}</p>
                              <Badge variant="outline" className={cn("text-xs", ROLE_BADGES[stat.role])}>
                                {stat.role}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-success">{stat.closedCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">
                            R$ {stat.closedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground">{stat.commissionRate}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-success">
                            R$ {stat.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-6">
          {/* Operational Commission Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                  Comissão por Renovações
                </CardTitle>
                <CardDescription>
                  3% sobre o valor total de renovações de clientes mensais (3+ meses)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Renovações</span>
                    <span className="font-semibold">{renewals.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Valor Total Renovado</span>
                    <span className="font-semibold">
                      R$ {renewalCommissionsByTeam.reduce((sum, t) => sum + t.totalValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <span className="font-medium">Comissão Total (3%)</span>
                    <span className="font-bold text-green-500 text-lg">
                      R$ {totalRenewalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  Comissão por Vendas de Produtos
                </CardTitle>
                <CardDescription>
                  25% dividido entre os 4 gestores operacionais que vendem produtos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Total Vendas</span>
                    <span className="font-semibold">{operationalSales?.count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Valor Total Vendido</span>
                    <span className="font-semibold">
                      R$ {productSalesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <span className="font-medium">Comissão Total (25%)</span>
                    <span className="font-bold text-purple-500 text-lg">
                      R$ {productSalesCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Por Gestor (÷4)</span>
                    <span className="font-semibold text-purple-400">
                      R$ {perGestorCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Renewal Commissions by Team */}
          {renewalCommissionsByTeam.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Comissões de Renovação por Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Equipe</TableHead>
                      <TableHead className="text-muted-foreground text-center">Renovações</TableHead>
                      <TableHead className="text-muted-foreground text-right">Valor Total</TableHead>
                      <TableHead className="text-muted-foreground text-right">Comissão (3%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalCommissionsByTeam.map(team => (
                      <TableRow key={team.id} className="border-border/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-green-500" />
                            </div>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{team.renewals}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {team.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-green-500">
                            R$ {team.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Gestors Commission Distribution */}
          {gestors.length > 0 && productSalesCommission > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Distribuição de Comissão por Gestor
                </CardTitle>
                <CardDescription>
                  25% do valor de vendas de produtos dividido igualmente entre os gestores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {gestors.slice(0, 4).map((gestor, index) => (
                    <Card key={gestor.id} className="border-border/30 bg-surface-2">
                      <CardContent className="p-4 text-center">
                        <Avatar className="h-12 w-12 mx-auto mb-3">
                          <AvatarFallback className="bg-purple-500/10 text-purple-500">
                            {gestor.full_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium mb-1">{gestor.full_name}</p>
                        <Badge variant="outline" className={ROLE_BADGES['GESTOR']}>
                          Gestor
                        </Badge>
                        <div className="mt-3 p-2 bg-purple-500/10 rounded-lg">
                          <span className="font-bold text-purple-500">
                            R$ {perGestorCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {gestors.length < 4 && Array.from({ length: 4 - gestors.length }).map((_, i) => (
                    <Card key={`placeholder-${i}`} className="border-border/30 bg-surface-2 border-dashed">
                      <CardContent className="p-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/20 mx-auto mb-3 flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                        <p className="font-medium text-muted-foreground mb-1">Gestor {gestors.length + i + 1}</p>
                        <div className="mt-3 p-2 bg-muted/10 rounded-lg">
                          <span className="font-bold text-muted-foreground">
                            R$ {perGestorCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clients Near Commission Goal */}
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Clientes Próximos da Meta de Comissão
                  </CardTitle>
                  <CardDescription>
                    Clientes mensais em processo de renovação — comissão de 3% após 3 meses
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">Meta de Comissão Operacional</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clientes mensais que renovarem por 3 meses geram 3% de comissão sobre o valor total pago.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {clientsNearGoal.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum cliente mensal ativo no momento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Elegíveis para Comissão</p>
                        <p className="font-bold text-green-500">
                          {clientsNearGoal.filter(c => c.isEligibleForCommission).length} clientes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Faltando 1-2 meses</p>
                        <p className="font-bold text-amber-500">
                          {clientsNearGoal.filter(c => c.monthsToGoal > 0 && c.monthsToGoal <= 2).length} clientes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão Potencial</p>
                        <p className="font-bold text-blue-500">
                          R$ {clientsNearGoal.filter(c => !c.isEligibleForCommission).reduce((sum, c) => sum + c.potentialCommission, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clients Table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Cliente</TableHead>
                        <TableHead className="text-muted-foreground">Equipe</TableHead>
                        <TableHead className="text-muted-foreground text-center">Meses Ativos</TableHead>
                        <TableHead className="text-muted-foreground text-center">Meta</TableHead>
                        <TableHead className="text-muted-foreground text-right">Valor Mensal</TableHead>
                        <TableHead className="text-muted-foreground text-right">Comissão (3%)</TableHead>
                        <TableHead className="text-muted-foreground text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsNearGoal.slice(0, 15).map((client) => (
                        <TableRow key={client.id} className={cn(
                          "border-border/20",
                          client.isEligibleForCommission && "bg-green-500/5",
                          client.monthsToGoal === 1 && "bg-amber-500/5"
                        )}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center",
                                client.isEligibleForCommission ? "bg-green-500/10" : "bg-amber-500/10"
                              )}>
                                {client.isEligibleForCommission ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{client.client_name}</p>
                                {client.clinic_name && (
                                  <p className="text-xs text-muted-foreground">{client.clinic_name}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {client.teamName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {[1, 2, 3].map((month) => (
                                <div
                                  key={month}
                                  className={cn(
                                    "h-3 w-3 rounded-full",
                                    client.renewalMonths >= month ? "bg-green-500" : "bg-muted"
                                  )}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {client.renewalMonths} {client.renewalMonths === 1 ? 'mês' : 'meses'}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            {client.isEligibleForCommission ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Atingida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                                Falta {client.monthsToGoal} {client.monthsToGoal === 1 ? 'mês' : 'meses'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              R$ {(client.deal_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-bold",
                              client.isEligibleForCommission ? "text-green-500" : "text-muted-foreground"
                            )}>
                              R$ {client.potentialCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {client.isEligibleForCommission ? (
                              <div className="flex items-center justify-center gap-1 text-green-500">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Elegível</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-amber-500">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">Pendente</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {clientsNearGoal.length > 15 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      Mostrando 15 de {clientsNearGoal.length} clientes
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA Tab */}
        <TabsContent value="ia" className="space-y-6">
          {/* IA Commission Rules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cyan-500" />
                  Vendas de Agenda
                </CardTitle>
                <CardDescription>
                  20% sobre o valor de cada venda de agenda operacional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Agendas Vendidas</span>
                    <span className="font-semibold">{iaAgendaSales?.count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Valor Total Vendido</span>
                    <span className="font-semibold">
                      R$ {(iaAgendaSales?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <span className="font-medium">Comissão (20%)</span>
                    <span className="font-bold text-cyan-500 text-lg">
                      R$ {iaAgendaSalesCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-teal-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-teal-500" />
                  Recorrência de Agenda
                </CardTitle>
                <CardDescription>
                  20% sobre valor de agendas recorrentes (clientes que pagaram taxa)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Clientes Recorrentes</span>
                    <span className="font-semibold">{iaAgendaRecurrence?.count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Valor Total Recorrente</span>
                    <span className="font-semibold">
                      R$ {(iaAgendaRecurrence?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-teal-500/10 rounded-lg border border-teal-500/30">
                    <span className="font-medium">Comissão (20%)</span>
                    <span className="font-bold text-teal-500 text-lg">
                      R$ {iaRecurrenceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Renovações Mensais
                </CardTitle>
                <CardDescription>
                  3% sobre o valor total de cada renovação mensal de clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Renovações no Mês</span>
                    <span className="font-semibold">{iaRenewals?.count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-2 rounded-lg">
                    <span className="text-sm text-muted-foreground">Valor Total Renovado</span>
                    <span className="font-semibold">
                      R$ {(iaRenewals?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <span className="font-medium">Comissão (3%)</span>
                    <span className="font-bold text-blue-500 text-lg">
                      R$ {iaRenewalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* IA Total Summary */}
          <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-cyan-500" />
                    Resumo Total - Comissões IA
                  </CardTitle>
                  <CardDescription>
                    Consolidação de todas as comissões do setor de IA
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">Regras de Comissão IA</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      • 20% sobre vendas de agenda<br />
                      • 20% sobre recorrência de agenda<br />
                      • 3% sobre renovações mensais
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm text-muted-foreground">Vendas Agenda</span>
                  </div>
                  <p className="text-xl font-bold text-cyan-500">
                    R$ {iaAgendaSalesCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-teal-500" />
                    <span className="text-sm text-muted-foreground">Recorrência</span>
                  </div>
                  <p className="text-xl font-bold text-teal-500">
                    R$ {iaRecurrenceCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Renovações</span>
                  </div>
                  <p className="text-xl font-bold text-blue-500">
                    R$ {iaRenewalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium">Total IA</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400">
                    R$ {totalIACommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IA Renewals Detail Table */}
          {(iaRenewals?.renewals?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Detalhamento de Renovações
                </CardTitle>
                <CardDescription>
                  Clientes que renovaram no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Cliente</TableHead>
                      <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                      <TableHead className="text-muted-foreground text-right">Comissão (3%)</TableHead>
                      <TableHead className="text-muted-foreground text-center">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {iaRenewals?.renewals?.map((renewal: any) => (
                      <TableRow key={renewal.id} className="border-border/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <RefreshCw className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="font-medium">{renewal.client_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(renewal.deal_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-blue-500">
                            R$ {((renewal.deal_value || 0) * RATES.IA_RENEWAL_RATE).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {renewal.renewal_date ? new Date(renewal.renewal_date).toLocaleDateString('pt-BR') : '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* IA Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Composição de Comissões IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={iaBreakdownData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                    >
                      {iaBreakdownData.filter(d => d.value > 0).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#06b6d4', '#14b8a6', '#3b82f6'][index % 3]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={60}
                      formatter={(value: string, entry: any) => {
                        const item = iaBreakdownData.find(d => d.name === value);
                        const total = iaBreakdownData.reduce((sum, d) => sum + d.value, 0);
                        const percent = total > 0 ? ((item?.value || 0) / total * 100).toFixed(0) : 0;
                        return `${value} (${percent}%)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {iaBreakdownData.every(d => d.value === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Sem dados de comissões IA no período selecionado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IA Commission Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                Evolução Mensal - Comissões IA
              </CardTitle>
              <CardDescription>
                Acompanhamento das comissões nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={iaEvolution}>
                    <defs>
                      <linearGradient id="colorAgenda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRecorrencia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRenovacoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          agenda: 'Vendas Agenda',
                          recorrencia: 'Recorrência',
                          renovacoes: 'Renovações',
                          total: 'Total',
                        };
                        return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, labels[name] || name];
                      }}
                    />
                    <Legend 
                      formatter={(value: string) => {
                        const labels: Record<string, string> = {
                          agenda: 'Vendas Agenda',
                          recorrencia: 'Recorrência',
                          renovacoes: 'Renovações',
                          total: 'Total',
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="agenda" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      fill="url(#colorAgenda)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="recorrencia" 
                      stroke="#14b8a6" 
                      strokeWidth={2}
                      fill="url(#colorRecorrencia)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="renovacoes" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#colorRenovacoes)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {iaEvolution.every(d => d.total === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Sem dados de evolução no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparativo de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Comissão']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Composição Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operationalBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {operationalBreakdownData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
