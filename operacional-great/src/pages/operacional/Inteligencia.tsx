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
  renewalsCount: number;
  lossesCount: number;
};

type TeamFilter = 'all' | 'equipe-7' | 'tropa-de-elite';
type TeamLike = { name: string };
type TeamEvent = { created_at: string; teamName: string };

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function compareTeams(a: TeamRanking, b: TeamRanking) {
  if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
  if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
  if (b.averageTicket !== a.averageTicket) return b.averageTicket - a.averageTicket;
  if (b.renewalsCount !== a.renewalsCount) return b.renewalsCount - a.renewalsCount;
  return a.lossesCount - b.lossesCount;
}

function normalizeTeamName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesTeamFilter(teamName: string, filter: TeamFilter) {
  const normalized = normalizeTeamName(teamName);

  if (filter === 'equipe-7') {
    return normalized.includes('equipe 7') || normalized.includes('team 7');
  }

  if (filter === 'tropa-de-elite') {
    return normalized.includes('tropa de elite') || normalized.includes('elite');
  }

  return true;
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

function buildRanking(
  teams: TeamLike[],
  sales: SalesEvent[],
  renewals: TeamEvent[],
  losses: TeamEvent[],
) {
  const accumulator = new Map<string, TeamRanking>();

  sales.forEach((event) => {
    const current = accumulator.get(event.teamName) || {
      teamName: event.teamName,
      totalValue: 0,
      salesCount: 0,
      averageTicket: 0,
      renewalsCount: 0,
      lossesCount: 0,
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
        renewalsCount: 0,
        lossesCount: 0,
      });
    }
  });

  renewals.forEach((event) => {
    const current = accumulator.get(event.teamName);
    if (current) {
      current.renewalsCount += 1;
    }
  });

  losses.forEach((event) => {
    const current = accumulator.get(event.teamName);
    if (current) {
      current.lossesCount += 1;
    }
  });

  return Array.from(accumulator.values()).sort(compareTeams);
}

function getTopTeams(ranking: TeamRanking[]) {
  if (ranking.length === 0) return [];

  const leader = ranking[0];
  return ranking.filter((team) => compareTeams(team, leader) === 0);
}

function formatTeamNames(teams: TeamRanking[]) {
  if (teams.length === 0) return '';
  if (teams.length === 1) return teams[0].teamName;
  if (teams.length === 2) return `${teams[0].teamName} e ${teams[1].teamName}`;

  return `${teams.slice(0, -1).map((team) => team.teamName).join(', ')} e ${teams[teams.length - 1].teamName}`;
}

