import { useState } from 'react';
import { Calendar, Folder, Flag, MoreHorizontal, Link2, ChevronDown, ChevronRight, Check, Plus, ArrowRight, Pin, PinOff, AlertTriangle, Clock, MoveRight, Crown, Users2 } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ExecCard, ExecColumn, useUpdateCard } from '@/hooks/useExecData';
import { toast } from 'sonner';
import { useUpdateClientOnboardingStage } from '@/hooks/useCRMData';
import { CLIENTS_BOARD_ID, COLUMN_IDS } from '@/hooks/useClientBoardSync';

// Onboarding stages in order
const ONBOARDING_STAGES = [
  { key: 'BRIEFING', label: 'Briefing', columnId: COLUMN_IDS.BRIEFING },
  { key: 'ONBOARDING', label: 'Reunião de Start', columnId: COLUMN_IDS.REUNIAO_START },
  { key: 'MARKETING', label: 'Marketing Digital', columnId: COLUMN_IDS.MARKETING_DIGITAL },
  { key: 'TRAFEGO', label: 'Tráfego Pago', columnId: COLUMN_IDS.TRAFEGO_PAGO },
  { key: 'ATIVO', label: 'Ativo', columnId: COLUMN_IDS.ATIVO },
];

interface ExecKanbanCardProps {
  card: ExecCard;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin?: (cardId: string, pinned: boolean) => void;
  onMoveToColumn?: (cardId: string, columnId: string) => void;
  columns?: ExecColumn[];
  isSelected?: boolean;
  onToggleSelect?: (cardId: string) => void;
  showSelectCheckbox?: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// ClickUp-style tag colors
const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  'meta': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'implantação': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  'implantando': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  'na fila': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  'urgência': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  'projeto': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  'feito': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  'publicado': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
};

const getTagStyle = (tag: string) => {
  const lowerTag = tag.toLowerCase();
  return TAG_STYLES[lowerTag] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
};

const normalizeColumnName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const DONE_LIKE_COLUMN_NAMES = new Set(['FEITO', 'SUBIR ANUNCIO', 'SUBIR ANUNCIOS']);

const isDoneLikeColumn = (name?: string | null) => {
  if (!name) return false;
  return DONE_LIKE_COLUMN_NAMES.has(normalizeColumnName(name));
};

