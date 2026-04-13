import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TechDeployment {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'requested' | 'support' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_name: string | null;
  assignee: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
}

type DeploymentInsert = Omit<TechDeployment, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'position'>;
type DeploymentUpdate = Partial<Omit<TechDeployment, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'>> & { id: string };

export function useTechDeployments() {
  return useQuery({
    queryKey: ['tech-deployments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_deployments')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      return data as TechDeployment[];
    },
  });
}

export function useCreateTechDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deployment: DeploymentInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tech_deployments')
        .insert({
          ...deployment,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-deployments'] });
    },
  });
}

export function useUpdateTechDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DeploymentUpdate) => {
      const { data, error } = await supabase
        .from('tech_deployments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-deployments'] });
    },
  });
}

export function useDeleteTechDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tech_deployments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-deployments'] });
    },
  });
}

export function useUpdateDeploymentPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; position: number; status?: string }[]) => {
      // Update each deployment's position
      const promises = updates.map(({ id, position, status }) => 
        supabase
          .from('tech_deployments')
          .update({ position, ...(status ? { status } : {}) })
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-deployments'] });
    },
  });
}
