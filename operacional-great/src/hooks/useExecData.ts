import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Sector = 'TRAFEGO' | 'ATENDIMENTO' | 'MARKETING_DIGITAL' | 'GERAL';

export interface ExecBoard {
  id: string;
  sector: Sector;
  name: string;
  description: string | null;
  is_default: boolean;
  team_scope: 'GLOBAL' | 'EQUIPE';
  team_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExecColumn {
  id: string;
  board_id: string;
  name: string;
  order: number;
  wip_limit: number | null;
  color_tag: string | null;
  created_at: string;
}

export interface ExecCard {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assigned_to_user_id: string | null;
  watchers: any;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  due_date: string | null;
  tags: any;
  checklist: any;
  attachments: any;
  cover_image: string | null;
  order: number;
  pinned: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  client?: {
    id: string;
    client_name: string;
  } | null;
}

export interface ExecComment {
  id: string;
  card_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const SECTOR_LABELS: Record<Sector, string> = {
  GERAL: 'Geral',
  TRAFEGO: 'Tráfego Pago',
  ATENDIMENTO: 'Atendimento',
  MARKETING_DIGITAL: 'Marketing Digital',
};

export const COLOR_TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  neutral: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  purple_soft: { bg: 'bg-purple-400/10', text: 'text-purple-500', border: 'border-purple-400/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  blue_soft: { bg: 'bg-blue-400/10', text: 'text-blue-500', border: 'border-blue-400/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  orange_soft: { bg: 'bg-orange-400/10', text: 'text-orange-500', border: 'border-orange-400/30' },
  red_soft: { bg: 'bg-red-400/10', text: 'text-red-500', border: 'border-red-400/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  green_soft: { bg: 'bg-green-400/10', text: 'text-green-500', border: 'border-green-400/30' },
  gray: { bg: 'bg-gray-400/10', text: 'text-gray-500', border: 'border-gray-400/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
};

export const DEFAULT_BOARDS_CONFIG: Record<Sector, { name: string; columns: { name: string; color_tag: string }[] }> = {
  GERAL: {
    name: 'Operação - Implantação & Suporte',
    columns: [
      { name: 'PENDENTE', color_tag: 'neutral' },
      { name: 'EM PROGRESSO', color_tag: 'purple' },
      { name: 'IMPLANTADO - CONEXÃO WPP', color_tag: 'gray' },
      { name: 'SUPORTE', color_tag: 'red_soft' },
      { name: 'CONCLUÍDO', color_tag: 'green_soft' },
    ],
  },
  TRAFEGO: {
    name: 'Tráfego Pago - Execução',
    columns: [
      { name: 'ENTRADA DE CLIENTE', color_tag: 'neutral' },
      { name: 'ROTINA DIÁRIA', color_tag: 'blue' },
      { name: 'SUBIR ANÚNCIOS', color_tag: 'blue_soft' },
      { name: 'DEMANDA EXTRA', color_tag: 'green_soft' },
      { name: 'FEITO', color_tag: 'green' },
    ],
  },
  ATENDIMENTO: {
    name: 'Atendimento - Rotina',
    columns: [
      { name: 'ENTRADA DE CLIENTE', color_tag: 'neutral' },
      { name: 'ROTINA DIÁRIA', color_tag: 'purple' },
      { name: 'FORMULÁRIO', color_tag: 'blue_soft' },
      { name: 'DEMANDA EXTRA', color_tag: 'orange' },
      { name: 'FEITO', color_tag: 'green_soft' },
    ],
  },
  MARKETING_DIGITAL: {
    name: 'Design - Produção',
    columns: [
      { name: 'A FAZER', color_tag: 'neutral' },
      { name: 'EM EXECUÇÃO', color_tag: 'orange' },
      { name: 'AJUSTE', color_tag: 'orange_soft' },
      { name: 'APROVAÇÃO DO CLIENTE', color_tag: 'cyan' },
      { name: 'SUBIR ANÚNCIO', color_tag: 'yellow' },
    ],
  },
};

// Fetch boards by sector - all boards visible to everyone
export function useExecBoards(sector?: Sector) {
  return useQuery({
    queryKey: ['exec-boards', sector],
    queryFn: async () => {
      let query = supabase.from('exec_boards').select('*').order('is_default', { ascending: false }).order('name');
      if (sector) {
        query = query.eq('sector', sector);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ExecBoard[];
    },
  });
}

// Fetch columns for a board
export function useExecColumns(boardId: string | null) {
  return useQuery({
    queryKey: ['exec-columns', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('exec_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('order');
      if (error) throw error;
      return data as ExecColumn[];
    },
    enabled: !!boardId,
  });
}

// Fetch cards for a board
export function useExecCards(boardId: string | null) {
  return useQuery({
    queryKey: ['exec-cards', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('exec_cards')
        .select('*')
        .eq('board_id', boardId)
        .order('order');
      if (error) throw error;
      return (data || []) as ExecCard[];
    },
    enabled: !!boardId,
  });
}

// Fetch comments for a card
export function useExecComments(cardId: string | null) {
  return useQuery({
    queryKey: ['exec-comments', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('exec_comments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ExecComment[];
    },
    enabled: !!cardId,
  });
}

// Create board mutation
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { sector: Sector; name: string; description?: string; team_scope?: 'GLOBAL' | 'EQUIPE'; columns?: { name: string; color_tag: string }[] }) => {
      if (!user) throw new Error('User not authenticated');

      // Create board
      const { data: board, error: boardError } = await supabase
        .from('exec_boards')
        .insert({
          sector: data.sector,
          name: data.name,
          description: data.description || null,
          team_scope: data.team_scope || 'EQUIPE',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Create columns if provided
      if (data.columns && data.columns.length > 0) {
        const columnsToInsert = data.columns.map((col, idx) => ({
          board_id: board.id,
          name: col.name,
          order: idx,
          color_tag: col.color_tag,
        }));

        const { error: colError } = await supabase.from('exec_columns').insert(columnsToInsert);
        if (colError) throw colError;
      }

      return board as ExecBoard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards', variables.sector] });
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}

// Create column mutation
export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { board_id: string; name: string; order: number; color_tag?: string }) => {
      const { data: column, error } = await supabase
        .from('exec_columns')
        .insert({
          board_id: data.board_id,
          name: data.name,
          order: data.order,
          color_tag: data.color_tag || 'neutral',
        })
        .select()
        .single();

      if (error) throw error;
      return column as ExecColumn;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
    },
  });
}

// Update column mutation
export function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string; name?: string; order?: number; color_tag?: string; wip_limit?: number | null }) => {
      const { id, board_id, ...updates } = data;
      const { error } = await supabase.from('exec_columns').update(updates).eq('id', id);
      if (error) throw error;
      return { id, board_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
    },
  });
}

