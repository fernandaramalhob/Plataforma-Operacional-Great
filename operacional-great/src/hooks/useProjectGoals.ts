import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export type ScrumStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface ProjectGoal {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  estimated_hours: number | null;
  sprint_week: number | null;
  sort_order: number;
  scrum_status: ScrumStatus;
  created_at: string;
  updated_at: string;
}

function mapGoal(d: any): ProjectGoal {
  return {
    ...d,
    description: d.description ?? null,
    estimated_hours: d.estimated_hours ?? null,
    sprint_week: d.sprint_week ?? null,
    sort_order: d.sort_order ?? 0,
    scrum_status: d.scrum_status ?? 'TODO',
  };
}

export function useProjectGoals(projectId: string | null) {
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, refetch } = useQuery({
    queryKey: ['project-goals', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_goals')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(mapGoal);
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-goals-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_goals', filter: `project_id=eq.${projectId}` }, () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, refetch, queryClient]);

  const addGoalMutation = useMutation({
    mutationFn: async ({ title, estimated_hours, scrum_status }: { title: string; estimated_hours?: number; scrum_status?: ScrumStatus }) => {
      if (!projectId) throw new Error('No project ID');
      const maxOrder = goals.length > 0 ? Math.max(...goals.map(g => g.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from('project_goals')
        .insert({
          project_id: projectId,
          title,
          estimated_hours: estimated_hours || null,
          sort_order: maxOrder,
          scrum_status: scrum_status || 'TODO',
          completed: scrum_status === 'DONE',
          completed_at: scrum_status === 'DONE' ? new Date().toISOString() : null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Erro ao adicionar meta'),
  });

  const toggleGoalMutation = useMutation({
    mutationFn: async ({ goalId, completed }: { goalId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('project_goals')
        .update({ completed, completed_at: completed ? new Date().toISOString() : null, scrum_status: completed ? 'DONE' : 'TODO' } as any)
        .eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Erro ao atualizar meta'),
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: Partial<Pick<ProjectGoal, 'title' | 'description' | 'estimated_hours' | 'sprint_week' | 'scrum_status'>> }) => {
      const dbUpdates: any = { ...updates };
      if (updates.scrum_status === 'DONE') {
        dbUpdates.completed = true;
        dbUpdates.completed_at = new Date().toISOString();
      } else if (updates.scrum_status) {
        dbUpdates.completed = false;
        dbUpdates.completed_at = null;
      }
      const { error } = await supabase.from('project_goals').update(dbUpdates).eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-goals'] });
    },
    onError: () => toast.error('Erro ao atualizar meta'),
  });

  const reorderGoalsMutation = useMutation({
    mutationFn: async (reorderedGoals: { id: string; sort_order: number }[]) => {
      await Promise.all(reorderedGoals.map(g =>
        supabase.from('project_goals').update({ sort_order: g.sort_order } as any).eq('id', g.id)
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] }),
    onError: () => toast.error('Erro ao reordenar metas'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('project_goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-goals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-goals'] });
    },
    onError: () => toast.error('Erro ao remover meta'),
  });

  const completedCount = goals.filter(g => g.completed).length;
  const totalCount = goals.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalEstimatedHours = goals.reduce((sum, g) => sum + (g.estimated_hours || 0), 0);
  const completedEstimatedHours = goals.filter(g => g.completed).reduce((sum, g) => sum + (g.estimated_hours || 0), 0);

  return {
    goals,
    isLoading,
    addGoal: (titleOrData: string | { title: string; estimated_hours?: number; scrum_status?: ScrumStatus }) => {
      if (typeof titleOrData === 'string') addGoalMutation.mutate({ title: titleOrData });
      else addGoalMutation.mutate(titleOrData);
    },
    toggleGoal: toggleGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    reorderGoals: reorderGoalsMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    isAdding: addGoalMutation.isPending,
    completedCount,
    totalCount,
    progressPct,
    totalEstimatedHours,
    completedEstimatedHours,
  };
}

/**
 * Hook to fetch ALL project goals across multiple projects (for the Scrum view)
 */
export function useAllProjectGoals(projectIds: string[]) {
  const queryClient = useQueryClient();

  const { data: allGoals = [], isLoading, refetch } = useQuery({
    queryKey: ['all-project-goals', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('project_goals')
        .select('*')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(mapGoal);
    },
    enabled: projectIds.length > 0,
  });

  useEffect(() => {
    const channel = supabase
      .channel('all-project-goals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_goals' }, () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch, queryClient]);

  const movGoal = useMutation({
    mutationFn: async ({ goalId, scrum_status }: { goalId: string; scrum_status: ScrumStatus }) => {
      const dbUpdates: any = { scrum_status };
      if (scrum_status === 'DONE') {
        dbUpdates.completed = true;
        dbUpdates.completed_at = new Date().toISOString();
      } else {
        dbUpdates.completed = false;
        dbUpdates.completed_at = null;
      }
      const { error } = await supabase.from('project_goals').update(dbUpdates).eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, updates }: { goalId: string; updates: Partial<Pick<ProjectGoal, 'title' | 'description' | 'estimated_hours' | 'sprint_week' | 'scrum_status'>> }) => {
      const dbUpdates: any = { ...updates };
      if (updates.scrum_status === 'DONE') {
        dbUpdates.completed = true;
        dbUpdates.completed_at = new Date().toISOString();
      } else if (updates.scrum_status) {
        dbUpdates.completed = false;
        dbUpdates.completed_at = null;
      }
      const { error } = await supabase.from('project_goals').update(dbUpdates).eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Erro ao atualizar atividade'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('project_goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Erro ao remover atividade'),
  });

  const reorderGoalsMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number; scrum_status?: ScrumStatus }[]) => {
      await Promise.all(updates.map(u => {
        const dbUpdates: any = { sort_order: u.sort_order };
        if (u.scrum_status) {
          dbUpdates.scrum_status = u.scrum_status;
          if (u.scrum_status === 'DONE') {
            dbUpdates.completed = true;
            dbUpdates.completed_at = new Date().toISOString();
          } else {
            dbUpdates.completed = false;
            dbUpdates.completed_at = null;
          }
        }
        return supabase.from('project_goals').update(dbUpdates).eq('id', u.id);
      }));
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Erro ao reordenar'),
  });

  return {
    allGoals,
    isLoading,
    moveGoal: movGoal.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    reorderGoals: reorderGoalsMutation.mutate,
  };
}
