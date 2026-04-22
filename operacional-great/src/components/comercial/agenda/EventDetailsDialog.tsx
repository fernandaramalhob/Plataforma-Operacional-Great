import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgendaData, AgendaEvent, EVENT_COLORS } from '@/hooks/useAgendaData';
import { Loader2, Trash2, Clock, User, Phone, Link, MessageCircle, Check, X, Send, Bell, UserCheck, DollarSign, Users2, Megaphone, Edit3, StickyNote, Copy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgendamentoData, FATURAMENTO_OPTIONS, TEM_SOCIO_OPTIONS, TEM_MKT_OPTIONS, TEM_SECRETARIA_OPTIONS, SALAO_OU_CLINICA_OPTIONS, STATUS_OPTIONS } from '@/hooks/useAgendamentoData';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';
import { useCommercialSafe, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AgendaEvent | null;
  onDuplicate?: (event: AgendaEvent) => void;
}

interface CloserProfile {
  id: string;
  full_name: string;
}

export function EventDetailsDialog({ open, onOpenChange, event, onDuplicate }: EventDetailsDialogProps) {
  const queryClient = useQueryClient();
  const { updateEvent, deleteEvent } = useAgendaData();
  const { leads: agendamentoLeads } = useAgendamentoData();
  const { pipelineClients } = useCommercialSafe();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [quickNotes, setQuickNotes] = useState('');

  // Find matching lead data by phone number
  const leadData = useMemo(() => {
    if (!event) return null;
    
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^55/, '');
    const eventPhone = normalizePhone(event.client_phone);
    
    return agendamentoLeads.find(lead => {
      const leadPhone = normalizePhone(lead.telefone);
      return leadPhone === eventPhone || eventPhone.endsWith(leadPhone) || leadPhone.endsWith(eventPhone);
    }) || null;
  }, [event, agendamentoLeads]);
  
  // Find matching pipeline client to get custom faturamento
  const pipelineClient = useMemo(() => {
    if (!event?.client_phone || !pipelineClients) return null;
    
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^55/, '');
    const eventPhone = normalizePhone(event.client_phone);
    
    return pipelineClients.find(client => {
      if (!client.telefone) return false;
      const clientPhone = normalizePhone(client.telefone);
      return clientPhone === eventPhone || eventPhone.endsWith(clientPhone) || clientPhone.endsWith(eventPhone);
    }) || null;
  }, [event?.client_phone, pipelineClients]);
  
  // Helper to get faturamento display - check for custom value from pipeline
  const getFaturamentoDisplay = () => {
    // First check if pipeline client has custom faturamento
    if (pipelineClient?.faturamento === 'PERSONALIZADO' && pipelineClient?.faturamentoPersonalizado) {
      return pipelineClient.faturamentoPersonalizado;
    }
    // Fall back to lead data value
    if (leadData?.faturamento) {
      return FATURAMENTO_OPTIONS.find(f => f.value === leadData.faturamento)?.label || leadData.faturamento;
    }
    return 'Não informado';
  };

  // Lead edit form state
  const [leadFormData, setLeadFormData] = useState({
    faturamento: '',
    pode_investir: '',
    tem_socio: '',
    tem_mkt: '',
    tem_secretaria: '',
    salao_ou_clinica: '',
    status: '',
    notes: '',
    title: '',
  });

  // Update lead form when leadData or event changes
  useEffect(() => {
    if (leadData || event || pipelineClient) {
      setLeadFormData({
        faturamento: leadData?.faturamento || pipelineClient?.faturamento || '',
        pode_investir: leadData?.pode_investir || pipelineClient?.podeInvestir || '',
        tem_socio: leadData?.tem_socio || pipelineClient?.temSocio || '',
        tem_mkt: leadData?.tem_mkt || pipelineClient?.temMkt || '',
        tem_secretaria: leadData?.tem_secretaria || pipelineClient?.temSecretaria || '',
        salao_ou_clinica: leadData?.salao_ou_clinica || pipelineClient?.salaoOuClinica || '',
        status: leadData?.status || '',
        notes: event?.notes || '',
        title: event?.title || '',
      });
    }
  }, [leadData, event, pipelineClient]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    client_name: '',
    client_phone: '',
    event_date: '',
    event_time: '',
    duration_minutes: 60,
    meeting_link: '',
    color: '#3b82f6',
    assigned_closer_id: '' as string | null,
  });

  // Fetch closers (users with CLOSER commercial role)
  const { data: closers = [] } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('commercial_role', 'CLOSER')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as CloserProfile[];
    },
  });

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setIsEditingLead(false);
      setConfirmDelete(false);
      setIsEditingNotes(false);
    }
  }, [open]);

  // Initialize quick notes when event changes
  useEffect(() => {
    if (event) {
      setQuickNotes(event.notes || '');
    }
  }, [event]);

  // Handle saving quick notes
  const handleSaveQuickNotes = async () => {
    if (!event) return;
    
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        notes: quickNotes || null,
      });
      setIsEditingNotes(false);
      toast.success('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar anotação');
    }
  };

  // Handle saving lead data — updates agendamento_leads ONLY, no pipeline sync
  const handleSaveLeadData = async () => {
    if (!event) return;
    
    try {
      const leadUpdates = {
        faturamento: (leadFormData.faturamento as any) || '0_A_15K',
        pode_investir: leadFormData.faturamento === '0_A_15K' ? (leadFormData.pode_investir as any) || null : null,
        tem_socio: (leadFormData.tem_socio as any) || 'NAO',
        tem_mkt: (leadFormData.tem_mkt as any) || 'NAO',
        tem_secretaria: (leadFormData.tem_secretaria as any) || 'NAO',
        salao_ou_clinica: (leadFormData.salao_ou_clinica as any) || 'NAO_INFORMADO',
        status: leadFormData.status || undefined,
      };

      if (leadData) {
        // Direct DB update — avoids pipeline sync in useAgendamentoData.updateLead
        const { error: updateError } = await supabase
          .from('agendamento_leads')
          .update(leadUpdates)
          .eq('id', leadData.id);
        if (updateError) throw updateError;
      } else {
        // Check by phone to prevent duplicates
        const phoneDigits = formatPhoneForWhatsApp(event.client_phone);
        const last8 = phoneDigits.replace(/\D/g, '').slice(-8);
        
        const { data: existingAgendamento } = await supabase
          .from('agendamento_leads')
          .select('id')
          .filter('telefone', 'like', `%${last8}`)
          .maybeSingle();

        if (existingAgendamento) {
          await supabase.from('agendamento_leads').update(leadUpdates).eq('id', existingAgendamento.id);
        } else {
          const eventDateParts = event.event_date.split('-');
          const formattedDate = `${eventDateParts[2]}/${eventDateParts[1]}/${eventDateParts[0]}`;
          
          const hour = parseInt(event.event_time.split(':')[0]);
          let horario: 'MANHA' | 'TARDE' | 'NOITE' = 'MANHA';
          if (hour >= 12 && hour < 18) horario = 'TARDE';
          else if (hour >= 18) horario = 'NOITE';
          
          const { data: userData } = await supabase.auth.getUser();
          
          // Direct insert — no pipeline sync
          const { error } = await supabase.from('agendamento_leads').insert({
            nome: event.client_name,
            telefone: phoneDigits,
            data: formattedDate,
            horario,
            ...leadUpdates,
            funil: 'AGENDA',
            status: leadFormData.status || 'ENTRAR EM CONTATO',
            created_by_user_id: userData.user?.id,
          });
          
          if (error) throw error;
        }
      }
      
      // Update event title and notes
      await updateEvent.mutateAsync({
        id: event.id,
        title: leadFormData.title,
        notes: leadFormData.notes || null,
      });
      
      queryClient.invalidateQueries({ queryKey: ['agendamento-leads'] });
      
      setIsEditingLead(false);
      toast.success(leadData ? 'Dados atualizados com sucesso!' : 'Lead criado e dados salvos com sucesso!');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Erro ao salvar dados');
    }
  };

  // Update form data when event changes
  useEffect(() => {
    if (event && open) {
      setFormData({
        title: event.title,
        description: event.description || '',
        notes: event.notes || '',
        client_name: event.client_name,
        client_phone: formatPhoneDisplay(event.client_phone),
        event_date: event.event_date,
        event_time: event.event_time.slice(0, 5),
        duration_minutes: event.duration_minutes || 60,
        meeting_link: event.meeting_link || '',
        color: event.color || '#3b82f6',
        assigned_closer_id: event.assigned_closer_id || '',
      });
    }
  }, [event, open]);

  const handleEdit = () => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        notes: event.notes || '',
        client_name: event.client_name,
        client_phone: formatPhoneDisplay(event.client_phone),
        event_date: event.event_date,
        event_time: event.event_time.slice(0, 5),
        duration_minutes: event.duration_minutes || 60,
        meeting_link: event.meeting_link || '',
        color: event.color || '#3b82f6',
        assigned_closer_id: event.assigned_closer_id || '',
      });
      setIsEditing(true);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return phone;
  };

  const formatPhoneInput = (value: string) => {
    return value;
  };

  const handleSave = async () => {
    if (!event) return;
    
    await updateEvent.mutateAsync({
      id: event.id,
      title: formData.title,
      description: formData.description || null,
      notes: formData.notes || null,
      client_name: formData.client_name,
      client_phone: formatPhoneForWhatsApp(formData.client_phone),
      event_date: formData.event_date,
      event_time: formData.event_time,
      duration_minutes: formData.duration_minutes,
      meeting_link: formData.meeting_link || null,
      color: formData.color,
      assigned_closer_id: formData.assigned_closer_id || null,
    });
    
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    await deleteEvent.mutateAsync(event.id);
    onOpenChange(false);
  };

  const handleSendManualReminder = async (messageType: 'default' | '2h' | '30min') => {
    if (!event) return;

    setIsSendingReminder(true);
    try {
      const { error } = await supabase.functions.invoke('send-manual-reminder', {
        body: { eventId: event.id, messageType },
      });

      if (error) {
        const rawBody = (error as any)?.context?.body;
        let friendlyMessage = error.message;

        if (typeof rawBody === 'string') {
          try {
            const parsed = JSON.parse(rawBody);
            friendlyMessage = parsed?.details
              ? `${parsed.error}: ${parsed.details}`
              : parsed?.error ?? friendlyMessage;
          } catch {
            // ignore
          }
        }

        toast.error(friendlyMessage);
        return;
      }

      toast.success('Lembrete enviado com sucesso!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Erro ao enviar lembrete');
    } finally {
      setIsSendingReminder(false);
    }
  };

  if (!event) return null;

  const eventDateTime = parseISO(`${event.event_date}T${event.event_time}`);

  const handleQuickColorChange = async (newColor: string) => {
    if (!event) return;
    await updateEvent.mutateAsync({
      id: event.id,
      color: newColor,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="w-4 h-4 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all" 
                    style={{ backgroundColor: event.color }}
                    title="Alterar cor"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground mb-2">Alterar cor</p>
                    <div className="flex gap-1 flex-wrap max-w-[180px]">
                      {EVENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          className={`w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform ${
                            event.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleQuickColorChange(color.value)}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {isEditing ? 'Editar Evento' : event.title}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {event.reminder_2h_sent && (
                <Badge variant="outline" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  2h
                </Badge>
              )}
              {event.reminder_30min_sent && (
                <Badge variant="outline" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  30min
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="client_name">Nome do Cliente *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="client_phone">WhatsApp *</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: formatPhoneInput(e.target.value) })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="event_date">Data *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="event_time">Horário *</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duração</Label>
                <Select
                  value={String(formData.duration_minutes)}
                  onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="color">Cor</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Closer Responsável */}
              <div className="col-span-2">
                <Label htmlFor="assigned_closer">Closer Responsável</Label>
                <Select
                  value={formData.assigned_closer_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, assigned_closer_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um closer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Nenhum</span>
                    </SelectItem>
                    {closers.map((closer) => (
                      <SelectItem key={closer.id} value={closer.id}>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          {closer.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="meeting_link">Link da Reunião</Label>
                <Input
                  id="meeting_link"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="notes">📝 Anotações sobre o cliente</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione notas importantes sobre este cliente..."
                  rows={3}
                  className="bg-muted/50"
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateEvent.isPending}>
                  {updateEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(eventDateTime, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  {' '}({event.duration_minutes || 60} min)
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{event.client_name}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{formatPhoneDisplay(event.client_phone)}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open(`https://wa.me/55${event.client_phone}`, '_blank')}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              </div>

              {/* Lead Info Card - Edição rápida */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3 border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {leadData ? 'Informações do Lead' : 'Informações do Agendamento'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsEditingLead(!isEditingLead)}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {isEditingLead ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
                
                {isEditingLead ? (
                  <div className="space-y-3">
                    {/* Título da Reunião */}
                    <div>
                      <Label className="text-xs">Título da Reunião</Label>
                      <Input
                        value={leadFormData.title}
                        onChange={(e) => setLeadFormData({ ...leadFormData, title: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="Título do evento..."
                      />
                    </div>
                    
                    {/* Always show lead fields - they will create new lead if it doesn't exist */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Faturamento</Label>
                        <Select
                          value={leadFormData.faturamento || '0_A_15K'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, faturamento: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FATURAMENTO_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tem sócio?</Label>
                        <Select
                          value={leadFormData.tem_socio || 'NAO'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, tem_socio: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TEM_SOCIO_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tem Marketing?</Label>
                        <Select
                          value={leadFormData.tem_mkt || 'NAO'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, tem_mkt: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TEM_MKT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Salão ou Clínica?</Label>
                        <Select
                          value={leadFormData.salao_ou_clinica || 'NAO_INFORMADO'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, salao_ou_clinica: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SALAO_OU_CLINICA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tem Secretária?</Label>
                        <Select
                          value={leadFormData.tem_secretaria || 'NAO'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, tem_secretaria: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TEM_SECRETARIA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Campo Pode Investir - somente se faturamento = 0-15K */}
                      {leadFormData.faturamento === '0_A_15K' && (
                        <div>
                          <Label className="text-xs">Pode investir?</Label>
                          <Select
                            value={leadFormData.pode_investir || ''}
                            onValueChange={(value) => setLeadFormData({ ...leadFormData, pode_investir: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SIM">Sim</SelectItem>
                              <SelectItem value="NAO">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={leadFormData.status || 'NOVO_LEAD'}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, status: value })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Anotações */}
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        Anotações
                      </Label>
                      <Textarea
                        value={leadFormData.notes}
                        onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })}
                        className="text-xs min-h-[60px]"
                        placeholder="Adicione anotações sobre este cliente..."
                      />
                    </div>
                    
                    {!leadData && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        ℹ️ Lead não encontrado. Ao salvar, será criado automaticamente no Controle de Agendamento.
                      </p>
                    )}
                    
                    <Button 
                      size="sm" 
                      className="w-full h-8"
                      onClick={handleSaveLeadData}
                      disabled={updateEvent.isPending}
                    >
                      {updateEvent.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                ) : (
                  (leadData || pipelineClient) ? (
                    <div className="space-y-2">
                      {/* SDR que agendou */}
                      {pipelineClient?.agendadoPor && (
                        <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-md px-2 py-1">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">Agendado por:</span>
                          <span className="font-semibold text-primary">
                            {AGENDADOR_OPTIONS.find(a => a.value === pipelineClient.agendadoPor)?.label || pipelineClient.agendadoPor}
                          </span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Faturamento:</span>
                          <span className="font-medium">
                            {getFaturamentoDisplay()}
                          </span>
                        </div>
                        
                        {/* Pode investir - mostrar apenas para faturamento 0-15K */}
                        {(leadData?.faturamento === '0_A_15K' || pipelineClient?.faturamento === '0_A_15K') && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-amber-500" />
                            <span className="text-muted-foreground">Pode investir?</span>
                            <Badge variant={
                              (leadData?.pode_investir === 'SIM' || pipelineClient?.podeInvestir === 'SIM') ? 'default' : 
                              (leadData?.pode_investir === 'NAO' || pipelineClient?.podeInvestir === 'NAO') ? 'destructive' : 'secondary'
                            }>
                              {leadData?.pode_investir || pipelineClient?.podeInvestir || 'Não informado'}
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Users2 className="h-4 w-4 text-blue-500" />
                          <span className="text-muted-foreground">Tem sócio?</span>
                          <Badge variant={(leadData?.tem_socio || pipelineClient?.temSocio) === 'SIM' ? 'default' : 'secondary'}>
                            {(leadData?.tem_socio || pipelineClient?.temSocio) === 'SIM' ? 'Sim' : 'Não'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Megaphone className="h-4 w-4 text-orange-500" />
                          <span className="text-muted-foreground">Tem Marketing?</span>
                          <Badge variant={(leadData?.tem_mkt || pipelineClient?.temMkt) === 'SIM' ? 'default' : 'secondary'}>
                            {(leadData?.tem_mkt || pipelineClient?.temMkt) === 'SIM' ? 'Sim' : 'Não'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-purple-500" />
                          <span className="text-muted-foreground">Tem Secretária?</span>
                          <Badge variant={(leadData?.tem_secretaria || pipelineClient?.temSecretaria) === 'SIM' ? 'default' : 'secondary'}>
                            {(leadData?.tem_secretaria || pipelineClient?.temSecretaria) === 'SIM' ? 'Sim' : 'Não'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Salão/Clínica:</span>
                          <Badge variant="outline">
                            {SALAO_OU_CLINICA_OPTIONS.find(o => o.value === (leadData?.salao_ou_clinica || pipelineClient?.salaoOuClinica))?.label || 'Não informado'}
                          </Badge>
                        </div>
                        
                        {leadData?.status && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline">{leadData.status}</Badge>
                          </div>
                        )}
                        
                        {/* Criativo */}
                        {pipelineClient?.criativo && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Criativo:</span>
                            <Badge variant="outline">{pipelineClient.criativo}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Lead não encontrado. Clique em "Editar" para adicionar dados.
                    </p>
                  )
                )}
              </div>

              {/* Show assigned closer */}
              {event.assigned_closer && (
                <div className="flex items-center gap-3 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span>Closer: <strong>{event.assigned_closer.full_name}</strong></span>
                </div>
              )}
              
              {event.meeting_link && (
                <div className="flex items-center gap-3 text-sm">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={event.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Link da reunião
                  </a>
                </div>
              )}
              
              {event.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              )}

              {/* Notes section - Always visible with quick edit */}
              <div className="pt-3 border-t bg-muted/30 -mx-4 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />
                    Anotações
                  </p>
                  {!isEditingNotes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {event.notes ? 'Editar' : 'Adicionar'}
                    </Button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      placeholder="Adicione uma anotação sobre este cliente..."
                      className="text-sm min-h-[80px] bg-background"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQuickNotes(event.notes || '');
                          setIsEditingNotes(false);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveQuickNotes}
                        disabled={updateEvent.isPending}
                      >
                        {updateEvent.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        <Check className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : event.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma anotação. Clique em "Adicionar" para criar.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      disabled={isSendingReminder}
                    >
                      {isSendingReminder ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      Enviar Lembrete Manual
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuItem onClick={() => handleSendManualReminder('default')}>
                      <Send className="h-4 w-4 mr-2" />
                      Lembrete Padrão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendManualReminder('2h')}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mensagem 2h (Conteúdo pronto)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendManualReminder('30min')}>
                      <Clock className="h-4 w-4 mr-2" />
                      Mensagem 30min (Link reunião)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {onDuplicate && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onDuplicate(event);
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </Button>
              )}
              <Button onClick={handleEdit}>
                Editar
              </Button>
            </div>
          </div>
        )}
        
        {confirmDelete && (
          <div className="absolute inset-0 bg-background/95 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-4">
              <p className="font-medium">Tem certeza que deseja excluir este evento?</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteEvent.isPending}>
                  {deleteEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
