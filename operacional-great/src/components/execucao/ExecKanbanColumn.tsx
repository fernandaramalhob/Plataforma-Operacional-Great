import { useState } from 'react';
import { Plus, MoreHorizontal, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ExecColumn, ExecCard, COLOR_TAG_STYLES } from '@/hooks/useExecData';
import { ExecKanbanCard } from './ExecKanbanCard';
import { toast } from 'sonner';

interface ExecKanbanColumnProps {
  column: ExecColumn;
  cards: ExecCard[];
  allColumns: ExecColumn[];
  onAddCard: (columnId: string, title: string, dueDate: string) => void;
  onEditCard: (card: ExecCard) => void;
  onMoveCard: (cardId: string, toColumnId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onRenameColumn: (columnId: string, newName: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onTogglePin?: (cardId: string, pinned: boolean) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  selectedCards: Set<string>;
  onToggleSelectCard: (cardId: string) => void;
  showSelectCheckbox: boolean;
}

// ClickUp-style column header colors
const COLUMN_HEADER_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  neutral: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  purple_soft: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800', dot: 'bg-purple-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  blue_soft: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800', dot: 'bg-blue-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  orange_soft: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-800', dot: 'bg-orange-400' },
  red_soft: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' },
  green_soft: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-800', dot: 'bg-green-400' },
  gray: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-400' },
};

export function ExecKanbanColumn({
  column,
  cards,
  allColumns,
  onAddCard,
  onEditCard,
  onMoveCard,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
  onTogglePin,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  selectedCards,
  onToggleSelectCard,
  showSelectCheckbox,
}: ExecKanbanColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDueDate, setNewCardDueDate] = useState<Date | undefined>(undefined);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.name);

  const colorStyle = COLUMN_HEADER_COLORS[column.color_tag || 'neutral'] || COLUMN_HEADER_COLORS.neutral;

  const handleAddCard = () => {
    if (!newCardTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    onAddCard(column.id, newCardTitle.trim(), newCardDueDate ? format(newCardDueDate, 'yyyy-MM-dd') : '');
    setNewCardTitle('');
    setNewCardDueDate(undefined);
    setIsAddingCard(false);
  };

  const handleRename = () => {
    if (editedName.trim() && editedName !== column.name) {
      onRenameColumn(column.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[280px] h-full max-h-[calc(100vh-14rem)] transition-all duration-300 rounded-md bg-muted/20',
        isDragOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] bg-primary/5'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header - ClickUp style */}
      <div className={cn(
        'flex items-center gap-2 py-2 px-3 rounded-t-md border-b-2',
        colorStyle.bg,
        colorStyle.border
      )}>
        <div className={cn('w-2 h-2 rounded-full shrink-0', colorStyle.dot)} />
        
        {isEditingName ? (
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditedName(column.name);
                setIsEditingName(false);
              }
            }}
            className="h-6 text-xs font-semibold px-1 bg-transparent border-0 focus-visible:ring-1"
            autoFocus
          />
        ) : (
          <span
            className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary uppercase tracking-wide"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {column.name}
          </span>
        )}

        <span className="text-xs font-medium text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded shrink-0">
          {cards.length}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-background/50"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/50">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                Renomear coluna
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddingCard(true)}>
                Adicionar tarefa
              </DropdownMenuItem>
              {onDeleteColumn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    Excluir coluna
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Add Task Button - Right below header */}
      {!isAddingCard && (
        <button
          onClick={() => setIsAddingCard(true)}
          className="flex items-center gap-1.5 py-1.5 px-2 mx-1 mt-2 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nova tarefa</span>
        </button>
      )}

      {/* Cards Container - with proper scrollable height */}
      <div className={cn(
        'flex-1 overflow-y-auto py-2 space-y-2 min-h-[100px] max-h-[calc(100vh-16rem)] px-1 transition-all duration-200 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
        isDragOver && 'bg-primary/5 rounded-md'
      )}>
        {cards.map((card) => (
          <ExecKanbanCard
            key={card.id}
            card={card}
            onEdit={() => onEditCard(card)}
            onDelete={() => onDeleteCard(card.id)}
            onTogglePin={onTogglePin}
            onMoveToColumn={onMoveCard}
            columns={allColumns}
            isSelected={selectedCards.has(card.id)}
            onToggleSelect={onToggleSelectCard}
            showSelectCheckbox={showSelectCheckbox}
          />
        ))}

        {/* Add Card Inline */}
        {isAddingCard && (
          <div className="bg-card border border-border rounded-md p-3 shadow-sm mx-0.5 space-y-3">
            <div>
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Título da tarefa..."
                className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCard();
                  if (e.key === 'Escape') {
                    setNewCardTitle('');
                    setNewCardDueDate(undefined);
                    setIsAddingCard(false);
                  }
                }}
              />
            </div>
            
            {/* Due Date - Optional */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Prazo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-8 justify-start text-left font-normal text-xs",
                      !newCardDueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {newCardDueDate ? format(newCardDueDate, 'PPP', { locale: ptBR }) : 'Selecionar prazo'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={newCardDueDate}
                    onSelect={setNewCardDueDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddCard}>
                Adicionar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setNewCardTitle('');
                  setNewCardDueDate(undefined);
                  setIsAddingCard(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
