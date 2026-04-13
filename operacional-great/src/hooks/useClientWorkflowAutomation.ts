import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Board IDs
export const BOARDS = {
  CLIENTES: 'c66b6085-1e12-43fa-a91d-1a721a6f7d8b',
  DESIGN_PRODUCAO: '1a0e8a51-ff17-47a2-8c97-2eaf1129fe45',
  TRAFEGO_EXECUCAO: '3e2bda81-a3a1-40b0-bf98-1ebb06959720',
};

// Column IDs for CLIENTES board
export const CLIENTES_COLUMNS = {
  BRIEFING: '2ea4bcac-7b5b-4305-8fc0-8aec0ab9ef85',
  REUNIAO_START: '67b3d003-334e-4845-b344-0821d80eec24',
  MARKETING_DIGITAL: '309c86ae-5e32-4c4f-91f7-37d98049d37d',
  TRAFEGO_PAGO: '606ca5e0-3aba-487e-a866-f818b229752a',
  ATIVO: 'a1b3915c-18a2-4d9f-9749-3d33559589f3',
};

// First columns for destination boards (Entrada de Cliente)
export const DESTINATION_COLUMNS = {
  DESIGN_PRODUCAO_FIRST: '244c1cdd-b7ea-4601-b301-05186ffa713b', // Entrada de Cliente
  TRAFEGO_EXECUCAO_FIRST: '35311340-70ed-4b2a-97cb-91b29e50e617', // Entrada de Cliente
};

// Completed columns for destination boards
export const COMPLETED_COLUMNS = {
  DESIGN_PRODUCAO: 'a40cf2bc-5546-4693-b9e1-86c90af4816a', // Concluído
  TRAFEGO_EXECUCAO: '9fd26691-e3cb-4f05-b4ef-21afbc7ff0c8', // Concluído
};

// Em execução columns
export const EM_EXECUCAO_COLUMNS = {
  DESIGN_PRODUCAO: 'c15526f5-b49b-4ea8-a768-c51fa765850d', // Em execução
  TRAFEGO_EXECUCAO: '1ae180a1-36e1-4c14-af9a-c6fc5015f578', // Em execução
};

// Gestor de Tráfego board IDs (individual boards for each gestor)
export const GESTOR_TRAFEGO_BOARDS = [
  'd2b9f967-32dc-4665-9317-92b51da9f444', // BRAYTON
  'cd5b9644-f7fa-4ae4-ba1d-8837db1d0759', // CLERISTON
  'c29d8440-afdd-4939-b611-6b73ea91f33c', // ISAQUE
  'cd34304a-bfb2-4ebd-9223-1a277807212e', // KAUAN
  'c282e0a3-aa4b-4e24-8c96-f20d6c904570', // RUAN
];

interface CardMovementData {
  cardId: string;
  clientId: string | null;
  clientName: string;
  fromColumnId: string;
  toColumnId: string;
  userId: string;
}

// Hook to create a start meeting when card moves to "Reunião de Start"
export function useCreateStartMeeting() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { clientName: string; clientId: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      // Default start meeting time: tomorrow at 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: `Reunião de Start - ${data.clientName}`,
          datetime_start: tomorrow.toISOString(),
          datetime_end: endTime.toISOString(),
          scope: 'CLIENTE',
          agenda: `Reunião de início com o cliente ${data.clientName}.\n\n• Apresentação da equipe\n• Alinhamento de expectativas\n• Próximos passos`,
          created_by_user_id: user.id,
          // participants will be set when user is available
        })
        .select()
        .single();

      if (error) throw error;
      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
      toast.success('Reunião de Start criada automaticamente');
    },
    onError: (error) => {
      console.error('Error creating start meeting:', error);
      toast.error('Erro ao criar reunião de start');
    },
  });
}

