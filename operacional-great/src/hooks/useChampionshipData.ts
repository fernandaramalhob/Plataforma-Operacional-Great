import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChampionshipTeam {
  id: string;
  team_id: string;
  label: string;
  badge_color: string;
  total_points: number;
  renewals: number;
  losses: number;
  items_sold: number;
  previous_rank: number | null;
  current_rank: number;
  created_at: string;
  updated_at: string;
}

export interface ChampionshipEvent {
  id: string;
  team_id: string;
  event_type: 'RENEWAL' | 'LOSS' | 'ITEM_SOLD';
  points: number;
  description: string | null;
  item_label: string | null;
  client_name: string | null;
  created_by: string | null;
  created_at: string;
  creator_name?: string;
}

export interface ChampionshipMonthlyHistory {
  id: string;
  team_id: string;
  month: string;
  total_points: number;
  renewals: number;
  losses: number;
  items_sold: number;
  rank: number | null;
  created_at: string;
}

// Scoring rules
export const SCORING_RULES = {
  RENEWAL: { points: 3, label: 'Renovação' },
  LOSS: { points: -2, label: 'Perda de Cliente' },
  ITEM_SOLD: { points: 1, label: 'Item Vendido' },
} as const;

export const SELLABLE_ITEMS = [
  { label: 'Agenda', value: 'agenda' },
  { label: 'CRM', value: 'crm' },
  { label: 'Atriz', value: 'atriz' },
  { label: 'Social Selling', value: 'social_selling' },
  { label: 'IA', value: 'ia' },
  { label: 'ID Visual', value: 'id_visual' },
  { label: 'Story Vendedor', value: 'story_vendedor' },
  { label: 'Linktree', value: 'linktree' },
] as const;

export function useChampionshipTeams() {
  return useQuery({
    queryKey: ['championship-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('championship_teams')
        .select('*')
        .order('current_rank', { ascending: true });
      
      if (error) throw error;
      return data as ChampionshipTeam[];
    },
  });
}

export function useChampionshipEvents(limit = 20) {
  return useQuery({
    queryKey: ['championship-events', limit],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('championship_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      // Get creator names
      const creatorIds = [...new Set(events.map(e => e.created_by).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
        }
      }

      return events.map(event => ({
        ...event,
        creator_name: event.created_by ? profilesMap[event.created_by] || 'Usuário' : 'Sistema',
      })) as ChampionshipEvent[];
    },
  });
}

export function useChampionshipMonthlyHistory(teamId?: string) {
  return useQuery({
    queryKey: ['championship-monthly-history', teamId],
    queryFn: async () => {
      let query = supabase
        .from('championship_monthly_history')
        .select('*')
        .order('month', { ascending: true });
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ChampionshipMonthlyHistory[];
    },
  });
}

export function useCreateChampionshipEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      team_id: string;
      event_type: 'RENEWAL' | 'LOSS' | 'ITEM_SOLD';
      points: number;
      description?: string;
      item_label?: string;
      client_name?: string;
    }) => {
      // Insert the event
      const { data: eventData, error: eventError } = await supabase
        .from('championship_events')
        .insert({
          ...event,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (eventError) throw eventError;

      // Update team stats
      const { data: team, error: teamError } = await supabase
        .from('championship_teams')
        .select('*')
        .eq('team_id', event.team_id)
        .single();
      
      if (teamError) throw teamError;

      const updates: Partial<ChampionshipTeam> = {
        total_points: team.total_points + event.points,
      };

      if (event.event_type === 'RENEWAL') {
        updates.renewals = team.renewals + 1;
      } else if (event.event_type === 'LOSS') {
        updates.losses = team.losses + 1;
      } else if (event.event_type === 'ITEM_SOLD') {
        updates.items_sold = team.items_sold + 1;
      }

      const { error: updateError } = await supabase
        .from('championship_teams')
        .update(updates)
        .eq('team_id', event.team_id);
      
      if (updateError) throw updateError;

      // Recalculate rankings
      const { data: allTeams } = await supabase
        .from('championship_teams')
        .select('*')
        .order('total_points', { ascending: false });
      
      if (allTeams) {
        for (let i = 0; i < allTeams.length; i++) {
          await supabase
            .from('championship_teams')
            .update({ 
              previous_rank: allTeams[i].current_rank,
              current_rank: i + 1 
            })
            .eq('id', allTeams[i].id);
        }
      }

      return eventData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}

export function useDeleteChampionshipEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: ChampionshipEvent) => {
      // Delete the event
      const { error: deleteError } = await supabase
        .from('championship_events')
        .delete()
        .eq('id', event.id);
      
      if (deleteError) throw deleteError;

      // Revert team stats
      const { data: team, error: teamError } = await supabase
        .from('championship_teams')
        .select('*')
        .eq('team_id', event.team_id)
        .single();
      
      if (teamError) throw teamError;

      const updates: Partial<ChampionshipTeam> = {
        total_points: team.total_points - event.points,
      };

      if (event.event_type === 'RENEWAL') {
        updates.renewals = Math.max(0, team.renewals - 1);
      } else if (event.event_type === 'LOSS') {
        updates.losses = Math.max(0, team.losses - 1);
      } else if (event.event_type === 'ITEM_SOLD') {
        updates.items_sold = Math.max(0, team.items_sold - 1);
      }

      const { error: updateError } = await supabase
        .from('championship_teams')
        .update(updates)
        .eq('team_id', event.team_id);
      
      if (updateError) throw updateError;

      // Recalculate rankings
      const { data: allTeams } = await supabase
        .from('championship_teams')
        .select('*')
        .order('total_points', { ascending: false });
      
      if (allTeams) {
        for (let i = 0; i < allTeams.length; i++) {
          await supabase
            .from('championship_teams')
            .update({ 
              previous_rank: allTeams[i].current_rank,
              current_rank: i + 1 
            })
            .eq('id', allTeams[i].id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship-teams'] });
      queryClient.invalidateQueries({ queryKey: ['championship-events'] });
    },
  });
}
