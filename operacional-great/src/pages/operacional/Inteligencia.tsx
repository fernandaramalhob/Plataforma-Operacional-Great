import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Activity,
  RefreshCw,
  Award,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { useOperationalSalesMetrics } from '@/hooks/useCRMData';

export default function Inteligencia() {
  const [periodFilter, setPeriodFilter] = useState('month');

  // Fetch operational clients for metrics
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['operational-clients-intel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch work items for throughput
  const { data: workItems, isLoading: loadingWorkItems } = useQuery({
    queryKey: ['work-items-intel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_items')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-intel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch operational sales metrics
  const { data: salesMetrics } = useOperationalSalesMetrics();

  // Calculate metrics
  const activeClients = clients?.filter(c => c.status_operacional === 'ATIVO').length || 0;
  const newClients = clients?.filter(c => c.status_operacional === 'NOVO_CLIENTE').length || 0;
  const onboardingClients = clients?.filter(c => c.onboarding_stage && c.onboarding_stage !== 'CONCLUIDO').length || 0;
  const pausedClients = clients?.filter(c => c.status_operacional === 'PAUSADO').length || 0;
  const endedClients = clients?.filter(c => c.status_operacional === 'ENCERRADO').length || 0;

  // Churn and Renewal metrics
  const lostClients = clients?.filter(c => c.churn_status === 'CONFIRMED') || [];
  const renewedClients = clients?.filter(c => c.renewal_status === 'RENEWED') || [];

  const completedTasks = workItems?.filter(w => w.status === 'DONE' || w.status === 'CONCLUIDO').length || 0;
  const blockedTasks = workItems?.filter(w => w.status === 'BLOCKED' || w.status === 'BLOQUEADO').length || 0;
  const inProgressTasks = workItems?.filter(w => w.status === 'DOING' || w.status === 'EM_ANDAMENTO').length || 0;
  const totalTasks = workItems?.length || 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate team stats with sales
  const teamStats = teams.map(team => {
    const teamLostClients = lostClients.filter(c => c.churn_responsible_team_id === team.id);
    const teamRenewedClients = renewedClients.filter(c => c.renewal_responsible_team_id === team.id);
    const teamTasks = workItems?.filter(w => w.team_id === team.id) || [];
    const teamCompletedTasks = teamTasks.filter(w => w.status === 'DONE' || w.status === 'CONCLUIDO');
    const teamSalesData = salesMetrics?.teamSales.find(s => s.teamId === team.id);
    
    return {
      id: team.id,
      name: team.name,
      losses: teamLostClients.length,
      renewals: teamRenewedClients.length,
      tasksCompleted: teamCompletedTasks.length,
      totalTasks: teamTasks.length,
      completionRate: teamTasks.length > 0 ? Math.round((teamCompletedTasks.length / teamTasks.length) * 100) : 0,
      salesValue: teamSalesData?.totalValue || 0,
      salesCount: teamSalesData?.salesCount || 0,
    };
  });

  // Calculate sector stats (by stage)
  const sectorStats = {
    trafego: {
      losses: lostClients.filter(c => c.stage_trafego === 'BLOQUEADO').length,
      clients: clients?.filter(c => c.stage_trafego && c.stage_trafego !== 'NAO_INICIADO').length || 0,
    },
    atendimento: {
      losses: lostClients.filter(c => c.stage_atendimento === 'BLOQUEADO').length,
      clients: clients?.filter(c => c.stage_atendimento && c.stage_atendimento !== 'NAO_INICIADO').length || 0,
    },
    marketing: {
      losses: lostClients.filter(c => c.stage_marketing === 'BLOQUEADO').length,
      clients: clients?.filter(c => c.stage_marketing && c.stage_marketing !== 'NAO_INICIADO').length || 0,
    },
  };

  // Top performing team
  const topTeamByRenewals = [...teamStats].sort((a, b) => b.renewals - a.renewals)[0];
  const topTeamByTasks = [...teamStats].sort((a, b) => b.completionRate - a.completionRate)[0];
  const worstTeamByLosses = [...teamStats].sort((a, b) => b.losses - a.losses)[0];

  const isLoading = loadingClients || loadingWorkItems;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inteligência Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Métricas de performance, perdas, renovações e análise por equipe
          </p>
        </div>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Ativos</span>
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold">{activeClients}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-xs text-success">+{newClients} novos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Renovações</span>
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-success">{renewedClients.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Contratos renovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Perdas</span>
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <p className="text-3xl font-bold text-destructive">{lostClients.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Cancelamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Onboarding</span>
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold">{onboardingClients}</p>
            <p className="text-xs text-muted-foreground mt-1">Em processo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Taxa Retenção</span>
              <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-info" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              {activeClients > 0 ? Math.round(((activeClients - lostClients.length) / activeClients) * 100) : 100}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Clientes mantidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <div className="grid grid-cols-3 gap-6">
        {/* Team Rankings */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5" />
              Desempenho por Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma equipe cadastrada</p>
                </div>
              ) : (
                teamStats.map((team) => (
                  <div key={team.id} className="p-4 rounded-lg border border-border bg-surface">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-foreground">{team.name}</h4>
                      <div className="flex items-center gap-2">
                        {team.salesValue > 0 && (
                          <Badge className="bg-success/10 text-success border-success/20">
                            R$ {team.salesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Badge>
                        )}
                        <Badge variant="outline" className={team.completionRate >= 70 ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}>
                          {team.completionRate}% tarefas
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tarefas</p>
                        <p className="font-bold">{team.tasksCompleted}/{team.totalTasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Renovações</p>
                        <p className="font-bold text-success">{team.renewals}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Perdas</p>
                        <p className="font-bold text-destructive">{team.losses}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vendas Op.</p>
                        <p className="font-bold text-success">{team.salesCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progresso</p>
                        <Progress value={team.completionRate} className="mt-1.5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Destaques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topTeamByRenewals && topTeamByRenewals.renewals > 0 && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-success font-medium mb-1">🏆 Mais Renovações</p>
                  <p className="font-semibold text-foreground">{topTeamByRenewals.name}</p>
                  <p className="text-sm text-muted-foreground">{topTeamByRenewals.renewals} renovações</p>
                </div>
              )}

              {topTeamByTasks && topTeamByTasks.totalTasks > 0 && (
                <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                  <p className="text-xs text-info font-medium mb-1">⚡ Mais Produtiva</p>
                  <p className="font-semibold text-foreground">{topTeamByTasks.name}</p>
                  <p className="text-sm text-muted-foreground">{topTeamByTasks.completionRate}% conclusão</p>
                </div>
              )}

              {worstTeamByLosses && worstTeamByLosses.losses > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium mb-1">⚠️ Mais Perdas</p>
                  <p className="font-semibold text-foreground">{worstTeamByLosses.name}</p>
                  <p className="text-sm text-muted-foreground">{worstTeamByLosses.losses} perdas</p>
                </div>
              )}

              {(!topTeamByRenewals || topTeamByRenewals.renewals === 0) && 
               (!topTeamByTasks || topTeamByTasks.totalTasks === 0) && 
               (!worstTeamByLosses || worstTeamByLosses.losses === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm">Dados ainda sendo coletados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Analysis */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sector Losses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Perdas por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Tráfego</span>
                </div>
                <Badge variant="outline">{sectorStats.trafego.losses} perdas</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Atendimento</span>
                </div>
                <Badge variant="outline">{sectorStats.atendimento.losses} perdas</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Marketing</span>
                </div>
                <Badge variant="outline">{sectorStats.marketing.losses} perdas</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Throughput */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tarefas concluídas</span>
                <span className="font-bold text-lg">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Em andamento</span>
                <span className="font-bold text-lg">{inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bloqueadas</span>
                <span className="font-bold text-lg text-destructive">{blockedTasks}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de conclusão</span>
                  <Badge variant={completionRate >= 70 ? 'default' : 'destructive'}>
                    {completionRate}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loss Reasons Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5" />
              Motivos de Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lostClients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">Nenhuma perda registrada</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lostClients.map((client) => (
                  <div key={client.id} className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-foreground">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {client.churn_reason || 'Motivo não informado'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Sales Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sales by Team */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5" />
              Vendas Operacionais por Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!salesMetrics?.teamSales || salesMetrics.teamSales.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda operacional registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salesMetrics.teamSales
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .map((team) => (
                    <div key={team.teamId} className="p-4 rounded-lg border border-border bg-surface">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{team.teamName}</h4>
                        <Badge className="bg-success text-white">
                          R$ {team.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{team.salesCount} {team.salesCount === 1 ? 'venda' : 'vendas'}</span>
                        <span>•</span>
                        <span>Ticket médio: R$ {(team.totalValue / team.salesCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              Resumo Vendas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Total de Vendas</p>
                <p className="text-2xl font-bold text-success">
                  R$ {(salesMetrics?.totalSalesValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <span className="text-sm text-muted-foreground">Quantidade de vendas</span>
                <span className="font-bold">{salesMetrics?.totalSalesCount || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <span className="text-sm text-muted-foreground">Ticket médio</span>
                <span className="font-bold">
                  R$ {salesMetrics?.totalSalesCount ? 
                    ((salesMetrics.totalSalesValue / salesMetrics.totalSalesCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })) 
                    : '0,00'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <span className="text-sm text-muted-foreground">Equipes vendendo</span>
                <span className="font-bold">{salesMetrics?.teamSales.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}