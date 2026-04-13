import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Crown, TrendingUp, Users, DollarSign, Target, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, Trophy, Wifi, BarChart3, HelpCircle,
  RefreshCw, UserX, UserPlus, TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCEOMetrics, useCEOChampionshipTeams } from '@/hooks/useCEOData';
import { useCEORealtime } from '@/hooks/useCEORealtime';
import { useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { ActivityFeed } from '@/components/ceo/ActivityFeed';
import { CEOTrendCharts } from '@/components/ceo/CEOTrendCharts';
import { CEOAlerts } from '@/components/ceo/CEOAlerts';
import { CEOGoalsProgress } from '@/components/ceo/CEOGoalsProgress';
import { CEOKPICard } from '@/components/ceo/CEOKPICard';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { useMRRHistory } from '@/hooks/useMRRHistory';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, Area
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function CEODashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const { monthOptions } = useMonthFilter(12);
  
  // Enable real-time updates for all CEO data
  useCEORealtime();
  
  const { data: metrics, isLoading, error, dataUpdatedAt } = useCEOMetrics(selectedPeriod);
  const { data: championshipTeams } = useCEOChampionshipTeams();
  const { data: teamMetrics } = useTeamMetrics(selectedPeriod);
  const { data: mrrHistory } = useMRRHistory(6);

  // Fetch team dashboard metrics (clients per team)
  const { data: teamDashboardMetrics = [] } = useQuery({
    queryKey: ['ceo-team-dashboard', selectedPeriod],
    queryFn: async () => {
      const [year, month] = selectedPeriod.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      
      // Fetch clients and teams in parallel
      const [clientsRes, teamsRes] = await Promise.all([
        supabase
          .from('operational_clients')
          .select('id, team_id, status_operacional, renewal_status, churn_date, created_at, activated_at'),
        supabase
          .from('teams')
          .select('id, name')
          .order('name')
      ]);
      
      if (clientsRes.error) throw clientsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      
      const clients = clientsRes.data || [];
      const teams = teamsRes.data || [];
      
      // Calculate metrics per team
      const metricsMap: Record<string, { teamId: string; teamName: string; activeClients: number; newClients: number; churnedClients: number; renewals: number }> = {};
      
      teams.forEach(team => {
        metricsMap[team.id] = {
          teamId: team.id,
          teamName: team.name,
          activeClients: 0,
          newClients: 0,
          churnedClients: 0,
          renewals: 0,
        };
      });

      clients.forEach(client => {
        if (!client.team_id || !metricsMap[client.team_id]) return;
        
        const team = metricsMap[client.team_id];
        
        // Count active clients
        if (client.status_operacional === 'ATIVO') {
          team.activeClients++;
        }
        
        // Count new clients (activated this month)
        const activatedAt = client.activated_at ? new Date(client.activated_at) : null;
        if (activatedAt && activatedAt >= monthStart && activatedAt <= monthEnd) {
          team.newClients++;
        }
        
        // Count churned clients this month
        if (client.churn_date) {
          const churnDate = new Date(client.churn_date);
          if (churnDate >= monthStart && churnDate <= monthEnd) {
            team.churnedClients++;
          }
        }
        
        // Count renewals
        if (client.renewal_status === 'RENEWED') {
          team.renewals++;
        }
      });

      return Object.values(metricsMap).filter(m => 
        m.activeClients > 0 || m.newClients > 0 || m.churnedClients > 0 || m.renewals > 0
      );
    },
  });

  // Calculate totals for team dashboard
  const teamDashboardTotals = useMemo(() => {
    return teamDashboardMetrics.reduce(
      (acc, team) => ({
        activeClients: acc.activeClients + team.activeClients,
        newClients: acc.newClients + team.newClients,
        churnedClients: acc.churnedClients + team.churnedClients,
        renewals: acc.renewals + team.renewals,
      }),
      { activeClients: 0, newClients: 0, churnedClients: 0, renewals: 0 }
    );
  }, [teamDashboardMetrics]);

  const getTeamColor = (teamName: string) => {
    const name = teamName.toLowerCase();
    if (name.includes('elite') || name.includes('lira')) return 'bg-red-500';
    if (name.includes('7') || name.includes('kauan')) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Prepare chart data
  const productsByTeamData = metrics?.productsSold?.byTeam 
    ? Object.entries(metrics.productsSold.byTeam).map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value,
      }))
    : [];

  // Team metrics chart data
  const teamMetricsChartData = teamMetrics?.map(team => ({
    name: team.name,
    renovacoes: team.renewals,
    perdas: team.losses,
    mrr: team.mrr,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-semibold">Erro ao carregar o Dashboard CEO</h1>
          <p className="text-sm text-muted-foreground">Tente recarregar a página. Se persistir, verifique as permissões de acesso aos dados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">CEO Dashboard</h1>
            <Badge variant="outline" className="ml-2 gap-1 text-green-600 border-green-600">
              <Wifi className="h-3 w-3 animate-pulse" />
              Tempo Real
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Panorama geral — Comercial + Operacional
            {dataUpdatedAt && (
              <span className="ml-2 text-xs">
                (Atualizado: {format(new Date(dataUpdatedAt), 'HH:mm:ss')})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.slice(0, 12).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Commercial KPIs */}
        <CEOKPICard
          title="Receita (Comercial)"
          value={formatCurrency(metrics?.commercial.revenue || 0)}
          subtitle={`Ticket médio: ${formatCurrency(metrics?.commercial.ticketAvg || 0)}`}
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          description="Soma dos valores de entrada dos clientes FECHADOS no período selecionado no setor Comercial (pipeline)."
          dataSource="Tabela: pipeline_clients (stage = FECHADO, entrada no período)"
        />

        <CEOKPICard
          title="MRR (Previsão)"
          value={formatCurrency(metrics?.commercial.mrrEstimated || 0)}
          subtitle={`Realizado: ${formatCurrency((metrics?.commercial as any)?.recurrenceActual || 0)}`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description="MRR Previsão: pagamentos esperados no mês baseado nos ciclos dos planos (mensal=todo mês, trimestral=a cada 3 meses, semestral=a cada 6 meses). Realizado: renovações confirmadas no período."
          dataSource="Previsão: ciclo de pagamento dos clientes ATIVO | Realizado: operational_clients (renewal_status = 'RENEWED' no período)"
        />

        <CEOKPICard
          title="Fechados"
          value={metrics?.commercial.closedDeals || 0}
          subtitle={`Conversão: ${(metrics?.commercial.conversion || 0).toFixed(1)}%`}
          icon={<Target className="h-4 w-4 text-primary" />}
          description="Quantidade de clientes que foram fechados no período no setor Comercial. A conversão é calculada como (fechados / reuniões agendadas)."
          dataSource="Tabela: pipeline_clients (stage = FECHADO no período)"
        />

        <CEOKPICard
          title="Clientes Ativos"
          value={metrics?.operational.activeClients || 0}
          subtitle={`+${metrics?.operational.newClients || 0} novos`}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Total de clientes com status ATIVO no momento. Representa a base ativa de clientes sendo atendidos pela operação."
          dataSource="Tabela: operational_clients (status_operacional = 'ATIVO')"
        />

        <CEOKPICard
          title="Renovações"
          value={(metrics?.operational as any)?.renewals || 0}
          subtitle={`Onboarding: ${metrics?.operational.onboardingClients || 0}`}
          icon={<RefreshCw className="h-4 w-4 text-green-600" />}
          description="Quantidade de clientes que renovaram contrato no período. Indica retenção e satisfação dos clientes."
          dataSource="Tabela: operational_clients (renewal_status = 'RENEWED' no período)"
          valueClassName="text-green-600"
        />

        <CEOKPICard
          title="Perdas"
          value={metrics?.operational.lostClients || 0}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          description="Clientes que cancelaram ou encerraram contrato no período. Indica churn e requer atenção para entender os motivos."
          dataSource="Tabela: operational_clients (churn_date no período ou status ENCERRADO/CANCELADO)"
          valueClassName="text-destructive"
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CEOKPICard
          title="Tarefas Concluídas"
          value={metrics?.operational.tasksDone || 0}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          description="Total de cards/tarefas finalizadas no período. Inclui exec_cards (Kanban) e work_items concluídos pelas equipes operacionais."
          dataSource="Tabelas: exec_cards (completed_at no período) + work_items (status CONCLUIDA)"
        />

        <CEOKPICard
          title="Bloqueios"
          value={metrics?.operational.tasksBlocked || 0}
          icon={<Clock className="h-4 w-4 text-orange-500" />}
          description="Tarefas com prioridade URGENTE/ALTA não concluídas + work_items com status BLOQUEADO. Indica gargalos na operação."
          dataSource="Tabelas: exec_cards (priority URGENTE/ALTA sem completed_at) + work_items (status BLOQUEADO)"
          valueClassName="text-orange-500"
        />

        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              SLA OK
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">SLA OK</p>
                    <p className="text-xs text-muted-foreground">Percentual de tarefas concluídas sem bloqueio. Quanto maior, melhor a eficiência operacional. Calculado como: (tarefas concluídas / total de tarefas) × 100.</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Cálculo: tasksDone / (tasksDone + tasksBlocked) × 100</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.operational.slaOkPct || 0).toFixed(0)}%</div>
            <Progress value={metrics?.operational.slaOkPct || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              % de tarefas entregues sem bloqueio
            </p>
          </CardContent>
        </Card>

        <CEOKPICard
          title="Produtos Vendidos"
          value={metrics?.productsSold?.total || 0}
          subtitle={formatCurrency((metrics?.productsSold as any)?.totalValue || 0)}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          description="Vendas adicionais (upsell) registradas no período. Inclui vendas operacionais via CRM e itens do Championship."
          dataSource="Tabelas: crm_events (VENDA_OPERACIONAL) + championship_events (ITEM_SOLD)"
        />
      </div>

      {/* Goals Progress Section */}
      <CEOGoalsProgress period={selectedPeriod} />

      {/* Trend Charts and Alerts Section */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="trends" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <Target className="h-4 w-4" />
            Detalhes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* MRR Forecast vs Actual Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                MRR: Previsão vs Realizado (Últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mrrHistory && mrrHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={mrrHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                        name === 'mrrForecast' ? 'Previsão' : 'Realizado'
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Legend 
                      formatter={(value) => value === 'mrrForecast' ? 'Previsão' : 'Realizado'}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mrrForecast" 
                      fill="hsl(var(--primary) / 0.2)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="mrrForecast"
                    />
                    <Bar 
                      dataKey="mrrActual" 
                      fill="hsl(var(--chart-2))" 
                      name="mrrActual"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Carregando dados históricos...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CEOTrendCharts />
            </div>
            <div className="space-y-6">
              <CEOAlerts maxVisible={6} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Team Metrics Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Métricas por Equipe
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {monthOptions.find(opt => opt.value === selectedPeriod)?.label || selectedPeriod}
                </Badge>
              </CardHeader>
              <CardContent>
                {teamMetricsChartData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Bar Chart for Renewals and Losses */}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={teamMetricsChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="renovacoes" fill="hsl(var(--chart-2))" name="Renovações" />
                        <Bar dataKey="perdas" fill="hsl(var(--destructive))" name="Perdas" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* MRR Cards per Team */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">MRR por Equipe</h4>
                      <div className="grid gap-3">
                        {teamMetricsChartData.map((team, index) => (
                          <div 
                            key={team.name} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">{team.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <RefreshCw className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-green-600 font-medium">{team.renovacoes}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <UserX className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-destructive font-medium">{team.perdas}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-primary">{formatCurrency(team.mrr)}</span>
                                <span className="text-xs text-muted-foreground ml-1">MRR</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma equipe encontrada
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products by Team */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos Vendidos por Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                {productsByTeamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productsByTeamData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, count }) => `${name}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {productsByTeamData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, _name: any, props: any) => [
                        `${value} vendas (${formatCurrency(props.payload.value)})`,
                        props.payload.name
                      ]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum produto vendido no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed + Championship Preview */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Activity Feed */}
            <ActivityFeed limit={15} />

            {/* Championship Dashboard with Team Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Champions Great League - Métricas por Equipe
                </CardTitle>
                <Badge variant="outline">
                  {format(new Date(selectedPeriod + '-01'), 'MMMM yyyy', { locale: ptBR })}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Ativos</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{teamDashboardTotals.activeClients}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Chegaram</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-1">+{teamDashboardTotals.newClients}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Churns</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-1">-{teamDashboardTotals.churnedClients}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Renovações</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{teamDashboardTotals.renewals}</p>
                  </div>
                </div>

                {/* Metrics by Team */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Por Equipe
                  </h4>
                  {teamDashboardMetrics.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhuma métrica disponível para este período
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamDashboardMetrics.map(team => (
                        <div 
                          key={team.teamId}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getTeamColor(team.teamName)}`} />
                            <span className="font-medium text-sm">{team.teamName}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-semibold">{team.activeClients}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-green-600">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span className="font-semibold">+{team.newClients}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-red-600">
                              <TrendingDown className="h-3.5 w-3.5" />
                              <span className="font-semibold">-{team.churnedClients}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="font-semibold">{team.renewals}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Championship Ranking Preview */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">Ranking do Campeonato</h4>
                  <div className="space-y-2">
                    {championshipTeams?.slice(0, 3).map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-sm">{team.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{team.total_points} pts</span>
                          <Badge variant="secondary" className="text-xs">
                            {team.renewals} renov.
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
