import { ChampionshipEvent, ChampionshipTeam, SCORING_RULES, useDeleteChampionshipEvent } from '@/hooks/useChampionshipData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, UserMinus, ShoppingBag, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ChampionshipEventsLogProps {
  events: ChampionshipEvent[];
  teams: ChampionshipTeam[];
}

export function ChampionshipEventsLog({ events, teams }: ChampionshipEventsLogProps) {
  const { user, isAdmin } = useAuth();
  const deleteEventMutation = useDeleteChampionshipEvent();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canDelete = isAdmin || isCoordinator;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'RENEWAL':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'LOSS':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'ITEM_SOLD':
        return <ShoppingBag className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'RENEWAL':
        return 'Renovação';
      case 'LOSS':
        return 'Perda';
      case 'ITEM_SOLD':
        return 'Item Vendido';
      default:
        return type;
    }
  };

  const getTeam = (teamId: string) => teams.find(t => t.team_id === teamId);

  const handleDelete = async (event: ChampionshipEvent) => {
    if (!confirm('Tem certeza que deseja remover este evento? Os pontos serão revertidos.')) {
      return;
    }

    try {
      await deleteEventMutation.mutateAsync(event);
      toast.success('Evento removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover evento');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhum evento registrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const team = getTeam(event.team_id);
                
                return (
                  <div 
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      event.event_type === 'RENEWAL' && 'bg-green-100 dark:bg-green-950/50',
                      event.event_type === 'LOSS' && 'bg-red-100 dark:bg-red-950/50',
                      event.event_type === 'ITEM_SOLD' && 'bg-primary/10'
                    )}>
                      {getEventIcon(event.event_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getEventLabel(event.event_type)}
                        </Badge>
                        {team && (
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: `${team.badge_color}20`,
                              color: team.badge_color 
                            }}
                          >
                            {team.label}
                          </Badge>
                        )}
                        <Badge 
                          variant={event.points > 0 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {event.points > 0 ? '+' : ''}{event.points} pts
                        </Badge>
                      </div>
                      
                      {(event.client_name || event.item_label || event.description) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.item_label && <span className="font-medium">{event.item_label}</span>}
                          {event.client_name && <span> • Cliente: {event.client_name}</span>}
                          {event.description && <span> • {event.description}</span>}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        por {event.creator_name} • {formatDistanceToNow(new Date(event.created_at), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </p>
                    </div>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
