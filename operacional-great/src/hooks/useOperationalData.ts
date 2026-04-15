import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  due_date: string | null;
  assignee_user_id: string | null;
  reporter_user_id: string;
  related_client_id: string | null;
  team_id: string | null;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface Meeting {
  id: string;
  title: string;
  datetime_start: string;
  datetime_end: string;
  agenda: string | null;
  notes: string | null;
  participants: any;
  scope: string;
  team_id: string | null;
  created_by_user_id: string;
  recording_link: string | null;
  created_at: string;
}

export function useWorkItems() {
  return useQuery({
    queryKey: ['work-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkItem[];
    },
  });
}

export function useUpcomingTasks(limit = 5) {
  return useQuery({
    queryKey: ['upcoming-tasks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
        `)
        .in('status', ['BACKLOG', 'TODO', 'EM_ANDAMENTO'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as WorkItem[];
    },
  });
}

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('datetime_start', { ascending: true });

      if (error) throw error;
      return data as Meeting[];
    },
  });
}

export function useUpcomingMeetings(limit = 5) {
  return useQuery({
    queryKey: ['upcoming-meetings', limit],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .gte('datetime_start', now)
        .order('datetime_start', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data as Meeting[]).filter((meeting) => {
        const meetingDate = new Date(meeting.datetime_start);
        return !Number.isNaN(meetingDate.getTime()) && meetingDate >= new Date(now);
      });
    },
  });
}

export function useBlockedTasks() {
  return useQuery({
    queryKey: ['blocked-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('status', 'BLOQUEADO')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkItem[];
    },
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          assignee:profiles!work_items_assignee_user_id_fkey(id, full_name, avatar_url)
        `)
        .lt('due_date', today)
        .in('status', ['BACKLOG', 'TODO', 'EM_ANDAMENTO'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as WorkItem[];
    },
  });
}