// Delete column mutation
export function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string }) => {
      // First, delete all cards in the column
      const { error: cardsError } = await supabase.from('exec_cards').delete().eq('column_id', data.id);
      if (cardsError) throw cardsError;

      // Then delete the column
      const { error } = await supabase.from('exec_columns').delete().eq('id', data.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-columns', data.board_id] });
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Create card mutation
export function useCreateCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<ExecCard> & { board_id: string; column_id: string; title: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: card, error } = await supabase
        .from('exec_cards')
        .insert({
          board_id: data.board_id,
          column_id: data.column_id,
          title: data.title,
          description: data.description || null,
          client_id: data.client_id || null,
          assigned_to_user_id: data.assigned_to_user_id || null,
          priority: data.priority || 'MEDIA',
          due_date: data.due_date || null,
          tags: data.tags || [],
          order: data.order || 0,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return card as ExecCard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Update card mutation
export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ExecCard> & { id: string; board_id: string }) => {
      const { id, board_id, assignee, client, ...updates } = data;
      
      // Handle completed_at for done columns
      if (updates.column_id) {
        // We'll check if it's a "done" column in the component
      }

      const { error } = await supabase.from('exec_cards').update(updates).eq('id', id);
      if (error) throw error;
      return { id, board_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Delete card mutation
export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; board_id: string }) => {
      const { error } = await supabase.from('exec_cards').delete().eq('id', data.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exec-cards', data.board_id] });
    },
  });
}

// Create comment mutation
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { card_id: string; body: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: comment, error } = await supabase
        .from('exec_comments')
        .insert({
          card_id: data.card_id,
          author_user_id: user.id,
          body: data.body,
        })
        .select()
        .single();

      if (error) throw error;
      return comment as ExecComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exec-comments', variables.card_id] });
    },
  });
}

// Initialize default boards for a sector
export function useInitializeDefaultBoard() {
  const createBoard = useCreateBoard();

  return useMutation({
    mutationFn: async (sector: Sector) => {
      const config = DEFAULT_BOARDS_CONFIG[sector];
      return createBoard.mutateAsync({
        sector,
        name: config.name,
        columns: config.columns,
        team_scope: 'GLOBAL',
      });
    },
  });
}

// Update board mutation
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string | null; team_scope?: 'GLOBAL' | 'EQUIPE' }) => {
      const { id, ...updates } = data;
      const { data: board, error } = await supabase
        .from('exec_boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return board as ExecBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}

// Delete board mutation
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boardId: string) => {
      // Delete all cards in the board first
      const { error: cardsError } = await supabase
        .from('exec_cards')
        .delete()
        .eq('board_id', boardId);
      if (cardsError) throw cardsError;

      // Delete all columns in the board
      const { error: colsError } = await supabase
        .from('exec_columns')
        .delete()
        .eq('board_id', boardId);
      if (colsError) throw colsError;

      // Delete the board
      const { error } = await supabase
        .from('exec_boards')
        .delete()
        .eq('id', boardId);
      if (error) throw error;

      return boardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exec-boards'] });
    },
  });
}
