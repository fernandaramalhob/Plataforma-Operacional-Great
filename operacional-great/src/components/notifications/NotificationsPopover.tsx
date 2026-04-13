import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatBRL } from '@/lib/utils';
import type { Notification as NotificationType } from '@/types';
import { useCommercialSafe } from '@/contexts/CommercialContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  Notification as DBNotification,
} from '@/hooks/useNotifications';

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return '📋';
    case 'task_assigned':
      return '📋';
    case 'client_new':
      return '👤';
    case 'client_synced':
      return '🎉';
    case 'sla_warning':
      return '⚠️';
    case 'checkin_pending':
      return '✅';
    case 'payment_reminder':
      return '💰';
    case 'URGENT_ARTS_ALERT':
      return '🚨';
    case 'ACTION_ITEM_ASSIGNED':
      return '📝';
    default:
      return '🔔';
  }
}

// Unified notification type for display
interface DisplayNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export function NotificationsPopover() {
  const commercialContext = useCommercialSafe();
  const paymentReminders = commercialContext?.paymentReminders ?? [];
  const dismissReminder = commercialContext?.dismissReminder ?? (() => {});
  
  const { data: dbNotifications = [], isLoading } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  
  const [localNotifications, setLocalNotifications] = useState<DisplayNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Listen for real-time inserts on operational_clients table
  useEffect(() => {
    const channel = supabase
      .channel('operational-clients-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'operational_clients'
        },
        (payload) => {
          const newClient = payload.new as {
            id: string;
            client_name: string;
            clinic_name: string | null;
            plan: string | null;
            deal_value: number | null;
            created_at: string;
          };

          // Show toast notification
          toast.success('🎉 Novo cliente sincronizado!', {
            description: `${newClient.client_name}${newClient.clinic_name ? ` - ${newClient.clinic_name}` : ''} foi adicionado ao operacional.`,
            duration: 5000,
          });

          // Add to local notifications list
          const newNotification: DisplayNotification = {
            id: `synced-${newClient.id}`,
            type: 'client_synced',
            title: '🎉 Cliente sincronizado do comercial',
            body: `${newClient.client_name}${newClient.clinic_name ? ` (${newClient.clinic_name})` : ''} - ${newClient.plan || 'Plano não definido'}${newClient.deal_value ? ` - ${formatBRL(newClient.deal_value)}` : ''}`,
            read: false,
            createdAt: new Date(newClient.created_at),
          };

          setLocalNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Convert DB notifications to display format
  const formattedDbNotifications: DisplayNotification[] = dbNotifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.message || '',
    read: n.read,
    createdAt: new Date(n.created_at),
  }));

  // Convert payment reminders to notifications
  const paymentNotifications: DisplayNotification[] = paymentReminders
    .filter(r => !r.dismissed)
    .map(r => ({
      id: `payment-${r.id}`,
      type: 'payment_reminder',
      title: '💸 Cobrança de Pagamento',
      body: `${r.clientName} (${r.clinicName}) - ${formatBRL(r.dealValue)} - Vencimento: ${format(new Date(r.paymentDeadline), "dd/MM/yyyy", { locale: ptBR })}`,
      read: false,
      createdAt: r.createdAt,
    }));

  const allNotifications = [...paymentNotifications, ...formattedDbNotifications, ...localNotifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'unread' 
    ? allNotifications.filter(n => !n.read)
    : allNotifications;

  const handleMarkAsRead = (id: string) => {
    if (id.startsWith('payment-')) {
      const reminderId = id.replace('payment-', '');
      dismissReminder(reminderId);
    } else if (id.startsWith('synced-')) {
      setLocalNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } else {
      markAsReadMutation.mutate(id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    paymentReminders.forEach(r => {
      if (!r.dismissed) {
        dismissReminder(r.id);
      }
    });
  };

  const handleDeleteNotification = (id: string) => {
    if (id.startsWith('payment-')) {
      const reminderId = id.replace('payment-', '');
      dismissReminder(reminderId);
    } else if (id.startsWith('synced-')) {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      deleteNotificationMutation.mutate(id);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 bg-card border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-border">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs h-7"
          >
            Todas
          </Button>
          <Button
            variant={filter === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs h-7"
          >
            Não lidas {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[320px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer group',
                    !notification.read && 'bg-primary/5',
                    notification.type === 'payment_reminder' && !notification.read && 'bg-destructive/5',
                    notification.type === 'URGENT_ARTS_ALERT' && !notification.read && 'bg-destructive/10 border-l-2 border-destructive'
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm',
                          !notification.read && 'font-medium',
                          notification.type === 'payment_reminder' && !notification.read && 'text-destructive'
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
