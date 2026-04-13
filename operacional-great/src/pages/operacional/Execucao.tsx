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
  useCreateCard,
} from '@/hooks/useExecData';
import { useAutoSyncClientCards, CLIENTS_BOARD_ID } from '@/hooks/useClientBoardSync';
import { LayoutGrid } from 'lucide-react';

export default function Execucao() {
  const { user, isAdmin } = useAuth();
  const { getDefaultSector, hasAccessToSector } = useSectorAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if user can see all cards
  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canSeeAllCards = isAdmin || isCoordinator;

  // Determine default sector based on user role
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
  // Non-admin/coordinator users always show only their own cards
  const [showOnlyMine, setShowOnlyMine] = useState(!canSeeAllCards);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ExecCard | null>(null);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  // Fetch boards
  const { data: boards, isLoading: boardsLoading } = useExecBoards(selectedSector);

  // Auto-select first board when sector changes or boards load
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  // Reset board selection when sector changes
  useEffect(() => {
    setSelectedBoardId(null);
  }, [selectedSector]);

  // Fetch columns and cards for selected board
  const { data: columns = [], isLoading: columnsLoading } = useExecColumns(selectedBoardId);
  const { data: cards = [], isLoading: cardsLoading } = useExecCards(selectedBoardId);

  // Auto-sync clients in activation to CLIENTES board
  useAutoSyncClientCards();

  // Handle opening card from URL params (from Command Palette search)
  const cardIdFromUrl = searchParams.get('cardId');
  const boardIdFromUrl = searchParams.get('boardId');

  // Fetch the specific card if coming from search
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
      
      // Fetch assignee separately if exists
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
        tags: data.tags as string[] || [],
        checklist: data.checklist as any[] || [],
        attachments: data.attachments as any[] || [],
        watchers: data.watchers as string[] || [],
      } as ExecCard;
    },
    enabled: !!cardIdFromUrl,
  });

  // Open card modal when card is fetched from URL
  useEffect(() => {
    if (cardFromSearch && cardIdFromUrl) {
      setEditingCard(cardFromSearch);
      // Clear URL params after opening
      setSearchParams({}, { replace: true });
    }
  }, [cardFromSearch, cardIdFromUrl, setSearchParams]);

  // Fetch team members
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

  // Fetch clients
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

  const createCard = useCreateCard();

  const handleSectorChange = (sector: Sector) => {
    setSelectedSector(sector);
  };

  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
  };

  const handleCreateBoard = () => {
    setIsCreateBoardOpen(true);
  };

  const handleBoardCreated = (boardId: string) => {
    setSelectedBoardId(boardId);
  };

  const handleEditCard = (card: ExecCard) => {
    setEditingCard(card);
  };

  const handleAddCard = async () => {
    if (!selectedBoardId || columns.length === 0) return;
    // Open modal for first column
    const firstColumn = columns.sort((a, b) => a.order - b.order)[0];
    if (firstColumn) {
      // Create a blank card in the first column to edit
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
    }
  };

  const currentBoard = boards?.find((b) => b.id === selectedBoardId);
  const isLoading = boardsLoading || columnsLoading || cardsLoading;

  // Empty state when no boards exist
  if (!boardsLoading && (!boards || boards.length === 0) && !selectedBoardId) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <ExecSidebar
          selectedSector={selectedSector}
          onSectorChange={handleSectorChange}
          selectedBoardId={selectedBoardId}
          onBoardChange={handleBoardChange}
          onCreateBoard={handleCreateBoard}
        />
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Nenhum quadro encontrado</h2>
            <p className="text-muted-foreground mb-4">
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
      {/* Left Sidebar - Sectors & Boards */}
      <ExecSidebar
        selectedSector={selectedSector}
        onSectorChange={handleSectorChange}
        selectedBoardId={selectedBoardId}
        onBoardChange={handleBoardChange}
        onCreateBoard={handleCreateBoard}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top Bar */}
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

        {/* Board Content */}
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
            onEditCard={handleEditCard}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && selectedBoardId && (
          <div className="flex-1 p-4 overflow-auto">
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Título</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Coluna</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Prioridade</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Prazo</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {cards
                    .filter((card) => {
                      // Filter by "show only mine" for non-admin/coordinator - but always show unassigned cards
                      const shouldShowOnlyMine = showOnlyMine || !canSeeAllCards;
                      if (shouldShowOnlyMine && card.assigned_to_user_id !== user?.id && card.assigned_to_user_id !== null) return false;
                      
                      if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        if (!card.title.toLowerCase().includes(query)) return false;
                      }
                      if (selectedAssignee && card.assigned_to_user_id !== selectedAssignee) return false;
                      if (!showCompleted) {
                        const doneColumnNames = ['CONCLUÍDO', 'CONCLUIDO', 'FEITO', 'DONE'];
                        const col = columns.find((c) => c.id === card.column_id);
                        if (col && doneColumnNames.some((name) => col.name.toUpperCase().includes(name))) return false;
                      }
                      return true;
                    })
                    .map((card) => {
                      const column = columns.find((c) => c.id === card.column_id);
                      const assignee = teamMembers.find((m) => m.id === card.assigned_to_user_id);
                      return (
                        <tr
                          key={card.id}
                          className="border-b border-border hover:bg-muted/20 cursor-pointer"
                          onClick={() => handleEditCard(card)}
                        >
                          <td className="p-3 text-sm font-medium">{card.title}</td>
                          <td className="p-3 text-sm text-muted-foreground">{column?.name || '-'}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              card.priority === 'URGENTE' ? 'bg-red-500/10 text-red-600' :
                              card.priority === 'ALTA' ? 'bg-orange-500/10 text-orange-600' :
                              card.priority === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-blue-500/10 text-blue-600'
                            }`}>
                              {card.priority}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {card.due_date || '-'}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {assignee?.full_name || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {cards.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !currentBoard && (
          <div className="flex-1 p-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-[280px]">
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-24 w-full mb-2" />
                  <Skeleton className="h-24 w-full mb-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <CreateBoardDialog
        open={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
        defaultSector={selectedSector}
        onSuccess={handleBoardCreated}
      />

      {/* Card Edit Modal */}
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
