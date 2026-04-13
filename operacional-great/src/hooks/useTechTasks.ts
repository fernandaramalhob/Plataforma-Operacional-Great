import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface TechTask {
  id: string;
  title: string;
  description: string | null;
  type: 'feature' | 'bug' | 'improvement' | 'task';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  assignee: string | null;
  due_date: string | null;
  tags: string[];
  progress: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useTechTasks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tech-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(task => ({
        ...task,
        tags: Array.isArray(task.tags) ? task.tags : [],
      })) as TechTask[];
    },
  });

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tech-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tech_tasks',
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateTechTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      type: TechTask['type'];
      priority: TechTask['priority'];
      status: TechTask['status'];
      assignee?: string;
      due_date?: string;
      tags?: string[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: task, error } = await supabase
        .from('tech_tasks')
        .insert({
          title: data.title,
          description: data.description || null,
          type: data.type,
          priority: data.priority,
          status: data.status,
          assignee: data.assignee || null,
          due_date: data.due_date || null,
          tags: data.tags || [],
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
    },
  });
}

export function useUpdateTechTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TechTask> & { id: string }) => {
      const { id, created_at, updated_at, created_by_user_id, ...updates } = data;
      
      const { error } = await supabase
        .from('tech_tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
    },
  });
}

export function useDeleteTechTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tech_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-tasks'] });
    },
  });
}
