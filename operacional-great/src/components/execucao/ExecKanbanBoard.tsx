import { useState, useMemo } from 'react';
import { Plus, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecColumn, ExecCard, useCreateColumn, useUpdateColumn, useDeleteColumn, useCreateCard, useUpdateCard, useDeleteCard } from '@/hooks/useExecData';
import { ExecKanbanColumn } from './ExecKanbanColumn';
import { SelectGestorDialog } from './SelectGestorDialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowAutomation, useHandleTaskCompletion, BOARDS, GESTOR_TRAFEGO_BOARDS } from '@/hooks/useClientWorkflowAutomation';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { supabase } from '@/integrations/supabase/client';
import { ClientOnboardingFlow, OnboardingStage } from '@/components/operacional/ClientOnboardingFlow';

interface ExecKanbanBoardProps {
  boardId: string;
  columns: ExecColumn[];
  cards: ExecCard[];
  isLoading: boolean;
  searchQuery: string;
  selectedAssignee: string | null;
  showCompleted: boolean;
  showOnlyMine: boolean;
  onEditCard: (card: ExecCard) => void;
}

interface PendingMove {
  card: ExecCard;
  toColumnId: string;
}

interface PendingGestorMove {
  card: ExecCard;
  toColumnId: string;
}

export function ExecKanbanBoard({ boardId, columns, cards, isLoading, searchQuery, selectedAssignee, showCompleted, showOnlyMine, onEditCard }: ExecKanbanBoardProps) {
  const { user } = useAuth();
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pendingGestorMove, setPendingGestorMove] = useState<PendingGestorMove | null>(null);
  const [showGestorDialog, setShowGestorDialog] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showOnboardingFlow, setShowOnboardingFlow] = useState(false);
  const [pendingOnboardingClient, setPendingOnboardingClient] = useState<{ id: string; clientName: string; clinicName?: string; onboardingStage: OnboardingStage; clientTier?: 'PREMIUM' | 'POPULAR' | null } | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showSelectCheckbox, setShowSelectCheckbox] = useState(false);

  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const { handleCardMoved } = useWorkflowAutomation();
  const handleTaskCompletion = useHandleTaskCompletion();

  const filteredCards = useMemo(() => {
    let result = cards;
    if (showOnlyMine && user?.id) result = result.filter((card) => card.assigned_to_user_id === user.id || card.assigned_to_user_id === null);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((card) => card.title.toLowerCase().includes(query) || card.tags?.some((tag) => tag.toLowerCase().includes(query)) || card.assignee?.full_name?.toLowerCase().includes(query) || card.client?.client_name?.toLowerCase().includes(query));
    }
    if (selectedAssignee) result = result.filter((card) => card.assigned_to_user_id === selectedAssignee);
    if (!showCompleted) {
      const doneColumnNames = ['CONCLUÍDO', 'CONCLUIDO', 'FEITO', 'DONE', 'COMPLETED'];
      const doneColumnIds = columns.filter((col) => doneColumnNames.some((name) => col.name.toUpperCase().includes(name))).map((col) => col.id);
      result = result.filter((card) => !doneColumnIds.includes(card.column_id));
    }
    return result;
  }, [cards, searchQuery, selectedAssignee, showCompleted, showOnlyMine, user?.id, columns]);

  const getCardsByColumn = (columnId: string) =>
    filteredCards.filter((card) => card.column_id === columnId).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.order - b.order;
    });

  const handleAddCard = async (columnId: string, title: string, dueDate: string) => {
    try {
      const cardsInColumn = cards.filter((c) => c.column_id === columnId);
      const maxOrder = cardsInColumn.length > 0 ? Math.max(...cardsInColumn.map((c) => c.order)) : 0;
      await createCard.mutateAsync({ board_id: boardId, column_id: columnId, title, due_date: dueDate || null, order: maxOrder + 1 });
      toast.success('Tarefa criada!');
    } catch {
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleMoveCard = async (cardId: string, toColumnId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.column_id === toColumnId) return;
    const fromColumnId = card.column_id;
    const targetColumn = columns.find((col) => col.id === toColumnId);
    const isSubirAnuncioColumn = !!targetColumn && targetColumn.name.toUpperCase().includes('SUBIR ANÚNCIO');
    const isDesignBoard = boardId !== BOARDS.TRAFEGO_EXECUCAO && boardId !== BOARDS.CLIENTES;
    if (isSubirAnuncioColumn && isDesignBoard) {
      setPendingGestorMove({ card, toColumnId });
      setShowGestorDialog(true);
      return;
    }

    const doneColumnNames = ['CONCLUÍDO', 'CONCLUIDO', 'FEITO', 'DONE', 'COMPLETED'];
    const isMovingToDone = !!targetColumn && doneColumnNames.some((name) => targetColumn.name.toUpperCase().includes(name));
    if (isMovingToDone && card.client_id && (boardId === BOARDS.DESIGN_PRODUCAO || boardId === BOARDS.TRAFEGO_EXECUCAO)) {
      setPendingMove({ card, toColumnId });
      setShowCompleteDialog(true);
      return;
    }

    const isGestorTrafegoBoard = GESTOR_TRAFEGO_BOARDS.includes(boardId);
    if (isMovingToDone && card.client_id && isGestorTrafegoBoard) {
      try {
        const cardsInTarget = cards.filter((c) => c.column_id === toColumnId);
        const maxOrder = cardsInTarget.length > 0 ? Math.max(...cardsInTarget.map((c) => c.order)) : 0;
        await updateCard.mutateAsync({ id: cardId, board_id: boardId, column_id: toColumnId, order: maxOrder + 1, completed_at: new Date().toISOString() });
        const { data: clientData } = await supabase.from('operational_clients').select('id, client_name, clinic_name, onboarding_stage, client_tier').eq('id', card.client_id).single();
        if (clientData) {
          setPendingOnboardingClient({ id: clientData.id, clientName: clientData.client_name, clinicName: clientData.clinic_name || undefined, onboardingStage: (clientData.onboarding_stage || 'TRAFEGO') as OnboardingStage, clientTier: clientData.client_tier as 'PREMIUM' | 'POPULAR' | null });
          setShowOnboardingFlow(true);
        }
        toast.success('Tarefa concluída!', { description: 'Aprove manualmente o avanço para a próxima etapa.' });
      } catch (error) {
        console.error('Error completing gestor trafego task:', error);
        toast.error('Erro ao mover tarefa');
      }
      return;
    }

    try {
      const cardsInTarget = cards.filter((c) => c.column_id === toColumnId);
      const maxOrder = cardsInTarget.length > 0 ? Math.max(...cardsInTarget.map((c) => c.order)) : 0;
      await updateCard.mutateAsync({ id: cardId, board_id: boardId, column_id: toColumnId, order: maxOrder + 1, completed_at: isMovingToDone ? new Date().toISOString() : null });
      if (boardId === BOARDS.CLIENTES) {
        await handleCardMoved({ cardId, clientId: card.client_id, clientName: card.title, fromColumnId, toColumnId, userId: user?.id || '' });
      }
    } catch {
      toast.error('Erro ao mover tarefa');
    }
  };

  const handleGestorConfirm = async (gestorId: string, gestorName: string, targetBoardId: string, targetBoardName: string) => {
    if (!pendingGestorMove) return;
    const { card, toColumnId } = pendingGestorMove;
    setIsTransferring(true);
    try {
      const cardsInTarget = cards.filter((c) => c.column_id === toColumnId);
      const maxOrder = cardsInTarget.length > 0 ? Math.max(...cardsInTarget.map((c) => c.order)) : 0;
      await updateCard.mutateAsync({ id: card.id, board_id: boardId, column_id: toColumnId, order: maxOrder + 1 });
      const { data: trafegoColumns } = await supabase.from('exec_columns').select('id, name, order').eq('board_id', targetBoardId);
      const subirAnunciosColumn = trafegoColumns?.find((col) => col.name.toUpperCase().includes('SUBIR ANÚNCIO'));
      if (subirAnunciosColumn) {
        const { data: existingCards } = await supabase.from('exec_cards').select('order').eq('column_id', subirAnunciosColumn.id);
        const newOrder = existingCards && existingCards.length > 0 ? Math.max(...existingCards.map((c) => c.order)) + 1 : 0;
        const { data: newCard, error: createError } = await supabase.from('exec_cards').insert({ board_id: targetBoardId, column_id: subirAnunciosColumn.id, title: card.title, description: card.description || `Enviado por Design para ${gestorName}`, client_id: card.client_id, assigned_to_user_id: gestorId, priority: card.priority, due_date: card.due_date, tags: [...(card.tags || []), 'Design'], checklist: [], attachments: card.attachments || [], cover_image: card.cover_image, order: newOrder, created_by_user_id: user?.id || '' }).select('id').single();
        if (createError) throw createError;
        await supabase.from('notifications').insert({ user_id: gestorId, title: 'Novo anúncio para subir', message: `O card "${card.title}" foi enviado para você pela equipe de Design no quadro "${targetBoardName}".`, type: 'DESIGN_CARD_RECEIVED', related_entity: 'exec_cards', related_entity_id: newCard?.id });
        toast.success(`Card enviado para ${gestorName} no quadro "${targetBoardName}"!`);
      } else {
        toast.warning(`Coluna "Subir Anúncios" não encontrada no quadro "${targetBoardName}". Card movido apenas localmente.`);
      }
      setShowGestorDialog(false);
      setPendingGestorMove(null);
    } catch (error) {
      console.error('Error transferring card:', error);
      toast.error('Erro ao transferir card para o Tráfego');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCompleteTaskConfirm = async (responsibleUserId: string, selectedBoardIds: string[]) => {
    if (!pendingMove) return;
    const { card, toColumnId } = pendingMove;
    try {
      const cardsInTarget = cards.filter((c) => c.column_id === toColumnId);
      const maxOrder = cardsInTarget.length > 0 ? Math.max(...cardsInTarget.map((c) => c.order)) : 0;
      await updateCard.mutateAsync({ id: card.id, board_id: boardId, column_id: toColumnId, order: maxOrder + 1 });
      await handleTaskCompletion.mutateAsync({ cardId: card.id, clientId: card.client_id, boardId, responsibleUserId, destinationBoardIds: selectedBoardIds });
      setShowCompleteDialog(false);
      setPendingMove(null);
    } catch {
      toast.error('Erro ao concluir tarefa');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCard.mutateAsync({ id: cardId, board_id: boardId });
      toast.success('Tarefa excluída');
    } catch {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      await updateColumn.mutateAsync({ id: columnId, board_id: boardId, name: newName });
      toast.success('Coluna renomeada');
    } catch {
      toast.error('Erro ao renomear coluna');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    const cardsInColumn = cards.filter((c) => c.column_id === columnId);
    if (cardsInColumn.length > 0) {
      const confirmed = window.confirm(`A coluna "${column?.name || 'Sem nome'}" contém ${cardsInColumn.length} tarefa(s). Excluir a coluna também excluirá todas as tarefas. Deseja continuar?`);
      if (!confirmed) return;
    }
    try {
      await deleteColumn.mutateAsync({ id: columnId, board_id: boardId });
      toast.success('Coluna excluída');
    } catch {
      toast.error('Erro ao excluir coluna');
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      const maxOrder = columns.length > 0 ? Math.max(...columns.map((c) => c.order)) : 0;
      await createColumn.mutateAsync({ board_id: boardId, name: newColumnName.trim(), order: maxOrder + 1 });
      setNewColumnName('');
      setIsAddingColumn(false);
      toast.success('Coluna criada!');
    } catch {
      toast.error('Erro ao criar coluna');
    }
  };

  const handleTogglePin = async (cardId: string, pinned: boolean) => {
    try {
      await updateCard.mutateAsync({ id: cardId, board_id: boardId, pinned });
      toast.success(pinned ? 'Tarefa fixada' : 'Tarefa desafixada');
    } catch {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleMoveSelectedCards = async (targetColumnId: string) => {
    if (selectedCards.size === 0) return;
    try {
      for (const cardId of selectedCards) await handleMoveCard(cardId, targetColumnId);
      toast.success(`${selectedCards.size} card(s) movido(s)!`);
      setSelectedCards(new Set());
      setShowSelectCheckbox(false);
    } catch {
      toast.error('Erro ao mover cards');
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[280px]">
            <Skeleton className="mb-2 h-10 w-full" />
            <Skeleton className="mb-2 h-24 w-full" />
            <Skeleton className="mb-2 h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      {(showSelectCheckbox || selectedCards.size > 0) && (
        <div className="flex items-center gap-3 border-b border-primary/15 bg-primary/10 px-4 py-2">
          <span className="text-sm font-medium text-primary">{selectedCards.size} selecionado(s)</span>
          {selectedCards.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mover para:</span>
              <select className="h-7 rounded-md border border-border bg-background px-2 text-xs" onChange={(e) => { if (e.target.value) { handleMoveSelectedCards(e.target.value); e.target.value = ''; } }} defaultValue="">
                <option value="" disabled>Selecionar coluna...</option>
                {columns.sort((a, b) => a.order - b.order).map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setSelectedCards(new Set()); setShowSelectCheckbox(false); }}>
            <X className="h-3.5 w-3.5" />
            Cancelar sele��o
          </Button>
        </div>
      )}

      {!showSelectCheckbox && selectedCards.size === 0 && (
        <div className="flex items-center gap-2 px-4 py-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowSelectCheckbox(true)}>
            <CheckSquare className="h-3.5 w-3.5" />
            Selecionar cards
          </Button>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-12rem)] w-full flex-1">
        <div className="flex h-full gap-4 bg-gradient-to-br from-red-50/40 via-background to-red-100/30 p-4 dark:from-[#15181f] dark:via-[#171b22] dark:to-[#261619]">
          {columns.sort((a, b) => a.order - b.order).map((column) => (
            <ExecKanbanColumn
              key={column.id}
              column={column}
              cards={getCardsByColumn(column.id)}
              allColumns={columns}
              onAddCard={handleAddCard}
              onEditCard={onEditCard}
              onMoveCard={handleMoveCard}
              onDeleteCard={handleDeleteCard}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onTogglePin={handleTogglePin}
              isDragOver={dragOverColumnId === column.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumnId(column.id); }}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => { e.preventDefault(); const cardId = e.dataTransfer.getData('cardId'); if (cardId) handleMoveCard(cardId, column.id); setDragOverColumnId(null); }}
              selectedCards={selectedCards}
              onToggleSelectCard={(cardId) => setSelectedCards((prev) => { const next = new Set(prev); next.has(cardId) ? next.delete(cardId) : next.add(cardId); if (next.size > 0) setShowSelectCheckbox(true); return next; })}
              showSelectCheckbox={showSelectCheckbox}
            />
          ))}

          {isAddingColumn ? (
            <div className="min-w-[296px] max-w-[296px] rounded-2xl border border-border/70 bg-white/90 p-3 shadow-sm dark:bg-white/5 dark:shadow-none">
              <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Nome da coluna..." className="mb-2 h-8 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') { setNewColumnName(''); setIsAddingColumn(false); } }} />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddColumn} disabled={createColumn.isPending}>Adicionar</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setNewColumnName(''); setIsAddingColumn(false); }}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsAddingColumn(true)} className="flex h-11 min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/8">
              <Plus className="h-4 w-4" />
              Adicionar coluna
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />

        <CompleteTaskDialog open={showCompleteDialog} onOpenChange={(open) => { setShowCompleteDialog(open); if (!open) setPendingMove(null); }} card={pendingMove?.card || null} boardId={boardId} onConfirm={handleCompleteTaskConfirm} isLoading={handleTaskCompletion.isPending} />
        <SelectGestorDialog open={showGestorDialog} onOpenChange={(open) => { setShowGestorDialog(open); if (!open) setPendingGestorMove(null); }} card={pendingGestorMove?.card || null} onConfirm={handleGestorConfirm} isLoading={isTransferring} />
        {pendingOnboardingClient && <ClientOnboardingFlow client={pendingOnboardingClient} open={showOnboardingFlow} onOpenChange={(open) => { setShowOnboardingFlow(open); if (!open) setPendingOnboardingClient(null); }} />}
      </ScrollArea>
    </div>
  );
}