export function ExecKanbanCard({ card, onEdit, onDelete, onTogglePin, onMoveToColumn, columns, isSelected, onToggleSelect, showSelectCheckbox }: ExecKanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  const updateCard = useUpdateCard();
  const updateClientStage = useUpdateClientOnboardingStage();
  
  const checklist: ChecklistItem[] = card.checklist || [];
  const completedCount = checklist.filter(item => item.done).length;
  const totalCount = checklist.length;
  const hasChecklist = totalCount > 0;
  const allCompleted = hasChecklist && completedCount === totalCount;

  // Check if this card is from the CLIENTES board and has a client linked
  const isClientCard = card.board_id === CLIENTS_BOARD_ID && card.client_id;
  
  // Get current stage based on column
  const currentStageIndex = isClientCard 
    ? ONBOARDING_STAGES.findIndex(s => s.columnId === card.column_id)
    : -1;
  const currentStage = currentStageIndex >= 0 ? ONBOARDING_STAGES[currentStageIndex] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < ONBOARDING_STAGES.length - 1 
    ? ONBOARDING_STAGES[currentStageIndex + 1] 
    : null;
  const isLastStage = currentStageIndex === ONBOARDING_STAGES.length - 1;

  const handleAdvanceStage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.client_id || !nextStage) return;
    
    try {
      await updateClientStage.mutateAsync({
        clientId: card.client_id,
        stage: nextStage.key,
      });
      toast.success(`Cliente avançado para ${nextStage.label}!`);
    } catch (error) {
      toast.error('Erro ao avançar estágio');
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'd MMM', { locale: ptBR });
  };

  const currentColumnName = columns?.find((c) => c.id === card.column_id)?.name;
  const isInDoneLikeColumn = isDoneLikeColumn(currentColumnName);

  // Urgency levels for visual indicators
  const getUrgencyLevel = () => {
    // Columns treated like "done" should never be flagged as overdue/urgent
    if (!card.due_date || card.completed_at || isInDoneLikeColumn) return 'none';
    
    const now = new Date();
    const dueDate = new Date(card.due_date);
    
    if (isPast(dueDate)) return 'overdue';
    
    const hoursUntilDue = differenceInHours(dueDate, now);
    const daysUntilDue = differenceInDays(dueDate, now);
    
    if (hoursUntilDue <= 24) return 'critical'; // Due within 24 hours
    if (daysUntilDue <= 2) return 'warning'; // Due within 2 days
    
    return 'none';
  };

  const urgencyLevel = getUrgencyLevel();
  const isDueDateOverdue = urgencyLevel === 'overdue';
  const isDueDateCritical = urgencyLevel === 'critical';
  const isDueDateWarning = urgencyLevel === 'warning';
  const hasUrgency = urgencyLevel !== 'none';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleToggleChecklist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecklistExpanded(!isChecklistExpanded);
  };

  const handleToggleChecklistItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    
    try {
      await updateCard.mutateAsync({
        id: card.id,
        board_id: card.board_id,
        checklist: updatedChecklist,
      });
    } catch (error) {
      toast.error('Erro ao atualizar subtarefa');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newSubtask.trim()) return;
    
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newSubtask.trim(),
      done: false,
    };
    
    const updatedChecklist = [...checklist, newItem];
    
    try {
      await updateCard.mutateAsync({
        id: card.id,
        board_id: card.board_id,
        checklist: updatedChecklist,
      });
      setNewSubtask('');
      setIsAddingSubtask(false);
      toast.success('Subtarefa adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar subtarefa');
    }
  };

  const handleStartAddSubtask = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddingSubtask(true);
    setIsChecklistExpanded(true);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(card.id, !card.pinned);
    }
  };

  const handleSelectCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(card.id);
    }
  };

  const handleMoveToColumn = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    if (onMoveToColumn) {
      onMoveToColumn(card.id, columnId);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onEdit}
      className={cn(
        'group relative bg-card border rounded-md px-3 py-2.5 cursor-grab transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'active:cursor-grabbing',
        isDragging && 'opacity-40 rotate-2 scale-105 shadow-xl ring-2 ring-primary/50 cursor-grabbing',
        // Selection styles
        isSelected && 'ring-2 ring-primary bg-primary/5',
        // Urgency styles
        urgencyLevel === 'overdue' && !isSelected && 'border-destructive border-2 bg-destructive/5 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
        urgencyLevel === 'critical' && !isSelected && 'border-orange-500 border-2 bg-orange-50/50 dark:bg-orange-900/10',
        urgencyLevel === 'warning' && !isSelected && 'border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10',
        !hasUrgency && !isSelected && 'border-border hover:border-primary/30',
        card.pinned && !hasUrgency && !isSelected && 'border-primary/40 bg-primary/5'
      )}
      style={{
        transform: isDragging ? 'rotate(3deg) scale(1.05)' : undefined,
      }}
    >
      {/* Selection checkbox */}
      {showSelectCheckbox && (
        <div 
          className="absolute top-2 left-2 z-10"
          onClick={handleSelectCard}
        >
          <Checkbox 
            checked={isSelected} 
            className="h-4 w-4 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      )}
      {/* Urgency indicator badge */}
      {hasUrgency && (
        <div className={cn(
          'absolute -top-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm',
          urgencyLevel === 'overdue' && 'bg-destructive text-destructive-foreground animate-pulse',
          urgencyLevel === 'critical' && 'bg-orange-500 text-white',
          urgencyLevel === 'warning' && 'bg-yellow-500 text-yellow-900'
        )}>
          {urgencyLevel === 'overdue' ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              Atrasada
            </>
          ) : urgencyLevel === 'critical' ? (
            <>
              <Clock className="h-3 w-3" />
              Urgente
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Em breve
            </>
          )}
        </div>
      )}

      {/* Pinned indicator */}
      {card.pinned && !hasUrgency && (
        <div className="absolute -top-1.5 -left-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
          <Pin className="h-3 w-3" />
        </div>
      )}

      {/* Title */}
      <h3 className={cn(
        "text-sm font-medium text-foreground mb-2 line-clamp-2 pr-6",
        showSelectCheckbox && "pl-6"
      )}>
        {card.title}
      </h3>

      {/* Icons row - ClickUp style */}
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Link2 className="h-3.5 w-3.5" />
        <Folder className="h-3.5 w-3.5" />
        <Flag className="h-3.5 w-3.5" />
        
        {/* Due Date */}
        {card.due_date && (
          <span className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isDueDateOverdue && 'text-destructive',
            isDueDateCritical && 'text-orange-600 dark:text-orange-400',
            isDueDateWarning && 'text-yellow-600 dark:text-yellow-500',
            !hasUrgency && 'text-muted-foreground'
          )}>
            {hasUrgency ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3" />
            )}
            {formatDueDate(card.due_date)}
          </span>
        )}
      </div>

      {/* Subtasks/Checklist Progress */}
      {hasChecklist && (
        <div className="mb-2">
          <button
            onClick={handleToggleChecklist}
            className={cn(
              'flex items-center gap-2 text-xs w-full py-1.5 px-2 -mx-2 rounded-md transition-colors',
              'hover:bg-muted/50',
              allCompleted ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {isChecklistExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            
            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-300',
                  allCompleted ? 'bg-success' : 'bg-primary'
                )}
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            
            <span className="font-medium shrink-0">
              {completedCount}/{totalCount}
            </span>
          </button>

          {/* Expanded Checklist */}
          {isChecklistExpanded && (
            <div className="mt-2 space-y-1.5 pl-1" onClick={(e) => e.stopPropagation()}>
              {checklist.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-2 group/item"
                >
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={() => {}}
                    onClick={(e) => handleToggleChecklistItem(e, item.id)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className={cn(
                    'text-xs leading-relaxed',
                    item.done && 'line-through text-muted-foreground'
                  )}>
                    {item.text}
                  </span>
                </div>
              ))}
              
              {/* Add subtask inline */}
              {isAddingSubtask ? (
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Nova subtarefa..."
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setIsAddingSubtask(false);
                        setNewSubtask('');
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="h-7 px-2"
                    disabled={!newSubtask.trim()}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </form>
              ) : (
                <button
                  onClick={handleStartAddSubtask}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1 py-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar subtarefa
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add subtask button when no checklist exists */}
      {!hasChecklist && (
        <button
          onClick={handleStartAddSubtask}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus className="h-3 w-3" />
          Adicionar subtarefa
        </button>
      )}
      
      {/* Inline add subtask when no checklist */}
      {!hasChecklist && isAddingSubtask && (
        <form 
          onSubmit={handleAddSubtask} 
          className="flex items-center gap-2 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Nova subtarefa..."
            className="h-7 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setIsAddingSubtask(false);
                setNewSubtask('');
              }
            }}
          />
          <Button 
            type="submit" 
            size="sm" 
            className="h-7 px-2"
            disabled={!newSubtask.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
        </form>
      )}

      {/* Advance Stage Button for Client Cards */}
      {isClientCard && nextStage && (
        <div className="mb-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            onClick={handleAdvanceStage}
            disabled={updateClientStage.isPending}
          >
            {updateClientStage.isPending ? (
              'Avançando...'
            ) : (
              <>
                Avançar para {nextStage.label}
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Stage completed indicator for client cards */}
      {isClientCard && isLastStage && (
        <div className="mb-2">
          <Badge className="w-full justify-center bg-success/10 text-success border-0 text-xs py-1">
            <Check className="h-3 w-3 mr-1" />
            Cliente Ativo
          </Badge>
        </div>
      )}

      {/* Tags row - ClickUp style */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Client Tier Badge */}
        {card.client && (card.client as any).client_tier && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0.5 h-5 font-medium border-0 gap-0.5",
              (card.client as any).client_tier === 'PREMIUM' 
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            {(card.client as any).client_tier === 'PREMIUM' ? (
              <Crown className="h-2.5 w-2.5" />
            ) : (
              <Users2 className="h-2.5 w-2.5" />
            )}
            {(card.client as any).client_tier}
          </Badge>
        )}

        {/* Current stage indicator for client cards */}
        {isClientCard && currentStage && !isLastStage && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0.5 h-5 font-normal bg-primary/10 text-primary border-primary/20"
          >
            {currentStage.label}
          </Badge>
        )}

        {/* Assignee name as tag */}
        {card.assignee && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0.5 h-5 font-normal bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0"
          >
            {card.assignee.full_name.split(' ')[0].toLowerCase()}
          </Badge>
        )}

        {/* Tags */}
        {card.tags && card.tags.slice(0, 3).map((tag, idx) => {
          const style = getTagStyle(tag);
          return (
            <Badge
              key={idx}
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0.5 h-5 font-normal border-0', style.bg, style.text)}
            >
              {tag}
            </Badge>
          );
        })}

        {/* Extra tags count */}
        {card.tags && card.tags.length > 3 && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0.5 h-5 font-normal bg-muted text-muted-foreground border-0"
          >
            +{card.tags.length - 3}
          </Badge>
        )}
      </div>

      {/* More actions button - appears on hover */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            Editar
          </DropdownMenuItem>
          
          {/* Move to column submenu */}
          {columns && columns.length > 0 && onMoveToColumn && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MoveRight className="h-3.5 w-3.5 mr-2" />
                Mover para
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-popover z-50">
                  {columns
                    .filter(col => col.id !== card.column_id)
                    .sort((a, b) => a.order - b.order)
                    .map(col => (
                      <DropdownMenuItem 
                        key={col.id}
                        onClick={(e) => handleMoveToColumn(e, col.id)}
                      >
                        {col.name}
                      </DropdownMenuItem>
                    ))
                  }
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          
          {onTogglePin && (
            <DropdownMenuItem onClick={handleTogglePin}>
              {card.pinned ? (
                <>
                  <PinOff className="h-3.5 w-3.5 mr-2" />
                  Desafixar
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5 mr-2" />
                  Fixar no topo
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