// Hook to create a card in destination board when client moves to Marketing Digital or Tráfego Pago
export function useCreateDestinationCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clientName: string;
      clientId: string | null;
      destinationBoard: 'DESIGN_PRODUCAO' | 'TRAFEGO_EXECUCAO';
      description?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const boardId = BOARDS[data.destinationBoard];
      const columnId = data.destinationBoard === 'DESIGN_PRODUCAO' 
        ? DESTINATION_COLUMNS.DESIGN_PRODUCAO_FIRST 
        : DESTINATION_COLUMNS.TRAFEGO_EXECUCAO_FIRST;

      // Check if card already exists for this client in the destination board
      const { data: existingCards } = await supabase
        .from('exec_cards')
        .select('id')
        .eq('board_id', boardId)
        .eq('client_id', data.clientId);

      if (existingCards && existingCards.length > 0) {
        console.log('Card already exists for this client in destination board');
        return existingCards[0];
      }

      const { data: card, error } = await supabase
        .from('exec_cards')
        .insert({
          board_id: boardId,
          column_id: columnId,
          title: data.clientName,
          description: data.description || `Cliente: ${data.clientName}`,
          client_id: data.clientId,
          priority: 'ALTA',
          order: 0,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return card;
    },
    onSuccess: (_, variables) => {
      const boardName = variables.destinationBoard === 'DESIGN_PRODUCAO' 
        ? 'Design - Produção' 
        : 'Tráfego Pago - Execução';
      queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
      toast.success(`Card criado no board "${boardName}"`);
    },
    onError: (error) => {
      console.error('Error creating destination card:', error);
      toast.error('Erro ao criar card no board de destino');
    },
  });
}

// Hook to handle workflow automation when a card is moved
export function useWorkflowAutomation() {
  const createStartMeeting = useCreateStartMeeting();
  const createDestinationCard = useCreateDestinationCard();

  const handleCardMoved = async (data: CardMovementData) => {
    const { toColumnId, clientName, clientId, fromColumnId } = data;

    // Only trigger automation for CLIENTES board movements
    if (!Object.values(CLIENTES_COLUMNS).includes(toColumnId)) {
      return;
    }

    // 1. Card moved to "Reunião de Start" - Create meeting
    if (toColumnId === CLIENTES_COLUMNS.REUNIAO_START && fromColumnId !== CLIENTES_COLUMNS.REUNIAO_START) {
      await createStartMeeting.mutateAsync({ clientName, clientId });
    }

    // 2. Card moved to "Marketing Digital" - Create card in Design - Produção
    if (toColumnId === CLIENTES_COLUMNS.MARKETING_DIGITAL && fromColumnId !== CLIENTES_COLUMNS.MARKETING_DIGITAL) {
      await createDestinationCard.mutateAsync({
        clientName,
        clientId,
        destinationBoard: 'DESIGN_PRODUCAO',
        description: `🎨 Cliente de Marketing Digital\n\n**Cliente:** ${clientName}`,
      });
    }

    // 3. Card moved to "Tráfego Pago" - Create card in Tráfego Pago - Execução
    if (toColumnId === CLIENTES_COLUMNS.TRAFEGO_PAGO && fromColumnId !== CLIENTES_COLUMNS.TRAFEGO_PAGO) {
      await createDestinationCard.mutateAsync({
        clientName,
        clientId,
        destinationBoard: 'TRAFEGO_EXECUCAO',
        description: `📈 Cliente de Tráfego Pago\n\n**Cliente:** ${clientName}`,
      });
    }
  };

  return {
    handleCardMoved,
    isLoading: createStartMeeting.isPending || createDestinationCard.isPending,
  };
}

