import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCEOAlerts, CriticalAlert } from '@/hooks/useCEOHistoricalData';
import { 
  AlertTriangle, Clock, RefreshCw, CalendarClock, 
  Ban, TrendingDown, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const alertTypeConfig: Record<CriticalAlert['type'], { icon: typeof AlertTriangle; label: string; color: string }> = {
  renewal: { icon: CalendarClock, label: 'Renovação', color: 'text-yellow-600' },
  overdue_task: { icon: Clock, label: 'Atrasada', color: 'text-red-600' },
  blocked_task: { icon: Ban, label: 'Bloqueada', color: 'text-orange-600' },
  goal_risk: { icon: TrendingDown, label: 'Meta', color: 'text-purple-600' },
  churn_risk: { icon: AlertTriangle, label: 'Churn', color: 'text-red-600' },
};

const severityConfig: Record<CriticalAlert['severity'], { bg: string; border: string; text: string }> = {
  high: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', text: 'text-red-700 dark:text-red-400' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-900', text: 'text-yellow-700 dark:text-yellow-400' },
  low: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900', text: 'text-blue-700 dark:text-blue-400' },
};

interface CEOAlertsProps {
  maxVisible?: number;
}

export function CEOAlerts({ maxVisible = 5 }: CEOAlertsProps) {
  const { data: alerts, isLoading, error, refetch, isFetching } = useCEOAlerts();
  const [expanded, setExpanded] = useState(false);

  // Safe access with defaults
  const alertsList = alerts || [];
  const visibleAlerts = expanded ? alertsList : alertsList.slice(0, maxVisible);
  const hasMore = alertsList.length > maxVisible;

  const highCount = alertsList.filter(a => a.severity === 'high').length;
  const mediumCount = alertsList.filter(a => a.severity === 'medium').length;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            Alertas Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Erro ao carregar alertas.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            Alertas Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            Alertas Críticos
            {alertsList.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alertsList.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {highCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {highCount} urgente{highCount > 1 ? 's' : ''}
              </Badge>
            )}
            {mediumCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {mediumCount} atenção
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alertsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta crítico no momento</p>
            <p className="text-xs">Tudo está funcionando normalmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            <ScrollArea className={expanded ? 'h-[400px]' : ''}>
              <div className="space-y-2 pr-2">
                {visibleAlerts.map(alert => {
                  const config = alertTypeConfig[alert.type];
                  const severity = severityConfig[alert.severity];
                  const Icon = config.icon;

                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${severity.bg} ${severity.border} transition-colors hover:opacity-90`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${severity.text}`}>
                              {alert.title}
                            </span>
                            <Badge variant="outline" className="text-xs py-0">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {alert.description}
                          </p>
                          {alert.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.dueDate) < new Date() ? (
                                <span className="text-destructive">
                                  Vencido há {formatDistanceToNow(new Date(alert.dueDate), { locale: ptBR })}
                                </span>
                              ) : (
                                <span>
                                  Vence em {formatDistanceToNow(new Date(alert.dueDate), { locale: ptBR })}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver todos ({alertsList.length - maxVisible} mais)
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
