import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Board IDs for destination boards
const BOARDS = {
  DESIGN_PRODUCAO: '1a0e8a51-ff17-47a2-8c97-2eaf1129fe45',
  TRAFEGO_EXECUCAO: '3e2bda81-a3a1-40b0-bf98-1ebb06959720',
};

// First columns for destination boards (Entrada de Cliente)
const DESTINATION_COLUMNS = {
  DESIGN_PRODUCAO_FIRST: '244c1cdd-b7ea-4601-b301-05186ffa713b',
  TRAFEGO_EXECUCAO_FIRST: '35311340-70ed-4b2a-97cb-91b29e50e617',
};

// Board ID for CLIENTES board in GERAL sector
const CLIENTS_BOARD_ID = 'c66b6085-1e12-43fa-a91d-1a721a6f7d8b';

// Column IDs for each stage
const COLUMN_IDS = {
  BRIEFING: '2ea4bcac-7b5b-4305-8fc0-8aec0ab9ef85',
  REUNIAO_START: '67b3d003-334e-4845-b344-0821d80eec24',
  MARKETING_DIGITAL: '309c86ae-5e32-4c4f-91f7-37d98049d37d',
  TRAFEGO_PAGO: '606ca5e0-3aba-487e-a866-f818b229752a',
  ATIVO: 'a1b3915c-18a2-4d9f-9749-3d33559589f3',
};

// Map onboarding stage to column ID
const STAGE_TO_COLUMN: Record<string, string> = {
  'CONTRATO': COLUMN_IDS.BRIEFING,
  'BRIEFING': COLUMN_IDS.BRIEFING,
  'ONBOARDING': COLUMN_IDS.REUNIAO_START,
  'MARKETING': COLUMN_IDS.MARKETING_DIGITAL,
  'TRAFEGO': COLUMN_IDS.TRAFEGO_PAGO,
  'ATENDIMENTO': COLUMN_IDS.TRAFEGO_PAGO, // Same column as Trafego
  'ATIVO': COLUMN_IDS.ATIVO,
};

// Plan labels mapping
const PLAN_LABELS: Record<string, string> = {
  'MENSAL': '30 Dias',
  'TRIMESTRAL': '90 Dias',
  'SEMESTRAL': '180 Dias',
  'TAXA_INTERESSE': 'Taxa de Interesse',
  'COMPLETO': 'Completo',
  'TRAFEGO_E_CRIATIVOS': 'Tráfego e Criativos',
  'ATENDIMENTO': 'Atendimento',
  'TRAFEGO': 'Tráfego',
};

interface ClientCardData {
  clientId: string;
  clientName: string;
  clinicName: string | null;
  plan: string | null;
  dealValue: number | null;
  pagadorAnuncio: string | null;
  onboardingStage: string;
  statusOperacional: string;
}

