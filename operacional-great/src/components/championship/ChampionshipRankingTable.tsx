import { ChampionshipTeam } from '@/hooks/useChampionshipData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChampionshipRankingTableProps {
  teams: ChampionshipTeam[];
}

export function ChampionshipRankingTable({ teams }: ChampionshipRankingTableProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-medium">{rank}º</span>;
    }
  };

  const getRankChange = (current: number, previous: number | null) => {
    if (previous === null) return null;
    const diff = previous - current;
    
    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">+{diff}</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium">{diff}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-muted-foreground">
        <Minus className="h-4 w-4" />
      </div>
    );
  };

  const sortedTeams = [...teams].sort((a, b) => a.current_rank - b.current_rank);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-20 text-center">Posição</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead className="text-center">Pontos</TableHead>
            <TableHead className="text-center">Renovações</TableHead>
            <TableHead className="text-center">Perdas</TableHead>
            <TableHead className="text-center">Itens</TableHead>
            <TableHead className="w-24 text-center">Evolução</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTeams.map((team) => (
            <TableRow 
              key={team.id}
              className={cn(
                'transition-colors',
                team.current_rank === 1 && 'bg-yellow-50/50 dark:bg-yellow-950/20'
              )}
            >
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  {getRankIcon(team.current_rank)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.charAt(0)}
                  </div>
                  <span className="font-semibold text-foreground">{team.label}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant="secondary" 
                  className="font-bold text-base px-3"
                >
                  {team.total_points}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-green-600 font-medium">+{team.renewals}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-red-600 font-medium">-{team.losses}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-primary font-medium">{team.items_sold}</span>
              </TableCell>
              <TableCell className="text-center">
                {getRankChange(team.current_rank, team.previous_rank)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
