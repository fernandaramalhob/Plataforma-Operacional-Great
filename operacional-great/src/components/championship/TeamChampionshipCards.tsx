import { ChampionshipTeam, ChampionshipMonthlyHistory } from '@/hooks/useChampionshipData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, RefreshCw, UserMinus, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamChampionshipCardsProps {
  teams: ChampionshipTeam[];
  monthlyHistory?: ChampionshipMonthlyHistory[];
}

export function TeamChampionshipCards({ teams, monthlyHistory = [] }: TeamChampionshipCardsProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTeamMonthlyEvolution = (teamId: string) => {
    const teamHistory = monthlyHistory.filter(h => h.team_id === teamId);
    if (teamHistory.length < 2) return null;
    
    const lastTwo = teamHistory.slice(-2);
    const diff = lastTwo[1].total_points - lastTwo[0].total_points;
    return diff;
  };

  const sortedTeams = [...teams].sort((a, b) => a.current_rank - b.current_rank);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sortedTeams.map((team) => {
        const evolution = getTeamMonthlyEvolution(team.team_id);
        
        return (
          <Card 
            key={team.id}
            className={cn(
              'relative overflow-hidden transition-all hover:shadow-lg',
              team.current_rank === 1 && 'ring-2 ring-yellow-400/50'
            )}
          >
            {/* Background gradient */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{ 
                background: `linear-gradient(135deg, ${team.badge_color} 0%, transparent 50%)` 
              }}
            />
            
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{team.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {team.current_rank}º lugar
                    </p>
                  </div>
                </div>
                {getRankIcon(team.current_rank)}
              </div>
            </CardHeader>
            
            <CardContent className="relative space-y-4">
              {/* Total Points */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium text-muted-foreground">Pontos Totais</span>
                <Badge 
                  variant="secondary" 
                  className="text-lg font-bold px-4 py-1"
                  style={{ 
                    backgroundColor: `${team.badge_color}20`,
                    color: team.badge_color 
                  }}
                >
                  {team.total_points}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <RefreshCw className="h-5 w-5 text-green-600 mb-1" />
                  <span className="text-lg font-bold text-green-600">{team.renewals}</span>
                  <span className="text-xs text-muted-foreground">Renovações</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <UserMinus className="h-5 w-5 text-red-600 mb-1" />
                  <span className="text-lg font-bold text-red-600">{team.losses}</span>
                  <span className="text-xs text-muted-foreground">Perdas</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5">
                  <ShoppingBag className="h-5 w-5 text-primary mb-1" />
                  <span className="text-lg font-bold text-primary">{team.items_sold}</span>
                  <span className="text-xs text-muted-foreground">Itens</span>
                </div>
              </div>

              {/* Monthly Evolution */}
              {evolution !== null && (
                <div className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <span className="text-sm text-muted-foreground">Evolução Mensal</span>
                  <div className={cn(
                    'flex items-center gap-1 font-medium',
                    evolution > 0 ? 'text-green-600' : evolution < 0 ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {evolution > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : evolution < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    <span>{evolution > 0 ? '+' : ''}{evolution} pts</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
