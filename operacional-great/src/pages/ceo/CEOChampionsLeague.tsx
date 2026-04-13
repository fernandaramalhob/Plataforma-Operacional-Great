import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, LayoutGrid, BarChart3, History, Users, UserPlus, UserMinus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useChampionshipTeams, 
  useChampionshipEvents, 
  useChampionshipMonthlyHistory 
} from '@/hooks/useChampionshipData';
import { ChampionshipRankingTable } from '@/components/championship/ChampionshipRankingTable';
import { TeamChampionshipCards } from '@/components/championship/TeamChampionshipCards';
import { PointsEvolutionChart, ItemsSoldBreakdown, RenewalVsLossChart } from '@/components/championship/ChampionshipCharts';
import { ChampionshipEventsLog } from '@/components/championship/ChampionshipEventsLog';
import { AddEventDialog } from '@/components/championship/AddEventDialog';
import { FallingConfetti } from '@/components/championship/FallingConfetti';
import { ChampionshipPodium } from '@/components/championship/ChampionshipPodium';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';

export default function CEOChampionsLeague() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastLeaderId, setLastLeaderId] = useState<string | null>(null);
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const { data: teams = [], isLoading: teamsLoading } = useChampionshipTeams();
  const { data: events = [], isLoading: eventsLoading } = useChampionshipEvents(50);
  const { data: monthlyHistory = [] } = useChampionshipMonthlyHistory();

  const canAddEvents = isAdmin;

  // Fetch team dashboard metrics
  const { data: teamDashboardMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['ceo-champions-dashboard', currentMonth],
    queryFn: async () => {
      const [year, month] = currentMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      
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
      const teamsList = teamsRes.data || [];
      
      const metricsMap: Record<string, { teamId: string; teamName: string; activeClients: number; newClients: number; churnedClients: number; renewals: number }> = {};
      
      teamsList.forEach(team => {
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
        
        if (client.status_operacional === 'ATIVO') {
          team.activeClients++;
        }
        
        const activatedAt = client.activated_at ? new Date(client.activated_at) : null;
        if (activatedAt && activatedAt >= monthStart && activatedAt <= monthEnd) {
          team.newClients++;
        }
        
        if (client.churn_date) {
          const churnDate = new Date(client.churn_date);
          if (churnDate >= monthStart && churnDate <= monthEnd) {
            team.churnedClients++;
          }
        }
        
        if (client.renewal_status === 'RENEWED') {
          team.renewals++;
        }
      });

      return Object.values(metricsMap);
    },
  });

  // Calculate totals
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

  // Check for rank change to first place (confetti effect)
  useEffect(() => {
    if (teams.length > 0) {
      const currentLeader = teams.find(t => t.current_rank === 1);
      if (currentLeader && lastLeaderId && currentLeader.team_id !== lastLeaderId) {
        triggerConfetti('low');
      }
      if (currentLeader) {
        setLastLeaderId(currentLeader.team_id);
      }
    }
  }, [teams]);

  const triggerConfetti = (intensity: 'low' | 'medium') => {
    const particleCount = intensity === 'low' ? 50 : 100;
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
      disableForReducedMotion: true,
    });
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
    <div className="space-y-6 min-h-screen bg-background -m-6 p-6 relative overflow-hidden">
      {/* Falling Confetti Background */}
      <FallingConfetti count={30} />
      
      {/* Decorative Corner Trophies */}
      <motion.div 
        className="absolute top-4 left-4 pointer-events-none"
        animate={{ y: [0, -8, 0], rotate: [-12, -8, -12] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Trophy className="h-20 w-20 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="absolute top-4 right-4 pointer-events-none"
        animate={{ y: [0, -6, 0], rotate: [12, 16, 12] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
          <Trophy className="h-16 w-16 text-yellow-500" />
        </motion.div>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">🏆 Champions Great League</h1>
            <p className="text-muted-foreground">Dashboard de métricas e ranking das equipes</p>
          </div>
        </div>
        
        {canAddEvents && <AddEventDialog teams={teams} />}
      </div>

      {/* Highlight Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20 relative z-10">
        <CardContent className="py-4 text-center">
          <p className="text-lg font-medium text-foreground">
            Cada ponto importa. Cada cliente conta. Toda equipe compete.
          </p>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Classificação</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Equipes</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Gráficos</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Eventos</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                    <p className="text-2xl font-bold">{teamDashboardTotals.activeClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <UserPlus className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes que Chegaram</p>
                    <p className="text-2xl font-bold text-green-600">+{teamDashboardTotals.newClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <UserMinus className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Churns (Saíram)</p>
                    <p className="text-2xl font-bold text-red-600">-{teamDashboardTotals.churnedClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <RefreshCw className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Renovações</p>
                    <p className="text-2xl font-bold text-blue-600">{teamDashboardTotals.renewals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics by Team */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Métricas por Equipe
                <Badge variant="outline" className="ml-2">
                  {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : teamDashboardMetrics.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma métrica disponível para este período
                </p>
              ) : (
                <div className="space-y-3">
                  {teamDashboardMetrics.map(team => (
                    <div 
                      key={team.teamId}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getTeamColor(team.teamName)}`} />
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{team.activeClients}</span>
                          <span className="text-muted-foreground hidden sm:inline">ativos</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-green-600">+{team.newClients}</span>
                          <span className="text-muted-foreground hidden sm:inline">novos</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="font-semibold text-red-600">-{team.churnedClients}</span>
                          <span className="text-muted-foreground hidden sm:inline">churns</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-blue-600">{team.renewals}</span>
                          <span className="text-muted-foreground hidden sm:inline">renov.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classification Tab */}
        <TabsContent value="ranking" className="mt-6">
          <ChampionshipPodium teams={teams} />
          <ChampionshipRankingTable teams={teams} />
        </TabsContent>

        {/* Team Cards Tab */}
        <TabsContent value="teams" className="mt-6">
          <TeamChampionshipCards teams={teams} monthlyHistory={monthlyHistory} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <PointsEvolutionChart teams={teams} monthlyHistory={monthlyHistory} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ItemsSoldBreakdown events={events} teams={teams} />
            <RenewalVsLossChart teams={teams} />
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-6">
          <ChampionshipEventsLog events={events} teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
