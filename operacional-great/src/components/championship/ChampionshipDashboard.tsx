import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserMinus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamDashboardMetrics {
  teamId: string;
  teamName: string;
  activeClients: number;
  newClients: number;
  churnedClients: number;
  renewals: number;
}

export function ChampionshipDashboard() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  // Fetch all operational clients with team data
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['championship-dashboard-clients', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select(`
          id,
          team_id,
          status_operacional,
          renewal_status,
          churn_date,
          created_at,
          activated_at
        `);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics per team
  const teamMetrics = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    const metricsMap: Record<string, TeamDashboardMetrics> = {};
    
    // Initialize all teams
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

    // Process clients
    clients.forEach(client => {
      if (!client.team_id || !metricsMap[client.team_id]) return;
      
      const team = metricsMap[client.team_id];
      
      // Count active clients
      if (client.status_operacional === 'ATIVO') {
        team.activeClients++;
      }
      
      // Count new clients (created or activated this month)
      const createdAt = new Date(client.created_at);
      const activatedAt = client.activated_at ? new Date(client.activated_at) : null;
      
      if (
        (createdAt >= monthStart && createdAt <= monthEnd) ||
        (activatedAt && activatedAt >= monthStart && activatedAt <= monthEnd)
      ) {
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
  }, [clients, teams, currentMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    return teamMetrics.reduce(
      (acc, team) => ({
        activeClients: acc.activeClients + team.activeClients,
        newClients: acc.newClients + team.newClients,
        churnedClients: acc.churnedClients + team.churnedClients,
        renewals: acc.renewals + team.renewals,
      }),
      { activeClients: 0, newClients: 0, churnedClients: 0, renewals: 0 }
    );
  }, [teamMetrics]);

  const getTeamColor = (teamName: string) => {
    const name = teamName.toLowerCase();
    if (name.includes('elite') || name.includes('lira')) return 'bg-red-500';
    if (name.includes('7') || name.includes('kauan')) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                <p className="text-2xl font-bold">{totals.activeClients}</p>
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
                <p className="text-sm text-muted-foreground">Novos Clientes</p>
                <p className="text-2xl font-bold text-green-600">{totals.newClients}</p>
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
                <p className="text-sm text-muted-foreground">Churns</p>
                <p className="text-2xl font-bold text-red-600">{totals.churnedClients}</p>
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
                <p className="text-2xl font-bold text-blue-600">{totals.renewals}</p>
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
          {teamMetrics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma métrica disponível para este período
            </p>
          ) : (
            <div className="space-y-3">
              {teamMetrics.map(team => (
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
                      <span className="text-muted-foreground">ativos</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-600">+{team.newClients}</span>
                      <span className="text-muted-foreground">novos</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-red-600">-{team.churnedClients}</span>
                      <span className="text-muted-foreground">churns</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-600">{team.renewals}</span>
                      <span className="text-muted-foreground">renov.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
