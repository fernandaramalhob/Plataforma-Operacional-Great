import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, LayoutGrid, BarChart3, History, Users } from 'lucide-react';
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
import { ChampionshipDashboard } from '@/components/championship/ChampionshipDashboard';
import confetti from 'canvas-confetti';

export default function ChampionsGreatLeague() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastLeaderId, setLastLeaderId] = useState<string | null>(null);
  
  const { data: teams = [], isLoading: teamsLoading } = useChampionshipTeams();
  const { data: events = [], isLoading: eventsLoading } = useChampionshipEvents(50);
  const { data: monthlyHistory = [] } = useChampionshipMonthlyHistory();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canAddEvents = isAdmin || isCoordinator || ['GESTOR', 'ATENDENTE', 'DESIGN', 'EDITOR_VIDEO'].includes(user?.role || '');

  // Check for rank change to first place (confetti effect)
  useEffect(() => {
    if (teams.length > 0) {
      const currentLeader = teams.find(t => t.current_rank === 1);
      if (currentLeader && lastLeaderId && currentLeader.team_id !== lastLeaderId) {
        // New leader! Trigger confetti
        triggerConfetti('low');
      }
      if (currentLeader) {
        setLastLeaderId(currentLeader.team_id);
      }
    }
  }, [teams]);

  const triggerConfetti = (intensity: 'low' | 'medium') => {
    const duration = intensity === 'low' ? 1200 : 2000;
    const particleCount = intensity === 'low' ? 50 : 100;
    
    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
      disableForReducedMotion: true,
    });

    if (intensity === 'medium') {
      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
        });
      }, 250);
      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#2563EB', '#DC2626', '#16A34A', '#CA8A04'],
        });
      }, 400);
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
    <div className="space-y-6 min-h-screen bg-background -m-6 p-6 relative overflow-hidden">
      {/* Falling Confetti Background */}
      <FallingConfetti count={50} />
      
      {/* Decorative Corner Elements with floating animation and glow */}
      {/* Top Left Trophy */}
      <motion.div 
        className="absolute top-4 left-4 pointer-events-none"
        animate={{ 
          y: [0, -8, 0],
          rotate: [-12, -8, -12]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            filter: [
              'drop-shadow(0 0 8px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 20px rgba(234, 179, 8, 0.6))',
              'drop-shadow(0 0 8px rgba(234, 179, 8, 0.3))'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Trophy className="h-24 w-24 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      {/* Top Right Trophy */}
      <motion.div 
        className="absolute top-4 right-4 pointer-events-none"
        animate={{ 
          y: [0, -6, 0],
          rotate: [12, 16, 12]
        }}
        transition={{ 
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            filter: [
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 16px rgba(234, 179, 8, 0.6))',
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))'
            ]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
          <Trophy className="h-20 w-20 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      {/* Bottom Left Trophy */}
      <motion.div 
        className="absolute bottom-4 left-4 pointer-events-none"
        animate={{ 
          y: [0, -5, 0],
          rotate: [6, 10, 6]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.28, 0.15],
            filter: [
              'drop-shadow(0 0 5px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 14px rgba(234, 179, 8, 0.55))',
              'drop-shadow(0 0 5px rgba(234, 179, 8, 0.3))'
            ]
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <Trophy className="h-16 w-16 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      {/* Bottom Right Trophy */}
      <motion.div 
        className="absolute bottom-4 right-4 pointer-events-none"
        animate={{ 
          y: [0, -7, 0],
          rotate: [-6, -10, -6]
        }}
        transition={{ 
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            filter: [
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))',
              'drop-shadow(0 0 18px rgba(234, 179, 8, 0.6))',
              'drop-shadow(0 0 6px rgba(234, 179, 8, 0.3))'
            ]
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
        >
          <Trophy className="h-20 w-20 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      {/* Decorative confetti dots with subtle pulse */}
      <motion.div 
        className="absolute top-20 left-20 w-3 h-3 rounded-full bg-blue-500/20 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.div 
        className="absolute top-32 left-12 w-2 h-2 rounded-full bg-red-500/20 pointer-events-none"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.div 
        className="absolute top-16 right-28 w-4 h-4 rounded-full bg-green-500/20 pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
      />
      <motion.div 
        className="absolute top-40 right-16 w-2 h-2 rounded-full bg-yellow-500/30 pointer-events-none"
        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.9 }}
      />
      <motion.div 
        className="absolute bottom-20 left-28 w-3 h-3 rounded-full bg-purple-500/20 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1.2 }}
      />
      <motion.div 
        className="absolute bottom-32 right-24 w-2 h-2 rounded-full bg-orange-500/20 pointer-events-none"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 1.5 }}
      />
      <motion.div 
        className="absolute bottom-16 left-16 w-2 h-2 rounded-full bg-pink-500/20 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 3.2, repeat: Infinity, delay: 1.8 }}
      />
      <motion.div 
        className="absolute bottom-28 right-12 w-3 h-3 rounded-full bg-cyan-500/20 pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 2.6, repeat: Infinity, delay: 2.1 }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">🏆 Champions Great League</h1>
            <p className="text-muted-foreground">O campeonato interno de performance das equipes</p>
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
        <TabsContent value="dashboard" className="mt-6">
          <ChampionshipDashboard />
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
