import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperationalClients, OperationalClient } from '@/hooks/useCRMData';

export type StatusOperacional = 'NOVO_CLIENTE' | 'ONBOARDING' | 'ATIVO' | 'PAUSADO' | 'ENCERRADO';

export const STATUS_OPERACIONAL_LABELS: Record<StatusOperacional, string> = {
  'NOVO_CLIENTE': 'Novo Cliente',
  'ONBOARDING': 'Em Onboarding',
  'ATIVO': 'Ativo',
  'PAUSADO': 'Pausado',
  'ENCERRADO': 'Encerrado',
};

interface OperationalContextType {
  operationalClients: OperationalClient[];
  isLoading: boolean;
  getClientsByTeam: (teamId: string) => OperationalClient[];
  getClientsByStatus: (status: StatusOperacional) => OperationalClient[];
  updateClientStatus: (id: string, status: StatusOperacional) => Promise<void>;
  assignGestor: (id: string, gestorId: string) => Promise<void>;
  assignAtendente: (id: string, atendenteId: string) => Promise<void>;
  getTeamStats: (teamId: string) => {
    total: number;
    novos: number;
    emOnboarding: number;
    ativos: number;
    pausados: number;
  };
}

const OperationalContext = createContext<OperationalContextType | undefined>(undefined);

export function OperationalProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: operationalClients = [], isLoading } = useOperationalClients();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('operational-clients-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operational_clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getClientsByTeam = useCallback((teamId: string) => {
    return operationalClients.filter(c => c.team_id === teamId);
  }, [operationalClients]);

  const getClientsByStatus = useCallback((status: StatusOperacional) => {
    return operationalClients.filter(c => c.status_operacional === status);
  }, [operationalClients]);

  const updateClientStatus = useCallback(async (id: string, status: StatusOperacional) => {
    const updates: Record<string, unknown> = { status_operacional: status };
    
    if (status === 'ONBOARDING') {
      updates.onboarding_start_at = new Date().toISOString();
    }
    if (status === 'ATIVO') {
      updates.activated_at = new Date().toISOString();
      updates.onboarding_done_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('operational_clients')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
  }, [queryClient]);

  const assignGestor = useCallback(async (id: string, gestorId: string) => {
    const { error } = await supabase
      .from('operational_clients')
      .update({ assigned_gestor_id: gestorId })
      .eq('id', id);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
  }, [queryClient]);

  const assignAtendente = useCallback(async (id: string, atendenteId: string) => {
    const { error } = await supabase
      .from('operational_clients')
      .update({ assigned_atendente_id: atendenteId })
      .eq('id', id);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
  }, [queryClient]);

  const getTeamStats = useCallback((teamId: string) => {
    const teamClients = operationalClients.filter(c => c.team_id === teamId);
    return {
      total: teamClients.length,
      novos: teamClients.filter(c => c.status_operacional === 'NOVO_CLIENTE').length,
      emOnboarding: teamClients.filter(c => c.status_operacional === 'ONBOARDING').length,
      ativos: teamClients.filter(c => c.status_operacional === 'ATIVO').length,
      pausados: teamClients.filter(c => c.status_operacional === 'PAUSADO').length,
    };
  }, [operationalClients]);

  return (
    <OperationalContext.Provider value={{
      operationalClients,
      isLoading,
      getClientsByTeam,
      getClientsByStatus,
      updateClientStatus,
      assignGestor,
      assignAtendente,
      getTeamStats,
    }}>
      {children}
    </OperationalContext.Provider>
  );
}

export function useOperational() {
  const context = useContext(OperationalContext);
  if (!context) {
    throw new Error('useOperational must be used within OperationalProvider');
  }
  return context;
}

// Re-export OperationalClient type from useCRMData for convenience
export type { OperationalClient } from '@/hooks/useCRMData';