export default function Inteligencia() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
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
  const renewalEvents = salesMetrics?.renewalEvents || [];
  const lossEvents = salesMetrics?.lossEvents || [];
  const currentYear = new Date().getFullYear();
  const periodStart = getPeriodStart(periodFilter);

  const filteredTeams = useMemo(
    () => teams.filter((team) => matchesTeamFilter(team.name, teamFilter)),
    [teamFilter, teams],
  );
  const filteredSalesEvents = useMemo(
    () => salesEvents.filter((event) => matchesTeamFilter(event.teamName, teamFilter)),
    [salesEvents, teamFilter],
  );
  const filteredRenewalEvents = useMemo(
    () => renewalEvents.filter((event) => matchesTeamFilter(event.teamName, teamFilter)),
    [renewalEvents, teamFilter],
  );
  const filteredLossEvents = useMemo(
    () => lossEvents.filter((event) => matchesTeamFilter(event.teamName, teamFilter)),
    [lossEvents, teamFilter],
  );

  const filteredSales = useMemo(
    () => filteredSalesEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [filteredSalesEvents, periodStart],
  );
  const filteredPeriodRenewals = useMemo(
    () => filteredRenewalEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [filteredRenewalEvents, periodStart],
  );
  const filteredPeriodLosses = useMemo(
    () => filteredLossEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [filteredLossEvents, periodStart],
  );

  const globalPeriodSales = useMemo(
    () => salesEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [periodStart, salesEvents],
  );
  const globalPeriodRenewals = useMemo(
    () => renewalEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [periodStart, renewalEvents],
  );
  const globalPeriodLosses = useMemo(
    () => lossEvents.filter((event) => new Date(event.created_at) >= periodStart),
    [lossEvents, periodStart],
  );

  const ranking = useMemo<TeamRanking[]>(
    () => buildRanking(filteredTeams, filteredSales, filteredPeriodRenewals, filteredPeriodLosses),
    [filteredPeriodLosses, filteredPeriodRenewals, filteredSales, filteredTeams],
  );

  const annualRanking = useMemo<TeamRanking[]>(
    () =>
      buildRanking(
        filteredTeams,
        filteredSalesEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
        filteredRenewalEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
        filteredLossEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
      ),
    [currentYear, filteredLossEvents, filteredRenewalEvents, filteredSalesEvents, filteredTeams],
  );

  const globalRanking = useMemo<TeamRanking[]>(
    () => buildRanking(teams, globalPeriodSales, globalPeriodRenewals, globalPeriodLosses),
    [globalPeriodLosses, globalPeriodRenewals, globalPeriodSales, teams],
  );

  const globalAnnualRanking = useMemo<TeamRanking[]>(
    () =>
      buildRanking(
        teams,
        salesEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
        renewalEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
        lossEvents.filter((event) => new Date(event.created_at).getFullYear() === currentYear),
      ),
    [currentYear, lossEvents, renewalEvents, salesEvents, teams],
  );

  const rankingWithPositions = useMemo(
    () =>
      globalRanking
        .map((team, index) => ({
          team,
          position: index + 1,
        }))
        .filter(({ team }) => matchesTeamFilter(team.teamName, teamFilter)),
    [globalRanking, teamFilter],
  );

  const monthlyBreakdown = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthSales = filteredSalesEvents.filter((event) => {
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
  }, [currentYear, filteredSalesEvents]);

  const bestMonth = monthlyBreakdown.reduce((best, current) =>
    current.total > best.total ? current : best,
  );
  const worstMonth = monthlyBreakdown.reduce((worst, current) =>
    current.total < worst.total ? current : worst,
  );

  const last30Days = filteredSalesEvents.filter(
    (event) => new Date(event.created_at) >= subDays(new Date(), 30),
  );
  const previous30Days = filteredSalesEvents.filter((event) => {
    const createdAt = new Date(event.created_at);
    return createdAt < subDays(new Date(), 30) && createdAt >= subDays(new Date(), 60);
  });

  const last30Total = last30Days.reduce((sum, event) => sum + (event.sale_value || 0), 0);
  const previous30Total = previous30Days.reduce((sum, event) => sum + (event.sale_value || 0), 0);
  const growth =
    previous30Total > 0 ? Math.round(((last30Total - previous30Total) / previous30Total) * 100) : 0;
  const periodRenewalsCount = filteredPeriodRenewals.length;
  const periodLossesCount = filteredPeriodLosses.length;
  const currentYearSales = filteredSalesEvents.filter(
    (event) => new Date(event.created_at).getFullYear() === currentYear,
  );
  const currentYearTotal = currentYearSales.reduce((sum, event) => sum + (event.sale_value || 0), 0);
  const currentYearCount = currentYearSales.length;
  const currentYearRenewalsCount = filteredRenewalEvents.filter(
    (event) => new Date(event.created_at).getFullYear() === currentYear,
  ).length;
  const currentYearLossesCount = filteredLossEvents.filter(
    (event) => new Date(event.created_at).getFullYear() === currentYear,
  ).length;

  const leader = globalRanking[0];
  const annualLeader = globalAnnualRanking[0];
  const leadingTeams = getTopTeams(globalRanking);
  const annualLeadingTeams = getTopTeams(globalAnnualRanking);
  const leaderLabel = formatTeamNames(leadingTeams);
  const annualLeaderLabel = formatTeamNames(annualLeadingTeams);
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranking entre equipes</h1>
          <p className="text-sm text-muted-foreground">
            Veja quem está liderando em vendas, faturamento, ticket médio, renovações e controle de perdas.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value as TeamFilter)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              <SelectItem value="equipe-7">Equipe 7</SelectItem>
              <SelectItem value="tropa-de-elite">Tropa de Elite</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semanal</SelectItem>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-primary" />
              Equipe ganhadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leader ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{leaderLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      Liderando o ranking {periodFilter === 'week' ? 'semanal' : periodFilter === 'month' ? 'mensal' : 'anual'}
                    </p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">
                    {leadingTeams.length > 1 ? 'Empate na liderança' : '1º lugar'}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Vendas</p>
                    <p className="text-xl font-semibold">{leader.salesCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-xl font-semibold">{formatCurrency(leader.totalValue)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Ticket médio</p>
                    <p className="text-xl font-semibold">{formatCurrency(leader.averageTicket)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Renovações</p>
                    <p className="text-xl font-semibold">{leader.renewalsCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Perdas</p>
                    <p className="text-xl font-semibold">{leader.lossesCount}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ainda não há vendas no período selecionado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-success" />
              Últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">{formatCurrency(last30Total)}</p>
            <p className="text-sm text-muted-foreground">{last30Days.length} vendas no período</p>
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
              Renovações e perdas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">No período selecionado</p>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
              <span className="text-sm text-foreground">Renovações</span>
              <span className="text-lg font-bold text-success">{periodRenewalsCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
              <span className="text-sm text-foreground">Perdas</span>
              <span className="text-lg font-bold text-destructive">{periodLossesCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5" />
              Ranking do período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankingWithPositions.map(({ team, position }) => (
                <div key={team.teamName} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                      {position === 1 ? <Crown className="h-5 w-5" /> : position}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{team.teamName}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.salesCount} vendas • ticket médio {formatCurrency(team.averageTicket)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team.renewalsCount} renovações • {team.lossesCount} perdas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(team.totalValue)}</p>
                    {leadingTeams.some((leaderTeam) => leaderTeam.teamName === team.teamName) && (
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
              <p className="text-xs text-muted-foreground">Melhor mês</p>
              <p className="text-lg font-semibold text-foreground capitalize">{bestMonth.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(bestMonth.total)} • {bestMonth.count} vendas
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Mês com menor venda</p>
              <p className="text-lg font-semibold text-foreground capitalize">{worstMonth.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(worstMonth.total)} • {worstMonth.count} vendas
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Retrospectiva</p>
              <p className="text-sm text-foreground">
                O ano soma {formatCurrency(currentYearTotal)} em vendas operacionais,
                com destaque para {annualLeader ? annualLeaderLabel : 'nenhuma equipe líder'}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Foram {currentYearRenewalsCount} renovações e {currentYearLossesCount} perdas em {currentYear}.
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
            Leitura rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Equipe em destaque agora</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{leaderLabel || 'Sem vendas'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Faturamento do ano</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(currentYearTotal)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Total de vendas do ano</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{currentYearCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">Renovações / perdas</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {currentYearRenewalsCount} / {currentYearLossesCount}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