export function useClientsInActivation() {
  return useQuery({
    queryKey: ['clients-in-activation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name, plan, deal_value, pagador_anuncio, onboarding_stage, status_operacional')
        .in('status_operacional', ['NOVO_CLIENTE', 'ONBOARDING'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(client => ({
        clientId: client.id,
        clientName: client.client_name,
        clinicName: client.clinic_name,
        plan: client.plan,
        dealValue: client.deal_value,
        pagadorAnuncio: client.pagador_anuncio,
        onboardingStage: client.onboarding_stage || 'BRIEFING',
        statusOperacional: client.status_operacional,
      })) as ClientCardData[];
    },
  });
}

export function useClientsBoardCards() {
  return useQuery({
    queryKey: ['exec-cards', CLIENTS_BOARD_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exec_cards')
        .select('*')
        .eq('board_id', CLIENTS_BOARD_ID);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSyncClientCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clients: ClientCardData[]) => {
      if (!user) throw new Error('User not authenticated');

      // Get existing cards for this board
      const { data: existingCards, error: fetchError } = await supabase
        .from('exec_cards')
        .select('id, client_id, column_id')
        .eq('board_id', CLIENTS_BOARD_ID);

      if (fetchError) throw fetchError;

      const cardsToCreate: any[] = [];

      for (const client of clients) {
        const targetColumnId = client.statusOperacional === 'ATIVO' 
          ? COLUMN_IDS.ATIVO 
          : (STAGE_TO_COLUMN[client.onboardingStage] || COLUMN_IDS.BRIEFING);

        // Check if card already exists in the TARGET column for this client
        const existingCardInTargetColumn = (existingCards || []).find(
          c => c.client_id === client.clientId && c.column_id === targetColumnId
        );

        // Only create if no card exists in the target column yet
        // This keeps cards in previous columns and adds new ones in the next stage
        if (!existingCardInTargetColumn) {
          // Build description with commercial data
          const descriptionParts: string[] = [];
          if (client.clinicName) descriptionParts.push(`🏥 **Clínica:** ${client.clinicName}`);
          if (client.plan) descriptionParts.push(`📋 **Plano:** ${PLAN_LABELS[client.plan] || client.plan}`);
          if (client.dealValue && client.dealValue > 0) {
            descriptionParts.push(`💰 **Valor:** R$ ${client.dealValue.toLocaleString('pt-BR')}`);
          }
          if (client.pagadorAnuncio) {
            descriptionParts.push(`📢 **Pagador Anúncio:** ${client.pagadorAnuncio === 'CLIENTE' ? 'Cliente' : 'Great'}`);
          }
          
          // Create new card with rich description (keeping existing cards in other columns)
          cardsToCreate.push({
            board_id: CLIENTS_BOARD_ID,
            column_id: targetColumnId,
            title: client.clientName,
            description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
            client_id: client.clientId,
            priority: 'MEDIA',
            order: 0,
            created_by_user_id: user.id,
          });
        }
      }

      // Batch insert new cards (without moving/updating existing ones)
      if (cardsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('exec_cards')
          .insert(cardsToCreate);

        if (insertError) throw insertError;
      }

      return { created: cardsToCreate.length, updated: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', CLIENTS_BOARD_ID] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
    },
  });
}

export function useAutoSyncClientCards() {
  const { data: clients } = useClientsInActivation();
  const { data: existingCards } = useClientsBoardCards();
  const syncCards = useSyncClientCards();
  const syncDestinationCards = useSyncDestinationBoardCards();
  const { user } = useAuth();

  useEffect(() => {
    if (clients && clients.length > 0 && user) {
      // Check if sync is needed
      const existingClientIds = new Set((existingCards || []).map((c: any) => c.client_id));
      const needsSync = clients.some(client => {
        if (!existingClientIds.has(client.clientId)) return true;
        const existingCard = (existingCards || []).find((c: any) => c.client_id === client.clientId);
        const targetColumnId = client.statusOperacional === 'ATIVO' 
          ? COLUMN_IDS.ATIVO 
          : (STAGE_TO_COLUMN[client.onboardingStage] || COLUMN_IDS.BRIEFING);
        return existingCard && existingCard.column_id !== targetColumnId;
      });

      if (needsSync && !syncCards.isPending) {
        syncCards.mutate(clients);
      }

      // Also sync destination boards for clients in MARKETING or TRAFEGO stages
      if (!syncDestinationCards.isPending) {
        syncDestinationCards.mutate(clients);
      }
    }
  }, [clients, existingCards, user]);

  return { clients, existingCards, syncCards };
}

// Hook to sync clients to destination boards (Design - Produção and Tráfego Pago - Execução)
export function useSyncDestinationBoardCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clients: ClientCardData[]) => {
      if (!user) throw new Error('User not authenticated');

      let createdDesign = 0;
      let createdTrafego = 0;

      for (const client of clients) {
        // Sync to Design - Produção for clients in MARKETING stage
        if (client.onboardingStage === 'MARKETING') {
          // Check if card already exists in Design - Produção
          const { data: existingDesignCards } = await supabase
            .from('exec_cards')
            .select('id')
            .eq('board_id', BOARDS.DESIGN_PRODUCAO)
            .eq('client_id', client.clientId);

          if (!existingDesignCards || existingDesignCards.length === 0) {
            const { error } = await supabase
              .from('exec_cards')
              .insert({
                board_id: BOARDS.DESIGN_PRODUCAO,
                column_id: DESTINATION_COLUMNS.DESIGN_PRODUCAO_FIRST,
                title: client.clientName,
                description: `🎨 Cliente de Marketing Digital\n\n**Cliente:** ${client.clientName}`,
                client_id: client.clientId,
                priority: 'ALTA',
                order: 0,
                created_by_user_id: user.id,
              });

            if (!error) {
              createdDesign++;
              console.log(`Card criado no Design - Produção para ${client.clientName}`);
            } else {
              console.error('Error creating design card:', error);
            }
          }
        }

        // Sync to Tráfego Pago - Execução for clients in TRAFEGO stage
        if (client.onboardingStage === 'TRAFEGO') {
          // Check if card already exists in Tráfego Pago - Execução
          const { data: existingTrafegoCards } = await supabase
            .from('exec_cards')
            .select('id')
            .eq('board_id', BOARDS.TRAFEGO_EXECUCAO)
            .eq('client_id', client.clientId);

          if (!existingTrafegoCards || existingTrafegoCards.length === 0) {
            const { error } = await supabase
              .from('exec_cards')
              .insert({
                board_id: BOARDS.TRAFEGO_EXECUCAO,
                column_id: DESTINATION_COLUMNS.TRAFEGO_EXECUCAO_FIRST,
                title: client.clientName,
                description: `📈 Cliente de Tráfego Pago\n\n**Cliente:** ${client.clientName}`,
                client_id: client.clientId,
                priority: 'ALTA',
                order: 0,
                created_by_user_id: user.id,
              });

            if (!error) {
              createdTrafego++;
              console.log(`Card criado no Tráfego Pago - Execução para ${client.clientName}`);
            } else {
              console.error('Error creating trafego card:', error);
            }
          }
        }
      }

      return { createdDesign, createdTrafego };
    },
    onSuccess: (result) => {
      if (result.createdDesign > 0 || result.createdTrafego > 0) {
        queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
        
        if (result.createdDesign > 0) {
          toast.success(`${result.createdDesign} card(s) criado(s) no Design - Produção`);
        }
        if (result.createdTrafego > 0) {
          toast.success(`${result.createdTrafego} card(s) criado(s) no Tráfego Pago - Execução`);
        }
      }
    },
    onError: (error) => {
      console.error('Error syncing destination board cards:', error);
    },
  });
}

export { CLIENTS_BOARD_ID, COLUMN_IDS, STAGE_TO_COLUMN, PLAN_LABELS };
