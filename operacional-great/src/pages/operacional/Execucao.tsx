import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSectorAccess } from '@/hooks/useSectorAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecSidebar } from '@/components/execucao/ExecSidebar';
import { ExecTopbar, ViewMode } from '@/components/execucao/ExecTopbar';
import { ExecKanbanBoard } from '@/components/execucao/ExecKanbanBoard';
import { ExecCardModal } from '@/components/execucao/ExecCardModal';
import { CreateBoardDialog } from '@/components/execucao/CreateBoardDialog';
import {
  Sector,
  SECTOR_LABELS,
  ExecCard,
  useExecBoards,
  useExecColumns,
  useExecCards,
} from '@/hooks/useExecData';
import { useAutoSyncClientCards } from '@/hooks/useClientBoardSync';
import { LayoutGrid } from 'lucide-react';

export default function Execucao() {
  const { user, isAdmin } = useAuth();
  const { getDefaultSector } = useSectorAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canSeeAllCards = isAdmin || isCoordinator;

  const defaultSector = useMemo((): Sector => {
    const sector = getDefaultSector();
    if (sector === 'trafego') return 'TRAFEGO';
    if (sector === 'atendimento') return 'ATENDIMENTO';
    if (sector === 'marketing') return 'MARKETING_DIGITAL';
    return 'GERAL';
  }, [getDefaultSector]);

  const [selectedSector, setSelectedSector] = useState<Sector>(defaultSector);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(!canSeeAllCards);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ExecCard | null>(null);

  const { data: boards, isLoading: boardsLoading } = useExecBoards(selectedSector);

  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    setSelectedBoardId(null);
  }, [selectedSector]);

  const { data: columns = [], isLoading: columnsLoading } = useExecColumns(selectedBoardId);
  const { data: cards = [], isLoading: cardsLoading } = useExecCards(selectedBoardId);

  useAutoSyncClientCards();

  const cardIdFromUrl = searchParams.get('cardId');

  const { data: cardFromSearch } = useQuery({
    queryKey: ['exec-card-from-search', cardIdFromUrl],
    queryFn: async () => {
      if (!cardIdFromUrl) return null;

      const { data, error } = await supabase
        .from('exec_cards')
        .select(`
          *,
          operational_clients(id, client_name, clinic_name)
        `)
        .eq('id', cardIdFromUrl)
        .single();

      if (error) {
        console.error('Error fetching card from search:', error);
        return null;
      }

      let assignee = null;
      if (data?.assigned_to_user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', data.assigned_to_user_id)
          .single();
        assignee = profileData;
      }

      return {
        ...data,
        assignee,
        client: data.operational_clients,
        tags: (data.tags as string[]) || [],
        checklist: (data.checklist as any[]) || [],
        attachments: (data.attachments as any[]) || [],
        watchers: (data.watchers as string[]) || [],
      } as ExecCard;
    },
    enabled: !!cardIdFromUrl,
  });

  useEffect(() => {
    if (cardFromSearch && cardIdFromUrl) {
      setEditingCard(cardFromSearch);
      setSearchParams({}, { replace: true });
    }
  }, [cardFromSearch, cardIdFromUrl, setSearchParams]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-exec'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-exec'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name')
        .order('client_name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleBoardCreated = (boardId: string) => {
    setSelectedBoardId(boardId);
  };

  const handleAddCard = () => {
    if (!selectedBoardId || columns.length === 0) return;
    const firstColumn = [...columns].sort((a, b) => a.order - b.order)[0];
    if (!firstColumn) return;

    setEditingCard({
      id: '',
      board_id: selectedBoardId,
      column_id: firstColumn.id,
      title: '',
      description: null,
      client_id: null,
      assigned_to_user_id: null,
      watchers: [],
      priority: 'MEDIA',
      due_date: null,
      tags: [],
      checklist: [],
      attachments: [],
      cover_image: null,
      order: 0,
      pinned: false,
      created_by_user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
  };

  const currentBoard = boards?.find((board) => board.id === selectedBoardId);
  const isLoading = boardsLoading || columnsLoading || cardsLoading;

  if (!boardsLoading && (!boards || boards.length === 0) && !selectedBoardId) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <ExecSidebar
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
          selectedBoardId={selectedBoardId}
          onBoardChange={setSelectedBoardId}
          onCreateBoard={() => setIsCreateBoardOpen(true)}
        />
        <div className="flex flex-1 items-center justify-center bg-background">
          <div className="max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Nenhum quadro encontrado</h2>
            <p className="mb-4 text-muted-foreground">
              Crie seu primeiro quadro no setor {SECTOR_LABELS[selectedSector]} para começar a gerenciar suas tarefas.
            </p>
          </div>
        </div>

        <CreateBoardDialog
          open={isCreateBoardOpen}
          onOpenChange={setIsCreateBoardOpen}
          defaultSector={selectedSector}
          onSuccess={handleBoardCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ExecSidebar
        selectedSector={selectedSector}
        onSectorChange={setSelectedSector}
        selectedBoardId={selectedBoardId}
        onBoardChange={setSelectedBoardId}
        onCreateBoard={() => setIsCreateBoardOpen(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {currentBoard && (
          <ExecTopbar
            boardName={currentBoard.name}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddCard={handleAddCard}
            showCompleted={showCompleted}
            onToggleCompleted={() => setShowCompleted(!showCompleted)}
            selectedAssignee={selectedAssignee}
            onAssigneeChange={setSelectedAssignee}
            teamMembers={teamMembers}
            showOnlyMine={showOnlyMine}
            onToggleShowOnlyMine={() => setShowOnlyMine(!showOnlyMine)}
          />
        )}

        {viewMode === 'board' && selectedBoardId && (
          <ExecKanbanBoard
            boardId={selectedBoardId}
            columns={columns}
            cards={cards}
            isLoading={isLoading}
            searchQuery={searchQuery}
            selectedAssignee={selectedAssignee}
            showCompleted={showCompleted}
            showOnlyMine={showOnlyMine || !canSeeAllCards}
            onEditCard={setEditingCard}
          />
        )}

        {viewMode === 'list' && selectedBoardId && (
          <div className="flex-1 overflow-auto p-4">
            <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/10 bg-primary/5">
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Título</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Coluna</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Prioridade</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Prazo</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {cards
                    .filter((card) => {
                      const shouldShowOnlyMine = showOnlyMine || !canSeeAllCards;
                      if (shouldShowOnlyMine && card.assigned_to_user_id !== user?.id && card.assigned_to_user_id !== null) {
                        return false;
                      }

                      if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        if (!card.title.toLowerCase().includes(query)) return false;
                      }

                      if (selectedAssignee && card.assigned_to_user_id !== selectedAssignee) return false;

                      if (!showCompleted) {
                        const doneColumnNames = ['CONCLUÍDO', 'CONCLUIDO', 'FEITO', 'DONE'];
                        const column = columns.find((item) => item.id === card.column_id);
                        if (column && doneColumnNames.some((name) => column.name.toUpperCase().includes(name))) {
                          return false;
                        }
                      }

                      return true;
                    })
                    .map((card) => {
                      const column = columns.find((item) => item.id === card.column_id);
                      const assignee = teamMembers.find((member) => member.id === card.assigned_to_user_id);

                      return (
                        <tr
                          key={card.id}
                          className="cursor-pointer border-b border-border hover:bg-muted/20"
                          onClick={() => setEditingCard(card)}
                        >
                          <td className="p-3 text-sm font-medium">{card.title}</td>
                          <td className="p-3 text-sm text-muted-foreground">{column?.name || '-'}</td>
                          <td className="p-3">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                card.priority === 'URGENTE'
                                  ? 'bg-red-500/10 text-red-600'
                                  : card.priority === 'ALTA'
                                    ? 'bg-orange-500/10 text-orange-600'
                                    : card.priority === 'MEDIA'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {card.priority}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{card.due_date || '-'}</td>
                          <td className="p-3 text-sm text-muted-foreground">{assignee?.full_name || '-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {cards.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhuma tarefa encontrada</div>
              )}
            </div>
          </div>
        )}

        {isLoading && !currentBoard && (
          <div className="flex-1 p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="min-w-[280px]">
                  <Skeleton className="mb-2 h-10 w-full" />
                  <Skeleton className="mb-2 h-24 w-full" />
                  <Skeleton className="mb-2 h-24 w-full" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateBoardDialog
        open={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
        defaultSector={selectedSector}
        onSuccess={handleBoardCreated}
      />

      <ExecCardModal
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        card={editingCard}
        columns={columns}
        teamMembers={teamMembers}
        clients={clients}
        boardId={selectedBoardId || ''}
      />
    </div>
  );
}
