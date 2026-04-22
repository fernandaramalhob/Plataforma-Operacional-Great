import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  client_name: string;
  client_phone: string;
  event_date: string;
  event_time: string;
  duration_minutes: number;
  meeting_link: string | null;
  color: string;
  reminder_2h_sent: boolean;
  reminder_30min_sent: boolean;
  created_by_user_id: string | null;
  assigned_closer_id: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_closer?: {
    id: string;
    full_name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export type AgendaEventInsert = Omit<AgendaEvent, 'id' | 'created_at' | 'updated_at' | 'reminder_2h_sent' | 'reminder_30min_sent' | 'assigned_closer'>;
export type AgendaEventUpdate = Partial<Omit<AgendaEventInsert, 'created_by_user_id'>>;

export const EVENT_COLORS = [
  { label: 'Reunião Marcada', value: '#3B82F6', emoji: '🔵' },
  { label: 'Call Feita', value: '#66FF00', emoji: '🟢' },
  { label: 'Call Não Comparecida', value: '#FF0000', emoji: '🔴' },
  { label: 'Recontato', value: '#B000FF', emoji: '🟣' },
  { label: 'Ficou de Confirmar', value: '#FFA500', emoji: '🟠' },
  { label: 'Reuniões - Great', value: '#808080', emoji: '⬜' },
  { label: 'Amarelo Sol', value: '#FACC15', emoji: '🟡' },
  { label: 'Lilás Lavanda', value: '#C4B5FD', emoji: '💜' },
];

export function useAgendaData() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['agenda-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_events')
        .select(`
          *,
          assigned_closer:profiles!agenda_events_assigned_closer_id_fkey(id, full_name),
          team:teams!agenda_events_team_id_fkey(id, name)
        `)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;
      return data as AgendaEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: AgendaEventInsert) => {
      const { data: userData } = await supabase.auth.getUser();

      // Always store phone in a consistent WhatsApp format (55XXXXXXXXXXX)
      const formattedPhone = formatPhoneForWhatsApp(event.client_phone);
      
      const { data, error } = await supabase
        .from('agenda_events')
        .insert({
          ...event,
          client_phone: formattedPhone,
          created_by_user_id: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: AgendaEventUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('agenda_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error('Erro ao atualizar evento');
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
