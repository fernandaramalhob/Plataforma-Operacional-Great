import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  RefreshCw,
  Users,
  MessageSquare, 
  TrendingUp,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { CRMEvent, EVENT_TYPES, useResolveCRMEvent } from '@/hooks/useCRMData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const iconMap = {
  RefreshCw,
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
};

interface CRMTimelineProps {
  events: CRMEvent[];
  clientId: string;
}

export function CRMTimeline({ events, clientId }: CRMTimelineProps) {
  const resolveEvent = useResolveCRMEvent();

  const handleResolve = async (eventId: string) => {
    try {
      await resolveEvent.mutateAsync({ eventId, clientId });
      toast.success('Bloqueio resolvido!');
    } catch (error) {
      toast.error('Erro ao resolver bloqueio');
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-text-muted mb-3" />
        <p className="text-text-secondary font-medium">Nenhum evento registrado</p>
        <p className="text-text-muted text-sm mt-1">
          Adicione o primeiro evento para este cliente
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {events.map((event, index) => {
          const eventType = EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES] || EVENT_TYPES.RENOVACAO;
          const IconComponent = iconMap[eventType.icon as keyof typeof iconMap] || MessageSquare;

          return (
            <div key={event.id} className="relative pl-12">
              {/* Timeline dot */}
              <div 
                className="absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center bg-white border-2 border-border"
              >
                <IconComponent className="h-3 w-3 text-text-secondary" />
              </div>

              {/* Event card */}
              <div className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                        eventType.color
                      )}>
                        <IconComponent className="h-3 w-3" />
                        {eventType.label}
                      </span>
                      {event.sale_value && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <DollarSign className="h-3 w-3" />
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.sale_value)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-text-primary mt-2">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-text-secondary mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                      <span>
                        {format(new Date(event.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {event.user && (
                        <span className="flex items-center gap-1">
                          por <span className="font-medium text-text-secondary">{event.user.full_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
