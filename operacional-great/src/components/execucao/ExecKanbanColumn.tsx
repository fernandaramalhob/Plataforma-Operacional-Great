import { useState } from 'react';
import { Plus, MoreHorizontal, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
import { ExecColumn, ExecCard } from '@/hooks/useExecData';
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

const COLUMN_HEADER_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  neutral: { bg: 'bg-slate-100/90 dark:bg-slate-900/40', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
  purple: { bg: 'bg-red-50/80 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/50', dot: 'bg-red-500' },
  purple_soft: { bg: 'bg-rose-50/90 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-900/50', dot: 'bg-rose-400' },
  blue: { bg: 'bg-red-50/70 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/50', dot: 'bg-red-500' },
  blue_soft: { bg: 'bg-orange-50/80 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/40', dot: 'bg-orange-400' },
  orange: { bg: 'bg-amber-50/90 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/40', dot: 'bg-amber-500' },
  orange_soft: { bg: 'bg-orange-50/90 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/40', dot: 'bg-orange-400' },
  red_soft: { bg: 'bg-red-50/90 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/50', dot: 'bg-red-500' },
  green: { bg: 'bg-emerald-50/90 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/40', dot: 'bg-emerald-500' },
  green_soft: { bg: 'bg-emerald-50/80 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/40', dot: 'bg-emerald-400' },
  gray: { bg: 'bg-slate-100/80 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-500' },
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
        'group flex h-full max-h-[calc(100vh-14rem)] min-w-[310px] max-w-[310px] flex-col rounded-2xl border border-[#efd9d7] bg-[linear-gradient(180deg,#fffdfd_0%,#f8f2f2_100%)] shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(31,35,43,0.96)_0%,rgba(24,27,34,0.98)_100%)] dark:shadow-[0_18px_34px_rgba(0,0,0,0.24)]',
        isDragOver && 'scale-[1.01] bg-red-50/80 ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-lg dark:bg-primary/10'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={cn('flex items-center gap-2 rounded-t-2xl border-b px-3 py-3', colorStyle.bg, colorStyle.border)}>
        <div className={cn('h-2 w-2 shrink-0 rounded-full', colorStyle.dot)} />

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
            className="h-7 border-0 bg-transparent px-1 text-sm font-semibold focus-visible:ring-1"
            autoFocus
          />
        ) : (
          <span className="truncate cursor-pointer text-sm font-semibold text-foreground hover:text-primary" onDoubleClick={() => setIsEditingName(true)}>
            {column.name}
          </span>
        )}

        <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm dark:bg-white/8 dark:shadow-none">
          {cards.length}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/70" onClick={() => setIsAddingCard(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background/70">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>Renomear coluna</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddingCard(true)}>Adicionar tarefa</DropdownMenuItem>
              {onDeleteColumn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDeleteColumn(column.id)}>
                    Excluir coluna
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isAddingCard && (
        <button
          onClick={() => setIsAddingCard(true)}
          className="mx-2 mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-primary dark:hover:bg-white/6"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Adicionar um card</span>
        </button>
      )}

      <div
        className={cn(
          'min-h-[100px] max-h-[calc(100vh-16rem)] flex-1 space-y-3 overflow-y-auto px-2 py-2 transition-all duration-200 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          isDragOver && 'rounded-b-2xl bg-red-50/50'
        )}
      >
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

        {isAddingCard && (
          <div className="mx-0.5 space-y-3 rounded-2xl border border-border bg-white p-3 shadow-sm dark:bg-white/5 dark:shadow-none">
            <div>
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Título do card..."
                className="h-8 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
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

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                Prazo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('h-8 w-full justify-start text-left text-xs font-normal', !newCardDueDate && 'text-muted-foreground')}
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
              <Button size="sm" className="h-8 rounded-xl text-xs" onClick={handleAddCard}>
                Adicionar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-xs"
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
