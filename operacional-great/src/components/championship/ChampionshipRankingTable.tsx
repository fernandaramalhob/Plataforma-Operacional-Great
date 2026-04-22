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
        return <span className="font-medium text-muted-foreground">{rank}º</span>;
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
    }

    if (diff < 0) {
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
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/5">
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
                'transition-colors hover:bg-primary/5',
                team.current_rank === 1 && 'bg-yellow-50/60 dark:bg-yellow-950/20'
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.charAt(0)}
                  </div>
                  <span className="font-semibold text-foreground">{team.label}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="bg-primary/10 px-3 font-bold text-base text-primary">
                  {team.total_points}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium text-green-600">+{team.renewals}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium text-red-600">-{team.losses}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="font-medium text-primary">{team.items_sold}</span>
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
