import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { 
  StrategicTask, 
  StrategicDecision, 
  CreateStrategicTaskForm,
  StrategicTaskStatus 
} from '@/types/strategic-tasks';

export function useStrategicTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all strategic tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['strategic-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_tasks')
        .select('*')
        .order('impact_score', { ascending: false });

      if (error) throw error;
      
      // Fetch related data separately since FK relations aren't set up
      const tasksWithRelations = await Promise.all(
        (data || []).map(async (task) => {
          let project = null;
          let assignee = null;
          let creator = null;
          
          if (task.project_id) {
            const { data: projectData } = await supabase
              .from('projects')
              .select('name, code')
              .eq('id', task.project_id)
              .maybeSingle();
            project = projectData;
          }
          
          if (task.assigned_to_user_id) {
            const { data: assigneeData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', task.assigned_to_user_id)
              .maybeSingle();
            assignee = assigneeData;
          }
          
          if (task.created_by_user_id) {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', task.created_by_user_id)
              .maybeSingle();
            creator = creatorData;
          }
          
          return {
            ...task,
            project,
            assignee,
            creator,
          };
        })
      );
      
      return tasksWithRelations.map(task => ({
        ...task,
        tags: Array.isArray(task.tags) ? task.tags : [],
      })) as StrategicTask[];
    },
  });

  // Fetch decisions
  const { data: decisions = [], isLoading: isLoadingDecisions } = useQuery({
    queryKey: ['strategic-decisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch creator info separately
      const decisionsWithCreators = await Promise.all(
        (data || []).map(async (decision) => {
          let creator = null;
          if (decision.created_by_user_id) {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', decision.created_by_user_id)
              .maybeSingle();
            creator = creatorData;
          }
          return { ...decision, creator };
        })
      );
      
      return decisionsWithCreators as StrategicDecision[];
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (form: CreateStrategicTaskForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('strategic_tasks')
        .insert({
          title: form.title,
          description: form.description || null,
          strategic_goal: form.strategic_goal,
          impact_revenue: form.impact_revenue,
          impact_operational: form.impact_operational,
          urgency: form.urgency,
          effort_estimate: form.effort_estimate,
          delay_cost_financial: form.delay_cost_financial || 0,
          delay_cost_project_impact: form.delay_cost_project_impact || null,
          delay_cost_deadline_impact: form.delay_cost_deadline_impact || null,
          project_id: form.project_id || null,
          assigned_to_user_id: form.assigned_to_user_id || null,
          due_date: form.due_date || null,
          tags: form.tags || [],
          created_by_user_id: user.id,
          status: 'TODO',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
      toast({ title: 'Tarefa criada com sucesso!' });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StrategicTask> }) => {
      const { error } = await supabase
        .from('strategic_tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
    },
  });

  // Move task (change status)
  const moveTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StrategicTaskStatus }) => {
      const { error } = await supabase
        .from('strategic_tasks')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
    },
    onError: (error) => {
      console.error('Error moving task:', error);
      toast({ title: 'Erro ao mover tarefa', variant: 'destructive' });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('strategic_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
      toast({ title: 'Tarefa excluída!' });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' });
    },
  });

  // Create decision mutation
  const createDecisionMutation = useMutation({
    mutationFn: async (decision: Omit<StrategicDecision, 'id' | 'created_at' | 'updated_at' | 'creator'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('strategic_decisions')
        .insert({
          ...decision,
          created_by_user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-decisions'] });
      toast({ title: 'Decisão registrada!' });
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('strategic-tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'strategic_tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['strategic-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Computed values
  const topTasks = tasks
    .filter(t => !['CONCLUIDO', 'CANCELADO', 'BLOQUEADO'].includes(t.status))
    .slice(0, 3);

  const ghostTasks = tasks.filter(task => {
    const now = new Date();
    const createdAt = new Date(task.created_at);
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    const isStale = daysSinceCreation > 14 && !['CONCLUIDO', 'CANCELADO'].includes(task.status);
    const hasExcessiveChanges = task.status_changes_count > 3;
    const isOrphaned = !task.assigned_to_user_id && daysSinceCreation > 7 && task.status !== 'BACKLOG';
    
    return isStale || hasExcessiveChanges || isOrphaned;
  });

  const tasksByStatus = (status: StrategicTaskStatus) => 
    tasks.filter(t => t.status === status).sort((a, b) => b.impact_score - a.impact_score);

  return {
    tasks,
    decisions,
    topTasks,
    ghostTasks,
    tasksByStatus,
    isLoading,
    isLoadingDecisions,
    error,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    moveTask: moveTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    createDecision: createDecisionMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
  };
}
