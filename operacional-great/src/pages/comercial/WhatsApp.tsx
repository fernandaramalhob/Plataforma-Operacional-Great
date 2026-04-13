import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Search,
  Bell,
  Calendar,
  Phone
} from 'lucide-react';
import { format, parseISO, isToday, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ReminderLog {
  id: string;
  event_id: string | null;
  client_phone: string;
  client_name: string;
  reminder_type: '2h' | '30min' | 'manual';
  message: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  instanceName: string | null;
  lastCheck: Date | null;
}

export default function WhatsAppPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'today'>('status');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    instanceName: null,
    lastCheck: null,
  });
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const queryClient = useQueryClient();

  // Fetch reminder logs
  const { data: reminderLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['whatsapp-reminder-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_reminder_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ReminderLog[];
    },
  });

  // Fetch today's scheduled events
  const { data: todayEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['today-agenda-events'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('event_date', today)
        .order('event_time', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Check connection status
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-status', {
        body: { service: 'evolution' },
      });
      
      if (error) throw error;
      
      setConnectionStatus({
        connected: data?.connected ?? false,
        instanceName: data?.instanceName ?? null,
        lastCheck: new Date(),
      });
      
      if (data?.connected) {
        toast.success('WhatsApp conectado!');
      } else {
        toast.warning('WhatsApp não conectado');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus({
        connected: false,
        instanceName: null,
        lastCheck: new Date(),
      });
      toast.error('Erro ao verificar conexão');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Trigger manual reminder check
  const triggerReminderCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-agenda-reminders');
      
      if (error) throw error;
      
      toast.success(`Verificação concluída: ${data?.results?.reminders_2h_sent || 0} lembretes de 2h e ${data?.results?.reminders_30min_sent || 0} de 30min enviados`);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-reminder-logs'] });
    } catch (error) {
      console.error('Error triggering reminders:', error);
      toast.error('Erro ao disparar lembretes');
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return reminderLogs;
    const query = searchQuery.toLowerCase();
    return reminderLogs.filter(log => 
      log.client_name.toLowerCase().includes(query) ||
      log.client_phone.includes(query)
    );
  }, [reminderLogs, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const today = reminderLogs.filter(log => isToday(parseISO(log.sent_at)));
    const last7Days = reminderLogs.filter(log => {
      const sentDate = parseISO(log.sent_at);
      return sentDate >= subDays(new Date(), 7);
    });
    
    return {
      todaySent: today.filter(l => l.status === 'sent').length,
      todayFailed: today.filter(l => l.status === 'failed').length,
      weekTotal: last7Days.length,
      successRate: last7Days.length > 0 
        ? Math.round((last7Days.filter(l => l.status === 'sent').length / last7Days.length) * 100)
        : 100,
    };
  }, [reminderLogs]);

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case '2h': return '2 horas antes';
      case '30min': return '30 minutos antes';
      case 'manual': return 'Manual';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-emerald-500" />
            WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a conexão e acompanhe os lembretes automáticos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={triggerReminderCheck}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            Disparar Lembretes Agora
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados Hoje</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.todaySent}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas Hoje</p>
                <p className="text-2xl font-bold text-red-600">{stats.todayFailed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                <p className="text-2xl font-bold">{stats.weekTotal}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.successRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="status" className="gap-2">
            <Wifi className="h-4 w-4" />
            Status da Conexão
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <Clock className="h-4 w-4" />
            Reuniões de Hoje
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Histórico de Envios
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <Wifi className="h-5 w-5 text-emerald-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                Status da Instância WhatsApp
              </CardTitle>
              <CardDescription>
                Verifique se a instância Evolution está conectada corretamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                  connectionStatus.connected ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {connectionStatus.connected ? (
                    <Wifi className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-8 w-8 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
                  </h3>
                  {connectionStatus.instanceName && (
                    <p className="text-sm text-muted-foreground">
                      Instância: {connectionStatus.instanceName}
                    </p>
                  )}
                  {connectionStatus.lastCheck && (
                    <p className="text-xs text-muted-foreground">
                      Última verificação: {format(connectionStatus.lastCheck, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={checkConnection}
                  disabled={isCheckingConnection}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  Verificar Conexão
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Lembrete 2h Antes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      "Acabei de finalizar o conteúdo da nossa reunião, agendada para às [HORÁRIO] de hoje. Nos vemos em breve! 🚀"
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Lembrete 30min Antes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      "Em 30 minutos te envio o link de acesso. 🔗 Link da reunião: [LINK]"
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Today's Events Tab */}
        <TabsContent value="today" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Reuniões Agendadas para Hoje
              </CardTitle>
              <CardDescription>
                Status dos lembretes automáticos para cada reunião
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : todayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma reunião agendada para hoje
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horário</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-center">Lembrete 2h</TableHead>
                      <TableHead className="text-center">Lembrete 30min</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.event_time?.slice(0, 5)}
                        </TableCell>
                        <TableCell>{event.client_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {event.client_phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {event.reminder_2h_sent ? (
                            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {event.reminder_30min_sent ? (
                            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Lembretes Enviados</CardTitle>
              <CardDescription>
                Últimos 100 lembretes enviados via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lembrete encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(log.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{log.client_name}</TableCell>
                        <TableCell>{log.client_phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getReminderTypeLabel(log.reminder_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
