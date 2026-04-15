import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useOperationalSalesMetrics } from '@/hooks/useCRMData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  CalendarClock,
  Crown,
  Medal,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

type PeriodFilter = 'week' | 'month' | 'year';

type SalesEvent = {
  id: string;
  created_at: string;
  sale_value: number | null;
  teamName: string;
  clientName: string;
};

type TeamRanking = {
  teamName: string;
  totalValue: number;
  salesCount: number;
  averageTicket: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPeriodStart(period: PeriodFilter) {
  const now = new Date();
  if (period === 'week') return startOfWeek(now, { weekStartsOn: 1, locale: ptBR });
  if (period === 'month') return startOfMonth(now);
  return new Date(now.getFullYear(), 0, 1);
}

function getMonthName(monthIndex: number) {
  return new Date(2026, monthIndex, 1).toLocaleDateString('pt-BR', { month: 'long' });
}

export default function Inteligencia() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const { data: salesMetrics, isLoading: loadingSales } = useOperationalSalesMetrics();

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['teams-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const salesEvents = (salesMetrics?.salesEvents || []) as SalesEvent[];
  const currentYear = new Date().getFullYear();

  const filteredSales = useMemo(() => {
    const startDate = getPeriodStart(periodFilter);
    return salesEvents.filter((event) => new Date(event.created_at) >= startDate);
  }, [periodFilter, salesEvents]);

  const ranking = useMemo<TeamRanking[]>(() => {
    const accumulator = new Map<string, TeamRanking>();

    filteredSales.forEach((event) => {
      const current = accumulator.get(event.teamName) || {
        teamName: event.teamName,
        totalValue: 0,
        salesCount: 0,
        averageTicket: 0,
      };

      current.totalValue += event.sale_value || 0;
      current.salesCount += 1;
      current.averageTicket = current.salesCount > 0 ? current.totalValue / current.salesCount : 0;
      accumulator.set(event.teamName, current);
    });

    teams.forEach((team) => {
      if (!accumulator.has(team.name)) {
        accumulator.set(team.name, {
          teamName: team.name,
          totalValue: 0,
          salesCount: 0,
          averageTicket: 0,
        });
      }
    });

    return Array.from(accumulator.values()).sort((a, b) => {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return b.salesCount - a.salesCount;
    });
  }, [filteredSales, teams]);

  const annualRanking = useMemo<TeamRanking[]>(() => {
    const yearlySales = salesEvents.filter(
      (event) => new Date(event.created_at).getFullYear() === currentYear,
    );

    const accumulator = new Map<string, TeamRanking>();

    yearlySales.forEach((event) => {
      const current = accumulator.get(event.teamName) || {
        teamName: event.teamName,
        totalValue: 0,
        salesCount: 0,
        averageTicket: 0,
      };

      current.totalValue += event.sale_value || 0;
      current.salesCount += 1;
      current.averageTicket = current.salesCount > 0 ? current.totalValue / current.salesCount : 0;
      accumulator.set(event.teamName, current);
    });

    teams.forEach((team) => {
      if (!accumulator.has(team.name)) {
        accumulator.set(team.name, {
          teamName: team.name,
          totalValue: 0,
          salesCount: 0,
          averageTicket: 0,
        });
      }
    });

    return Array.from(accumulator.values()).sort((a, b) => {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return b.salesCount - a.salesCount;
    });
  }, [currentYear, salesEvents, teams]);

  const monthlyBreakdown = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthSales = salesEvents.filter((event) => {
        const date = new Date(event.created_at);
        return date.getFullYear() === currentYear && date.getMonth() === monthIndex;
      });

      const total = monthSales.reduce((sum, event) => sum + (event.sale_value || 0), 0);
      const count = monthSales.length;

      return {
        monthIndex,
        label: getMonthName(monthIndex),
        total,
        count,
      };
    });
  }, [currentYear, salesEvents]);

  const bestMonth = monthlyBreakdown.reduce((best, current) =>
    current.total > best.total ? current : best,
  );

  const worstMonth = monthlyBreakdown.reduce((worst, current) =>
    current.total < worst.total ? current : worst,
  );

  const last30Days = salesEvents.filter((event) => new Date(event.created_at) >= subDays(new Date(), 30));
  const previous30Days = salesEvents.filter((event) => {
    const createdAt = new Date(event.created_at);
    return createdAt < subDays(new Date(), 30) && createdAt >= subDays(new Date(), 60);
  });

  const last30Total = last30Days.reduce((sum, event) => sum + (event.sale_value || 0), 0);
  const previous30Total = previous30Days.reduce((sum, event) => sum + (event.sale_value || 0), 0);
  const growth =
    previous30Total > 0 ? Math.round(((last30Total - previous30Total) / previous30Total) * 100) : 0;

  const leader = ranking[0];
  const annualLeader = annualRanking[0];
  const isLoading = loadingSales || loadingTeams;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranking entre Equipes</h1>
          <p className="text-sm text-muted-foreground">
            Veja quem está liderando nas vendas operacionais por semana, mês e ano.
          </p>
        </div>

        <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-primary" />
              Equipe que está ganhando
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leader ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{leader.teamName}</p>
                    <p className="text-sm text-muted-foreground">
                      Liderando o ranking {periodFilter === 'week' ? 'semanal' : periodFilter === 'month' ? 'mensal' : 'anual'}
                    </p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">1º lugar</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Vendas</p>
                    <p className="text-xl font-semibold">{leader.salesCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-xl font-semibold">{formatCurrency(leader.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Ticket medio</p>
                    <p className="text-xl font-semibold">{formatCurrency(leader.averageTicket)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ainda nao ha vendas no periodo selecionado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-success" />
              Ultimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(last30Total)}</p>
            <p className="text-sm text-muted-foreground">{last30Days.length} vendas no periodo</p>
            <Badge variant="outline" className={growth >= 0 ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}>
              {growth >= 0 ? '+' : ''}
              {growth}% vs 30 dias anteriores
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-warning" />
              Lider anual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-bold text-foreground">{annualLeader?.teamName || 'Sem lider'}</p>
            <p className="text-sm text-muted-foreground">
              {annualLeader ? formatCurrency(annualLeader.totalValue) : 'Sem vendas no ano'}
            </p>
            <p className="text-xs text-muted-foreground">
              {annualLeader?.salesCount || 0} vendas em {currentYear}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5" />
              Ranking do periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ranking.map((team, index) => (
                <div key={team.teamName} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                      {index === 0 ? <Crown className="h-5 w-5" /> : index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{team.teamName}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.salesCount} vendas • ticket medio {formatCurrency(team.averageTicket)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(team.totalValue)}</p>
                    {index === 0 && (
                      <Badge className="mt-1 bg-primary text-primary-foreground">Na frente</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Resumo do ano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Melhor mes</p>
              <p className="text-lg font-semibold text-foreground capitalize">{bestMonth.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(bestMonth.total)} • {bestMonth.count} vendas
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Mes com menor venda</p>
              <p className="text-lg font-semibold text-foreground capitalize">{worstMonth.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(worstMonth.total)} • {worstMonth.count} vendas
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Retrospectiva</p>
              <p className="text-sm text-foreground">
                O ano soma {formatCurrency(salesMetrics?.totalSalesValue || 0)} em vendas operacionais,
                com destaque para {annualLeader?.teamName || 'nenhuma equipe lider'}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5" />
            Retrospectiva mensal do ano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {monthlyBreakdown.map((month) => (
              <div key={month.monthIndex} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground capitalize">{month.label}</p>
                  {month.total === bestMonth.total && month.total > 0 && (
                    <Medal className="h-4 w-4 text-warning" />
                  )}
                  {month.total === worstMonth.total && month.total === 0 && (
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-3 text-lg font-bold text-foreground">{formatCurrency(month.total)}</p>
                <p className="text-sm text-muted-foreground">{month.count} vendas</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Leitura rapida
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Equipe em destaque agora</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{leader?.teamName || 'Sem vendas'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Faturamento do ano</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCurrency(salesMetrics?.totalSalesValue || 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Total de vendas do ano</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {salesMetrics?.totalSalesCount || 0}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