// Hook to handle completion in destination boards
export function useHandleTaskCompletion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      cardId: string;
      clientId: string | null;
      boardId: string;
      responsibleUserId: string;
      destinationBoardIds: string[];
    }) => {
      if (!user || !data.clientId) return null;

      // Get client info
      const { data: client } = await supabase
        .from('operational_clients')
        .select('client_name, onboarding_stage, stage_marketing, stage_trafego')
        .eq('id', data.clientId)
        .maybeSingle();

      if (!client) return null;

      // Determine which stage to update
      let stageUpdate: Record<string, any> = {};
      
      if (data.boardId === BOARDS.DESIGN_PRODUCAO) {
        stageUpdate = { stage_marketing: 'OK' };
      } else if (data.boardId === BOARDS.TRAFEGO_EXECUCAO) {
        stageUpdate = { stage_trafego: 'OK' };
      }

      // Update the card with the responsible user
      const { data: updatedCard, error: cardError } = await supabase
        .from('exec_cards')
        .update({
          assigned_to_user_id: data.responsibleUserId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', data.cardId)
        .select()
        .single();

      if (cardError) throw cardError;

      // Update client's stage in operational_clients
      if (Object.keys(stageUpdate).length > 0) {
        const { error: clientError } = await supabase
          .from('operational_clients')
          .update(stageUpdate)
          .eq('id', data.clientId);

        if (clientError) {
          console.error('Error updating client stage:', clientError);
        }
      }

      // Check if both stages are complete and update onboarding stage
      const newMarketingStage = stageUpdate.stage_marketing || client.stage_marketing;
      const newTrafegoStage = stageUpdate.stage_trafego || client.stage_trafego;
      
      if (newMarketingStage === 'OK' && newTrafegoStage === 'OK') {
        // Both stages complete - advance to ATIVO
        await supabase
          .from('operational_clients')
          .update({
            onboarding_stage: 'ATIVO',
            status_operacional: 'ATIVO',
            activated_at: new Date().toISOString(),
            activated_by: user.id,
          })
          .eq('id', data.clientId);
      }

      // Create cards in destination boards (ClickUp boards)
      const createdCards: any[] = [];
      for (const destBoardId of data.destinationBoardIds) {
        // Get the first column of the destination board
        const { data: firstColumn } = await supabase
          .from('exec_columns')
          .select('id')
          .eq('board_id', destBoardId)
          .order('order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstColumn) {
          // Check if card already exists for this client in this board
          const { data: existingCard } = await supabase
            .from('exec_cards')
            .select('id')
            .eq('board_id', destBoardId)
            .eq('client_id', data.clientId)
            .maybeSingle();

          if (!existingCard) {
            const { data: newCard, error: cardError } = await supabase
              .from('exec_cards')
              .insert({
                board_id: destBoardId,
                column_id: firstColumn.id,
                title: client.client_name,
                description: `Cliente: ${client.client_name}`,
                client_id: data.clientId,
                assigned_to_user_id: data.responsibleUserId,
                priority: 'MEDIA',
                order: 0,
                created_by_user_id: user.id,
              })
              .select()
              .single();

            if (!cardError && newCard) {
              createdCards.push(newCard);
            }
          }
        }
      }

      // Get responsible user info
      const { data: responsibleUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.responsibleUserId)
        .maybeSingle();

      return {
        card: updatedCard,
        responsibleUser,
        clientName: client.client_name,
        stageUpdated: Object.keys(stageUpdate)[0] || null,
        createdCardsCount: createdCards.length,
      };
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['exec-cards'] });
        queryClient.invalidateQueries({ queryKey: ['clients-in-activation'] });
        queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
        
        const stageName = result.stageUpdated === 'stage_marketing' ? 'Marketing Digital' : 'Tráfego Pago';
        let description = result.responsibleUser?.full_name ? `Responsável: ${result.responsibleUser.full_name}` : undefined;
        
        if (result.createdCardsCount > 0) {
          description = `${description ? description + ' | ' : ''}${result.createdCardsCount} card(s) criado(s)`;
        }
        
        toast.success(
          `${stageName} concluído para ${result.clientName}`,
          { description }
        );
      }
    },
    onError: (error) => {
      console.error('Error handling task completion:', error);
      toast.error('Erro ao processar conclusão da tarefa');
    },
  });
}
