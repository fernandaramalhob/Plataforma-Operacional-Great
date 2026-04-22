import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Activity, User, Users, DollarSign, CheckCircle2, XCircle, 
  Plus, Pencil, Trash2, RefreshCw, Wifi, Trophy, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  user_name: string;
  user_email: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'USER_CREATED': <User className="h-4 w-4 text-green-500" />,
  'USER_UPDATED': <Pencil className="h-4 w-4 text-blue-500" />,
  'USER_DELETED': <Trash2 className="h-4 w-4 text-red-500" />,
  'CLIENT_CREATED': <Plus className="h-4 w-4 text-green-500" />,
  'CLIENT_UPDATED': <Pencil className="h-4 w-4 text-blue-500" />,
  'CLIENT_CLOSED': <DollarSign className="h-4 w-4 text-green-500" />,
  'CLIENT_LOST': <XCircle className="h-4 w-4 text-red-500" />,
  'TASK_COMPLETED': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'TASK_CREATED': <Plus className="h-4 w-4 text-blue-500" />,
  'SALE_REGISTERED': <DollarSign className="h-4 w-4 text-green-500" />,
  'RENEWAL': <RefreshCw className="h-4 w-4 text-purple-500" />,
  'CHAMPIONSHIP_EVENT': <Trophy className="h-4 w-4 text-yellow-500" />,
  'default': <Activity className="h-4 w-4 text-muted-foreground" />,
};

const ACTION_COLORS: Record<string, string> = {
  'USER_CREATED': 'bg-green-500/10 border-green-500/20',
  'CLIENT_CREATED': 'bg-green-500/10 border-green-500/20',
  'CLIENT_CLOSED': 'bg-green-500/10 border-green-500/20',
  'SALE_REGISTERED': 'bg-green-500/10 border-green-500/20',
  'TASK_COMPLETED': 'bg-green-500/10 border-green-500/20',
  'CLIENT_LOST': 'bg-red-500/10 border-red-500/20',
  'USER_DELETED': 'bg-red-500/10 border-red-500/20',
  'default': 'bg-muted/50 border-border',
};

const ACTION_LABELS: Record<string, string> = {
  'USER_CREATED': 'Usuário criado',
  'USER_UPDATED': 'Usuário atualizado',
  'USER_DELETED': 'Usuário removido',
  'CLIENT_CREATED': 'Cliente criado',
  'CLIENT_UPDATED': 'Cliente atualizado',
  'CLIENT_CLOSED': 'Venda fechada',
  'CLIENT_LOST': 'Cliente perdido',
  'TASK_COMPLETED': 'Tarefa concluída',
  'TASK_CREATED': 'Tarefa criada',
  'SALE_REGISTERED': 'Venda registrada',
  'RENEWAL': 'Renovação',
  'CHAMPIONSHIP_EVENT': 'Evento campeonato',
};

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
  compact?: boolean;
}

export function ActivityFeed({ 
  limit = 20, 
  showHeader = true, 
  className,
  compact = false 
}: ActivityFeedProps) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);
  const [newItems, setNewItems] = useState<number>(0);

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ActivityItem[];
    },
    refetchInterval: isLive ? 10000 : false, // Auto-refresh every 10s when live
  });

  // Real-time subscription
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          setNewItems(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, queryClient]);

  const handleRefresh = () => {
    setNewItems(0);
    refetch();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] || ACTION_ICONS['default'];
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || ACTION_COLORS['default'];
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Atividades em Tempo Real
              {isLive && (
                <Badge variant="outline" className="ml-2 gap-1 text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {newItems > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRefresh}
                  className="gap-1 text-xs"
                >
                  <Bell className="h-3 w-3" />
                  {newItems} nova{newItems > 1 ? 's' : ''}
                </Button>
              )}
              <Button
                size="sm"
                variant={isLive ? "default" : "outline"}
                onClick={() => setIsLive(!isLive)}
                className="gap-1"
              >
                <Wifi className="h-3 w-3" />
                {isLive ? 'Ao vivo' : 'Pausado'}
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-0"}>
        <ScrollArea className={compact ? "h-[300px]" : "h-[400px]"}>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    getActionColor(activity.action),
                    index === 0 && newItems > 0 && "ring-2 ring-primary/50 animate-pulse"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {getInitials(activity.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {activity.user_name}
                      </span>
                      <Badge variant="secondary" className="text-xs gap-1">
                        {getActionIcon(activity.action)}
                        {getActionLabel(activity.action)}
                      </Badge>
                    </div>
                    {activity.details && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade registrada</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
