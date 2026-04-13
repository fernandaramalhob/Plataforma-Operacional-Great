import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  User,
  Clock,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  'CREATE': <Plus className="h-4 w-4" />,
  'UPDATE': <Edit className="h-4 w-4" />,
  'DELETE': <Trash2 className="h-4 w-4" />,
  'MOVE': <ArrowRight className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  'CREATE': 'bg-green-500/10 text-green-600 border-green-500/20',
  'UPDATE': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'DELETE': 'bg-red-500/10 text-red-600 border-red-500/20',
  'MOVE': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

const actionLabels: Record<string, string> = {
  'CREATE': 'Criação',
  'UPDATE': 'Edição',
  'DELETE': 'Exclusão',
  'MOVE': 'Movimentação',
};

const entityLabels: Record<string, string> = {
  'exec_card': 'Card',
  'exec_board': 'Quadro',
  'exec_column': 'Coluna',
  'exec_comment': 'Comentário',
  'my_day_item': 'Tarefa do Dia',
};

export default function RegistroAtividades() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = 
      activity.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entity.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || activity.action === filterAction;
    const matchesEntity = filterEntity === 'all' || activity.entity === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  // Group activities by date
  const groupedActivities = filteredActivities?.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityLog[]>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Registro de Atividades</h1>
              <p className="text-sm text-muted-foreground">
                Histórico de ações realizadas nos cards e quadros
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="CREATE">Criação</SelectItem>
              <SelectItem value="UPDATE">Edição</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
              <SelectItem value="MOVE">Movimentação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[150px]">
              <FileText className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas entidades</SelectItem>
              <SelectItem value="exec_card">Cards</SelectItem>
              <SelectItem value="exec_board">Quadros</SelectItem>
              <SelectItem value="exec_column">Colunas</SelectItem>
              <SelectItem value="exec_comment">Comentários</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filteredActivities?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || filterAction !== 'all' || filterEntity !== 'all'
                    ? 'Tente ajustar os filtros de busca'
                    : 'As atividades aparecerão aqui conforme forem realizadas'}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedActivities || {}).map(([date, dayActivities]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {formatDateHeader(date)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {dayActivities.length} {dayActivities.length === 1 ? 'atividade' : 'atividades'}
                  </span>
                </div>

                <div className="space-y-2">
                  {dayActivities.map((activity) => (
                    <Card key={activity.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Action Icon */}
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border",
                            actionColors[activity.action] || 'bg-muted text-muted-foreground'
                          )}>
                            {actionIcons[activity.action] || <FileText className="h-4 w-4" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-foreground">
                                {activity.user_name}
                              </span>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                actionColors[activity.action]
                              )}>
                                {actionLabels[activity.action] || activity.action}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {entityLabels[activity.entity] || activity.entity}
                              </Badge>
                            </div>

                            {activity.details && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {activity.details}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(activity.created_at), "HH:mm", { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {activity.user_email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}