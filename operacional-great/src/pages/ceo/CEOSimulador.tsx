import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calculator, Plus, Trash2, Copy, TrendingUp, ArrowRight, 
  Building2, LineChart, Target, Calendar, Percent, DollarSign, Wifi, HelpCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  useTeamCostConfig, 
  useFinanceSimulations, 
  useCreateFinanceSimulation,
  useDeleteFinanceSimulation,
  useCEOTeams
} from '@/hooks/useCEOData';
import { useCEORealtime } from '@/hooks/useCEORealtime';
import { useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';

// Hook para buscar dados de vendas recorrentes com MRR proporcional ao plano
function useRecurringRevenueData() {
  return useQuery({
    queryKey: ['recurring-revenue-data'],
    queryFn: async () => {
      // Buscar clientes ativos
      const { data: clients, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, deal_value, plan, status_operacional, created_at')
        .eq('status_operacional', 'ATIVO');

      if (error) throw error;

      // Calcular MRR proporcional ao plano
      // MENSAL = valor / 1, TRIMESTRAL = valor / 3, SEMESTRAL = valor / 6
      const monthlyRevenue = clients?.reduce((sum, c) => {
        const value = c.deal_value || 0;
        const plan = (c.plan || 'MENSAL').toUpperCase();
        let divisor = 1;
        if (plan === 'TRIMESTRAL') divisor = 3;
        else if (plan === 'SEMESTRAL') divisor = 6;
        else if (plan === 'ANUAL') divisor = 12;
        return sum + (value / divisor);
      }, 0) || 0;
      
      const clientCount = clients?.length || 0;
      const avgTicket = clientCount > 0 ? monthlyRevenue / clientCount : 0;

      return {
        monthlyRevenue,
        clientCount,
        avgTicket,
        clients: clients || []
      };
    }
  });
}

// Hook para buscar média de produtos vendidos por mês (últimos 6 meses)
function useAverageMonthlySales() {
  return useQuery({
    queryKey: ['average-monthly-sales'],
    queryFn: async () => {
      const sixMonthsAgo = addMonths(new Date(), -6);
      
      // Buscar vendas operacionais (CRM events)
      const { data: crmEvents, error: crmError } = await supabase
        .from('crm_events')
        .select('id, sale_value, created_at')
        .eq('event_type', 'VENDA_OPERACIONAL')
        .gte('created_at', sixMonthsAgo.toISOString());

      if (crmError) throw crmError;

      // Agrupar por mês
      const monthlyData: Record<string, { count: number; revenue: number }> = {};
      
      crmEvents?.forEach(event => {
        const month = format(new Date(event.created_at), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, revenue: 0 };
        }
        monthlyData[month].count++;
        monthlyData[month].revenue += event.sale_value || 0;
      });

      const months = Object.keys(monthlyData);
      const avgProductsPerMonth = months.length > 0 
        ? months.reduce((sum, m) => sum + monthlyData[m].count, 0) / months.length 
        : 0;
      const avgRevenuePerMonth = months.length > 0
        ? months.reduce((sum, m) => sum + monthlyData[m].revenue, 0) / months.length
        : 0;

      return {
        avgProductsPerMonth: Math.round(avgProductsPerMonth * 10) / 10,
        avgRevenuePerMonth,
        monthlyData
      };
    }
  });
}

export default function CEOSimulador() {
  // Enable real-time updates
  useCEORealtime();
  
  const [activeTab, setActiveTab] = useState('teams');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [simulationForm, setSimulationForm] = useState({
    name: '',
    base_period: format(new Date(), 'yyyy-MM'),
    new_teams_count: 1,
    cost_per_team: 13000,
    estimated_revenue: '',
    notes: '',
  });

  // Revenue projection state
  const [projectionMonths, setProjectionMonths] = useState(6);
  const [growthRate, setGrowthRate] = useState(0); // % de crescimento mensal nas vendas
  const [churnRate, setChurnRate] = useState(5); // % de cancelamento mensal
  const [customProducts, setCustomProducts] = useState<number | null>(null);
  const [customMonthlyRevenue, setCustomMonthlyRevenue] = useState<number | null>(null);

  const { monthOptions } = useMonthFilter(12);
  const { data: costConfig } = useTeamCostConfig();
  const { data: simulations, isLoading } = useFinanceSimulations();
  const { data: teams } = useCEOTeams();
  const createSimulation = useCreateFinanceSimulation();
  const deleteSimulation = useDeleteFinanceSimulation();

  // Revenue data
  const { data: revenueData } = useRecurringRevenueData();
  const { data: salesData } = useAverageMonthlySales();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCreateSimulation = async () => {
    if (!simulationForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      await createSimulation.mutateAsync({
        name: simulationForm.name,
        base_period: simulationForm.base_period,
        new_teams_count: simulationForm.new_teams_count,
        cost_per_team: simulationForm.cost_per_team,
        estimated_revenue: simulationForm.estimated_revenue ? parseFloat(simulationForm.estimated_revenue) : undefined,
        notes: simulationForm.notes || undefined,
      });
      toast.success('Simulação criada!');
      setCreateDialogOpen(false);
      setSimulationForm({
        name: '',
        base_period: format(new Date(), 'yyyy-MM'),
        new_teams_count: 1,
        cost_per_team: costConfig?.default_team_cost || 13000,
        estimated_revenue: '',
        notes: '',
      });
    } catch {
      toast.error('Erro ao criar simulação');
    }
  };

  const handleDeleteSimulation = async (id: string) => {
    try {
      await deleteSimulation.mutateAsync(id);
      toast.success('Simulação excluída');
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleDuplicateSimulation = (sim: any) => {
    setSimulationForm({
      name: `${sim.name} (cópia)`,
      base_period: sim.base_period,
      new_teams_count: sim.new_teams_count,
      cost_per_team: sim.cost_per_team,
      estimated_revenue: sim.estimated_revenue?.toString() || '',
      notes: sim.notes || '',
    });
    setCreateDialogOpen(true);
  };

  // Live calculation preview
  const liveExtraCost = simulationForm.new_teams_count * simulationForm.cost_per_team;
  const liveMargin = simulationForm.estimated_revenue 
    ? parseFloat(simulationForm.estimated_revenue) - liveExtraCost 
    : null;

  // Current teams count
  const currentTeamsCount = teams?.length || 0;
  const currentTotalCost = currentTeamsCount * (costConfig?.default_team_cost || 13000);
  const projectedTeamsCount = currentTeamsCount + simulationForm.new_teams_count;
  const projectedTotalCost = projectedTeamsCount * simulationForm.cost_per_team;

  // Revenue projection calculations
  const currentMonthlyRevenue = revenueData?.monthlyRevenue || 0;
  const currentClientCount = revenueData?.clientCount || 0;
  
  // Use valor total mensal (customizado ou média) e produtos vendidos por mês
  const monthlyRevenueToAdd = customMonthlyRevenue ?? salesData?.avgRevenuePerMonth ?? 0;
  const productsPerMonth = customProducts ?? salesData?.avgProductsPerMonth ?? 0;
  const avgTicketPerProduct = productsPerMonth > 0 ? monthlyRevenueToAdd / productsPerMonth : revenueData?.avgTicket || 0;

  // Calculate projection data
  const projectionData = [];
  let runningClients = currentClientCount;
  let runningRevenue = currentMonthlyRevenue;
  let cumulativeRevenue = 0;

  for (let i = 0; i <= projectionMonths; i++) {
    const date = addMonths(new Date(), i);
    const monthLabel = format(date, 'MMM/yy', { locale: ptBR });
    
    if (i === 0) {
      projectionData.push({
        month: monthLabel,
        clientes: runningClients,
        receitaMensal: runningRevenue,
        receitaAcumulada: runningRevenue,
        produtosVendidos: 0,
        cancelamentos: 0,
      });
      cumulativeRevenue = runningRevenue;
    } else {
      // Apply growth rate to products sold
      const growthMultiplier = 1 + (growthRate / 100);
      const newProducts = Math.round(productsPerMonth * Math.pow(growthMultiplier, i - 1));
      
      // Apply churn
      const cancelledClients = Math.round(runningClients * (churnRate / 100));
      
      // Products add to revenue directly (not creating new clients)
      const additionalRevenue = newProducts * avgTicketPerProduct;
      
      runningClients = runningClients - cancelledClients;
      runningRevenue = runningRevenue + additionalRevenue - (cancelledClients * (revenueData?.avgTicket || 0));
      runningRevenue = Math.max(0, runningRevenue); // Don't go negative
      cumulativeRevenue += runningRevenue;
      
      projectionData.push({
        month: monthLabel,
        clientes: runningClients,
        receitaMensal: runningRevenue,
        receitaAcumulada: cumulativeRevenue,
        produtosVendidos: newProducts,
        cancelamentos: cancelledClients,
      });
    }
  }

  const finalProjection = projectionData[projectionData.length - 1];
  const revenueGrowth = finalProjection 
    ? ((finalProjection.receitaMensal - currentMonthlyRevenue) / (currentMonthlyRevenue || 1)) * 100 
    : 0;
  const clientGrowth = finalProjection 
    ? ((finalProjection.clientes - currentClientCount) / (currentClientCount || 1)) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Simulador Financeiro</h1>
          </div>
          <p className="text-muted-foreground mt-1">Simule expansão de equipes e projeção de receita</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams" className="gap-2">
            <Building2 className="h-4 w-4" />
            Equipes
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <LineChart className="h-4 w-4" />
            Projeção de Receita
          </TabsTrigger>
        </TabsList>

        {/* Teams Tab - Original content */}
        <TabsContent value="teams" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Simulação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Simulação</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome da simulação *</Label>
                    <Input
                      placeholder="Ex: +1 equipe em março"
                      value={simulationForm.name}
                      onChange={(e) => setSimulationForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Período base</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={simulationForm.base_period}
                        onChange={(e) => setSimulationForm(prev => ({ ...prev, base_period: e.target.value }))}
                      >
                        {monthOptions.slice(0, 12).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Qtd. novas equipes</Label>
                      <Input
                        type="number"
                        min="1"
                        value={simulationForm.new_teams_count}
                        onChange={(e) => setSimulationForm(prev => ({ ...prev, new_teams_count: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Custo por equipe (R$)</Label>
                      <Input
                        type="number"
                        value={simulationForm.cost_per_team}
                        onChange={(e) => setSimulationForm(prev => ({ ...prev, cost_per_team: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Receita estimada (R$) - opcional</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={simulationForm.estimated_revenue}
                        onChange={(e) => setSimulationForm(prev => ({ ...prev, estimated_revenue: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      placeholder="Observações sobre a simulação..."
                      value={simulationForm.notes}
                      onChange={(e) => setSimulationForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  {/* Live Preview */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold">Prévia do cálculo:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Custo adicional mensal:</span>
                        <p className="font-bold text-lg text-orange-600">{formatCurrency(liveExtraCost)}</p>
                      </div>
                      {liveMargin !== null && (
                        <div>
                          <span className="text-muted-foreground">Margem estimada:</span>
                          <p className={`font-bold text-lg ${liveMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {formatCurrency(liveMargin)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button onClick={handleCreateSimulation} className="w-full" disabled={createSimulation.isPending}>
                    {createSimulation.isPending ? 'Criando...' : 'Criar Simulação'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Comparison Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="group relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cenário Atual
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Cenário Atual</p>
                        <p className="text-xs text-muted-foreground">Situação atual das equipes, custos totais e custo médio por equipe baseado na configuração global.</p>
                        <div className="pt-1 border-t">
                          <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                          <p className="text-xs text-muted-foreground">Tabela teams + team_cost_config (custo padrão por equipe)</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipes:</span>
                    <span className="font-bold">{currentTeamsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo total:</span>
                    <span className="font-bold">{formatCurrency(currentTotalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo/equipe:</span>
                    <span className="font-bold">{formatCurrency(costConfig?.default_team_cost || 13000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Simulação Ativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Novas equipes:</span>
                    <span className="font-bold text-primary">+{simulationForm.new_teams_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo adicional:</span>
                    <span className="font-bold text-orange-600">{formatCurrency(liveExtraCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo/equipe:</span>
                    <span className="font-bold">{formatCurrency(simulationForm.cost_per_team)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Projeção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total equipes:</span>
                    <span className="font-bold">{projectedTeamsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo total:</span>
                    <span className="font-bold">{formatCurrency(projectedTotalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variação:</span>
                    <span className="font-bold text-orange-600">+{((liveExtraCost / currentTotalCost) * 100 || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saved Simulations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Simulações Salvas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : simulations && simulations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-center">Novas Equipes</TableHead>
                      <TableHead className="text-right">Custo/Equipe</TableHead>
                      <TableHead className="text-right">Custo Adicional</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map((sim) => (
                      <TableRow key={sim.id}>
                        <TableCell className="font-medium">{sim.name}</TableCell>
                        <TableCell>{sim.base_period}</TableCell>
                        <TableCell className="text-center">+{sim.new_teams_count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sim.cost_per_team)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(sim.estimated_extra_cost)}</TableCell>
                        <TableCell className="text-right">
                          {sim.estimated_margin !== null ? (
                            <span className={sim.estimated_margin >= 0 ? 'text-green-600' : 'text-destructive'}>
                              {formatCurrency(sim.estimated_margin)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {format(new Date(sim.created_at), 'dd/MM/yy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDuplicateSimulation(sim)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteSimulation(sim.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma simulação salva. Crie sua primeira simulação!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Projection Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Current Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Receita Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(currentMonthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground">Recorrência mensal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Clientes Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{currentClientCount}</p>
                <p className="text-xs text-muted-foreground">Contratos fechados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(revenueData?.avgTicket || 0)}</p>
                <p className="text-xs text-muted-foreground">Por cliente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  Produtos/Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{salesData?.avgProductsPerMonth?.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">Média últimos 6 meses</p>
              </CardContent>
            </Card>
          </div>

          {/* Simulation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Parâmetros da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Período de projeção</Label>
                    <span className="text-sm font-medium">{projectionMonths} meses</span>
                  </div>
                  <Slider
                    value={[projectionMonths]}
                    onValueChange={(v) => setProjectionMonths(v[0])}
                    min={3}
                    max={24}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Crescimento vendas</Label>
                    <span className="text-sm font-medium">{growthRate}% ao mês</span>
                  </div>
                  <Slider
                    value={[growthRate]}
                    onValueChange={(v) => setGrowthRate(v[0])}
                    min={-20}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Taxa de churn</Label>
                    <span className="text-sm font-medium">{churnRate}% ao mês</span>
                  </div>
                  <Slider
                    value={[churnRate]}
                    onValueChange={(v) => setChurnRate(v[0])}
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Produtos vendidos/mês</Label>
                  <Input
                    type="number"
                    placeholder={`Atual: ${salesData?.avgProductsPerMonth?.toFixed(1) || 0}`}
                    value={customProducts ?? ''}
                    onChange={(e) => setCustomProducts(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Valor total mensal de vendas (R$)</Label>
                  <Input
                    type="number"
                    placeholder={`Atual: ${formatCurrency(salesData?.avgRevenuePerMonth || 0)}`}
                    value={customMonthlyRevenue ?? ''}
                    onChange={(e) => setCustomMonthlyRevenue(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCustomProducts(null);
                      setCustomMonthlyRevenue(null);
                      setGrowthRate(0);
                      setChurnRate(5);
                      setProjectionMonths(6);
                    }}
                  >
                    Resetar valores
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projection Results */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-green-500/50 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Receita em {projectionMonths} meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(finalProjection?.receitaMensal || 0)}
                </p>
                <p className={`text-sm ${revenueGrowth >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs atual
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes em {projectionMonths} meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {finalProjection?.clientes || 0}
                </p>
                <p className={`text-sm ${clientGrowth >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {clientGrowth >= 0 ? '+' : ''}{clientGrowth.toFixed(1)}% vs atual
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-500/50 bg-purple-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Receita Acumulada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(finalProjection?.receitaAcumulada || 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total no período
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Receita Recorrente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'receitaMensal' ? 'Receita Mensal' : 'Receita Acumulada'
                      ]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <ReferenceLine 
                      y={currentMonthlyRevenue} 
                      stroke="#f97316" 
                      strokeDasharray="5 5"
                      label={{ value: 'Atual', position: 'right', fill: '#f97316' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receitaMensal" 
                      stroke="#22c55e" 
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                      name="Receita Mensal"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Produtos Vendidos</TableHead>
                    <TableHead className="text-center">Cancelados</TableHead>
                    <TableHead className="text-center">Total Clientes</TableHead>
                    <TableHead className="text-right">Receita Mensal</TableHead>
                    <TableHead className="text-right">Acumulada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectionData.map((row, i) => (
                    <TableRow key={i} className={i === 0 ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {row.month}
                        {i === 0 && <span className="ml-2 text-xs text-muted-foreground">(atual)</span>}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {row.produtosVendidos > 0 ? `+${row.produtosVendidos}` : '—'}
                      </TableCell>
                      <TableCell className="text-center text-destructive">
                        {row.cancelamentos > 0 ? `-${row.cancelamentos}` : '—'}
                      </TableCell>
                      <TableCell className="text-center font-medium">{row.clientes}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.receitaMensal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(row.receitaAcumulada)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}