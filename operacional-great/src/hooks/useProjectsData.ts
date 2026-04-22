import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  Project, 
  ProjectPhase, 
  ProjectDeliverable, 
  ProjectRisk, 
  ProjectUpdate,
  ProjectMilestone,
  CreateProjectForm,
  ProjectStatus,
  ProjectPriority,
  ProjectTeam
} from '@/types/projects';

export function useProjectsData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all projects with related data
  const { data: projects = [], isLoading: isLoadingProjects, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:operational_clients(client_name, clinic_name),
          owner:profiles!projects_owner_user_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch owners for projects with owner_user_ids
      const projectsWithOwners = await Promise.all(
        (data || []).map(async (project) => {
          if (project.owner_user_ids && project.owner_user_ids.length > 0) {
            const { data: owners } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', project.owner_user_ids);
            return { ...project, owners: owners || [] };
          }
          return { ...project, owners: [] };
        })
      );

      return projectsWithOwners as Project[];
    },
  });

  // Fetch phases for a specific project
  const usePhasesQuery = (projectId: string | undefined) => useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data as ProjectPhase[];
    },
    enabled: !!projectId,
  });

  // Fetch deliverables for a specific project
  const useDeliverablesQuery = (projectId: string | undefined) => useQuery({
    queryKey: ['project-deliverables', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_deliverables')
        .select(`
          *,
          assignee:profiles!project_deliverables_assigned_to_user_id_fkey(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectDeliverable[];
    },
    enabled: !!projectId,
  });

  // Fetch risks for a specific project
  const useRisksQuery = (projectId: string | undefined) => useQuery({
    queryKey: ['project-risks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_risks')
        .select(`
          *,
          owner:profiles!project_risks_owner_user_id_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .order('severity', { ascending: false });

      if (error) throw error;
      return data as ProjectRisk[];
    },
    enabled: !!projectId,
  });

  // Fetch updates for a specific project
  const useUpdatesQuery = (projectId: string | undefined) => useQuery({
    queryKey: ['project-updates', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_updates')
        .select(`
          *,
          author:profiles!project_updates_author_user_id_fkey(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectUpdate[];
    },
    enabled: !!projectId,
  });

  // Fetch all risks (for risks view)
  const { data: allRisks = [], isLoading: isLoadingAllRisks } = useQuery({
    queryKey: ['all-project-risks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_risks')
        .select(`
          *,
          owner:profiles!project_risks_owner_user_id_fkey(full_name),
          project:projects(name, code)
        `)
        .order('severity', { ascending: false });

      if (error) throw error;
      return data as (ProjectRisk & { project: { name: string; code: string } })[];
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (form: CreateProjectForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: form.name,
          client_id: form.client_id || null,
          team: form.team || null,
          owner_user_id: form.owner_user_ids[0] || null,
          owner_user_ids: form.owner_user_ids,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
          priority: form.priority,
          budget_planned: form.budget_planned || null,
          description: form.description || null,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default phases
      const defaultPhases = [
        { name: 'Planejamento', order: 1 },
        { name: 'Desenvolvimento', order: 2 },
        { name: 'Revisão', order: 3 },
        { name: 'Entrega', order: 4 },
      ];

      await supabase.from('project_phases').insert(
        defaultPhases.map(phase => ({
          project_id: data.id,
          name: phase.name,
          order: phase.order,
        }))
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Projeto criado com sucesso!' });
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast({ title: 'Erro ao criar projeto', variant: 'destructive' });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Projeto atualizado!' });
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast({ title: 'Erro ao atualizar projeto', variant: 'destructive' });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Projeto excluído!' });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast({ title: 'Erro ao excluir projeto', variant: 'destructive' });
    },
  });

  // Create/update phase mutation
  const upsertPhaseMutation = useMutation({
    mutationFn: async (phase: { project_id: string; name: string; order?: number; status?: string; id?: string }) => {
      const { error } = await supabase
        .from('project_phases')
        .upsert({
          project_id: phase.project_id,
          name: phase.name,
          order: phase.order ?? 0,
          status: phase.status ?? 'NAO_INICIADA',
          ...(phase.id ? { id: phase.id } : {}),
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', variables.project_id] });
    },
  });

  // Create deliverable mutation
  const createDeliverableMutation = useMutation({
    mutationFn: async (deliverable: { project_id: string; name: string; type?: string; phase_id?: string; assigned_to_user_id?: string }) => {
      const { error } = await supabase
        .from('project_deliverables')
        .insert({
          project_id: deliverable.project_id,
          name: deliverable.name,
          type: deliverable.type ?? 'OUTRO',
          phase_id: deliverable.phase_id ?? null,
          assigned_to_user_id: deliverable.assigned_to_user_id ?? null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-deliverables', variables.project_id] });
      toast({ title: 'Entrega adicionada!' });
    },
  });

  // Update deliverable mutation
  const updateDeliverableMutation = useMutation({
    mutationFn: async ({ id, updates, project_id }: { id: string; updates: { status?: string; name?: string }; project_id: string }) => {
      const { error } = await supabase
        .from('project_deliverables')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { project_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-deliverables', result.project_id] });
    },
  });

  // Create risk mutation
  const createRiskMutation = useMutation({
    mutationFn: async (risk: { project_id: string; title: string; severity?: string; probability?: string; mitigation_plan?: string; owner_user_id?: string }) => {
      const { error } = await supabase
        .from('project_risks')
        .insert({
          project_id: risk.project_id,
          title: risk.title,
          severity: risk.severity ?? 'MEDIA',
          probability: risk.probability ?? 'MEDIA',
          mitigation_plan: risk.mitigation_plan ?? null,
          owner_user_id: risk.owner_user_id ?? null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-risks', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['all-project-risks'] });
      toast({ title: 'Risco registrado!' });
    },
  });

  // Create update/note mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (update: { project_id: string; type: string; body: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('project_updates')
        .insert({
          ...update,
          author_user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-updates', variables.project_id] });
      toast({ title: 'Atualização registrada!' });
    },
  });

  // Duplicate project mutation (copies project + phases + goals)
  const duplicateProjectMutation = useMutation({
    mutationFn: async (sourceProject: Project) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Create the new project (copy all relevant fields)
      const { data: newProject, error: projError } = await supabase
        .from('projects')
        .insert({
          name: `${sourceProject.name} (cópia)`,
          description: sourceProject.description || null,
          client_id: sourceProject.client_id || null,
          team: sourceProject.team || null,
          owner_user_id: sourceProject.owner_user_id || null,
          owner_user_ids: sourceProject.owner_user_ids || [],
          start_date: sourceProject.start_date || null,
          due_date: sourceProject.due_date || null,
          priority: sourceProject.priority,
          budget_planned: sourceProject.budget_planned || null,
          status: 'PLANEJADO',
          progress_pct: 0,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (projError) throw projError;

      // 2. Copy phases
      const { data: phases } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', sourceProject.id)
        .order('order', { ascending: true });

      if (phases && phases.length > 0) {
        await supabase.from('project_phases').insert(
          phases.map(({ id, created_at, updated_at, project_id, ...p }) => ({
            ...p,
            project_id: newProject.id,
            progress_pct: 0,
            status: 'NAO_INICIADA',
          }))
        );
      }

      // 3. Copy goals (sub-atividades / scrum tasks)
      const { data: goals } = await supabase
        .from('project_goals')
        .select('*')
        .eq('project_id', sourceProject.id)
        .order('sort_order', { ascending: true });

      if (goals && goals.length > 0) {
        await supabase.from('project_goals').insert(
          (goals as any[]).map(({ id, created_at, updated_at, project_id, completed_at, ...g }) => ({
            ...g,
            project_id: newProject.id,
            completed: false,
            completed_at: null,
            scrum_status: 'TODO',
          }))
        );
      }

      // 4. Copy deliverables
      const { data: deliverables } = await supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', sourceProject.id);

      if (deliverables && deliverables.length > 0) {
        await supabase.from('project_deliverables').insert(
          deliverables.map(({ id, created_at, updated_at, project_id, ...d }) => ({
            ...d,
            project_id: newProject.id,
            status: 'PENDENTE',
          }))
        );
      }

      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['all-project-goals'] });
      toast({ title: 'Projeto duplicado com sucesso!' });
    },
    onError: (error) => {
      console.error('Error duplicating project:', error);
      toast({ title: 'Erro ao duplicar projeto', variant: 'destructive' });
    },
  });

  return {
    // Data
    projects,
    allRisks,
    // Loading states
    isLoadingProjects,
    isLoadingAllRisks,
    // Errors
    projectsError,
    // Mutations
    createProject: createProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
    duplicateProject: duplicateProjectMutation.mutateAsync,
    upsertPhase: upsertPhaseMutation.mutateAsync,
    createDeliverable: createDeliverableMutation.mutateAsync,
    updateDeliverable: updateDeliverableMutation.mutateAsync,
    createRisk: createRiskMutation.mutateAsync,
    createUpdate: createUpdateMutation.mutateAsync,
    // Loading states for mutations
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDuplicating: duplicateProjectMutation.isPending,
    // Query hooks for detail views
    usePhasesQuery,
    useDeliverablesQuery,
    useRisksQuery,
    useUpdatesQuery,
  };
}
