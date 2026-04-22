import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ClientActivityTracking {
  id: string;
  client_id: string;
  year: number;
  month: number;
  week: number;
  artes_count: number;
  designer_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientActivityWithClient extends ClientActivityTracking {
  client_name: string;
  clinic_name: string | null;
}

// List of available designers
export const DESIGNERS = ['Taiwan', 'Thiago', 'Hannah', 'Matheus', 'Amanda'] as const;
export type DesignerName = typeof DESIGNERS[number];

export function useClientActivityTracking(year: number, month: number, designerName?: string | null) {
  return useQuery({
    queryKey: ['client-activity-tracking', year, month, designerName],
    queryFn: async () => {
      let query = supabase
        .from('client_activity_tracking')
        .select(`
          *,
          operational_clients!inner(client_name, clinic_name)
        `)
        .eq('year', year)
        .eq('month', month);

      if (designerName) {
        query = query.eq('designer_name', designerName);
      }

      const { data, error } = await query.order('week', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        client_name: item.operational_clients.client_name,
        clinic_name: item.operational_clients.clinic_name,
      })) as ClientActivityWithClient[];
    },
  });
}

export function useUpsertClientActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      client_id,
      year,
      month,
      week,
      artes_count,
      designer_name,
    }: {
      client_id: string;
      year: number;
      month: number;
      week: number;
      artes_count: number;
      designer_name: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('client_activity_tracking')
        .upsert(
          {
            client_id,
            year,
            month,
            week,
            artes_count,
            designer_name,
            created_by_user_id: userData?.user?.id,
          },
          { onConflict: 'client_id,year,month,week,designer_name' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
      toast({
        title: 'Salvo!',
        description: 'Quantidade de artes atualizada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error upserting activity:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_activity_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
    },
  });
}

export function useOperationalClientsForTracking() {
  return useQuery({
    queryKey: ['operational-clients-for-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name')
        .order('client_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to get activity totals for all designers in a given month/year
export function useDesignersTotals(year: number, month: number) {
  return useQuery({
    queryKey: ['designers-totals', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_activity_tracking')
        .select('designer_name, artes_count, week')
        .eq('year', year)
        .eq('month', month);

      if (error) throw error;

      // Group by designer
      const designerTotals: Record<string, { total: number; weeks: Record<number, number> }> = {};
      
      DESIGNERS.forEach(designer => {
        designerTotals[designer] = { total: 0, weeks: { 1: 0, 2: 0, 3: 0, 4: 0 } };
      });

      (data || []).forEach((item) => {
        if (item.designer_name && designerTotals[item.designer_name]) {
          designerTotals[item.designer_name].total += item.artes_count || 0;
          designerTotals[item.designer_name].weeks[item.week] = 
            (designerTotals[item.designer_name].weeks[item.week] || 0) + (item.artes_count || 0);
        }
      });

      return designerTotals;
    },
  });
}
