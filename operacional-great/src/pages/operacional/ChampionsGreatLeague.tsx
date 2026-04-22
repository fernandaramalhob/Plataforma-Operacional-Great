import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, LayoutGrid, BarChart3, History, Users, TrendingUp, TrendingDown, DollarSign, History as HistoryIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useChampionshipTeams,
  useChampionshipEvents,
  useChampionshipMonthlyHistory,
} from '@/hooks/useChampionshipData';
import { ChampionshipRankingTable } from '@/components/championship/ChampionshipRankingTable';
import { TeamChampionshipCards } from '@/components/championship/TeamChampionshipCards';
import { PointsEvolutionChart, ItemsSoldBreakdown, RenewalVsLossChart } from '@/components/championship/ChampionshipCharts';
import { ChampionshipEventsLog } from '@/components/championship/ChampionshipEventsLog';
import { AddEventDialog } from '@/components/championship/AddEventDialog';
import { FallingConfetti } from '@/components/championship/FallingConfetti';
import { ChampionshipPodium } from '@/components/championship/ChampionshipPodium';
import { ChampionshipDashboard } from '@/components/championship/ChampionshipDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

type RankingPeriod = 'semanal' | 'mensal' | 'anual';

export default function ChampionsGreatLeague() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastLeaderId, setLastLeaderId] = useState<string | null>(null);
  const [rankingFilter, setRankingFilter] = useState<'all' | 'elite' | 'team7'>('all');
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('mensal');
  const [retroOpen, setRetroOpen] = useState(false);

  const { data: teams = [], isLoading: teamsLoading } = useChampionshipTeams();
  const { data: events = [] } = useChampionshipEvents(50);
  const { data: monthlyHistory = [] } = useChampionshipMonthlyHistory();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canAddEvents = isAdmin || isCoordinator || ['GESTOR', 'ATENDENTE', 'DESIGN', 'EDITOR_VIDEO'].includes(user?.role || '');

  const filteredTeams = useMemo(() => {
    const normalize = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (rankingFilter === 'elite') {
      return teams.filter((team) => {
        const label = normalize(team.label);
        return label.includes('tropa de elite') || label.includes('elite');
      });
    }
    if (rankingFilter === 'team7') {
      return teams.filter((team) => {
        const label = normalize(team.label);
        return label.includes('equipe 7') || label.includes('team 7');
      });
    }
    return teams;
  }, [rankingFilter, teams]);

  const winnerTeam = useMemo(() => teams.find((t) => t.current_rank === 1) ?? teams[0] ?? null, [teams]);

  const totalRenewals = useMemo(() => teams.reduce((acc, t) => acc + (t.renewals || 0), 0), [teams]);
  const totalLosses = useMemo(() => teams.reduce((acc, t) => acc + (t.losses || 0), 0), [teams]);
  const totalSold = useMemo(() => teams.reduce((acc, t) => acc + (t.items_sold || 0), 0), [teams]);

  const quickInsight = useMemo(() => {
    if (teams.length === 0) return 'Nenhum dado disponível para este período.';
    const leader = teams.find((t) => t.current_rank === 1);
    if (!leader) return 'Dados carregando...';
    return `Líder do ${rankingPeriod}: ${leader.label} com ${leader.total_points} pts. Renovações: ${totalRenewals} | Perdas: ${totalLosses}.`;
  }, [teams, rankingPeriod, totalRenewals, totalLosses]);

  useEffect(() => {
    if (teams.length > 0) {
      const currentLeader = teams.find((team) => team.current_rank === 1);
      if (currentLeader && lastLeaderId && currentLeader.team_id !== lastLeaderId) {
        triggerConfetti('low');
      }
      if (currentLeader) setLastLeaderId(currentLeader.team_id);
    }
  }, [teams, lastLeaderId]);

  const triggerConfetti = (intensity: 'low' | 'medium') => {
    const particleCount = intensity === 'low' ? 50 : 100;
    confetti({ particleCount, spread: 70, origin: { y: 0.6 }, colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'], disableForReducedMotion: true });
    if (intensity === 'medium') {
      setTimeout(() => confetti({ particleCount: particleCount / 2, angle: 60, spread: 55, origin: { x: 0 } }), 250);
      setTimeout(() => confetti({ particleCount: particleCount / 2, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    }
  };

  if (teamsLoading) {
    return (
      <div className="space-y-6 min-h-screen bg-background -m-6 p-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="relative -m-6 min-h-screen space-y-6 overflow-hidden bg-background p-6">
      <FallingConfetti count={50} />

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-950/50">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Champions Great League</h1>
            <p className="text-muted-foreground">O campeonato interno de performance das equipes</p>
          </div>
        </div>
        {canAddEvents && <AddEventDialog teams={teams} />}
      </div>

      {/* KPI Cards — always visible */}
      <div className="relative z-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Winner Team */}
        <Card data-testid="winner-team-card" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Equipe Ganhadora</p>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">{winnerTeam?.label ?? 'Sem dados'}</p>
            <p className="text-sm text-muted-foreground">{winnerTeam?.total_points ?? 0} pts</p>
          </CardContent>
        </Card>

        {/* Sales last days */}
        <Card data-testid="sales-last-days">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendas últimos dias</p>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">{totalSold}</p>
            <p className="text-xs text-muted-foreground">itens vendidos</p>
          </CardContent>
        </Card>

        {/* Renewals */}
        <Card data-testid="renewals-value">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Renovações</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">R$ {(totalRenewals * 1000).toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>

        {/* Losses */}
        <Card data-testid="losses-value">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Perdas</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">R$ {(totalLosses * 1000).toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Period filter + quick insight */}
      <div className="relative z-10 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div data-testid="quick-insight" className="text-sm text-muted-foreground">{quickInsight}</div>
        <div data-testid="filter-period" className="flex gap-2">
          {(['semanal', 'mensal', 'anual'] as RankingPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setRankingPeriod(p)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${rankingPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-primary/5 text-muted-foreground hover:bg-primary/10'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <p data-testid="ranking-period" className="hidden text-xs text-muted-foreground sm:block capitalize">{rankingPeriod}</p>
      </div>

      {/* Year Summary */}
      <div data-testid="year-summary" className="relative z-10 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total pontos</p>
          <p className="text-xl font-bold">{teams.reduce((a, t) => a + t.total_points, 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Renovações ano</p>
          <p className="text-xl font-bold">{totalRenewals}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Perdas ano</p>
          <p className="text-xl font-bold">{totalLosses}</p>
        </div>
      </div>

      {/* Retrospective button */}
      <div className="relative z-10">
        <Button variant="outline" onClick={() => setRetroOpen(true)}>
          Retrospectiva do Ano
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="dashboard"><Users className="h-4 w-4" /><span className="hidden sm:inline ml-1">Dashboard</span></TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4" /><span className="hidden sm:inline ml-1">Classificação</span></TabsTrigger>
          <TabsTrigger value="teams"><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline ml-1">Equipes</span></TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline ml-1">Gráficos</span></TabsTrigger>
          <TabsTrigger value="events"><History className="h-4 w-4" /><span className="hidden sm:inline ml-1">Eventos</span></TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ChampionshipDashboard />
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Filtrar ranking por equipe</p>
            </div>
            <div data-testid="filter-team" className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todas as equipes' },
                { value: 'elite', label: 'Tropa de Elite' },
                { value: 'team7', label: 'Equipe 7' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRankingFilter(value as typeof rankingFilter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${rankingFilter === value ? 'bg-primary text-primary-foreground' : 'bg-primary/5 text-muted-foreground hover:bg-primary/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ChampionshipPodium teams={filteredTeams} />
          <div data-testid="ranking-list">
            <ChampionshipRankingTable teams={filteredTeams} />
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamChampionshipCards teams={teams} monthlyHistory={monthlyHistory} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <PointsEvolutionChart teams={teams} monthlyHistory={monthlyHistory} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ItemsSoldBreakdown events={events} teams={teams} />
            <RenewalVsLossChart teams={teams} />
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <ChampionshipEventsLog events={events} teams={teams} />
        </TabsContent>
      </Tabs>

      {/* Retrospective Modal */}
      <Dialog open={retroOpen} onOpenChange={setRetroOpen}>
        <DialogContent data-testid="retrospective-modal" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Retrospectiva do Ano</DialogTitle>
          </DialogHeader>
          <div data-testid="retrospective-content" className="space-y-4 py-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível para a retrospectiva.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Resumo de performance anual das equipes:</p>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div key={team.team_id} className="flex items-center justify-between rounded-xl border border-border p-3">
                      <span className="font-medium">{team.label}</span>
                      <span className="text-sm text-muted-foreground">{team.total_points} pts — {team.renewals} renovações</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
