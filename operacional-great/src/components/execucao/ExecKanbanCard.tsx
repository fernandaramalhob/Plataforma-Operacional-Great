import { useState } from 'react';
import { Calendar, MoreHorizontal, ChevronDown, ChevronRight, Check, Plus, ArrowRight, Pin, PinOff, AlertTriangle, Clock, MoveRight, Crown, Users2 } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ExecCard, ExecColumn, useUpdateCard } from '@/hooks/useExecData';
import { toast } from 'sonner';
import { useUpdateClientOnboardingStage } from '@/hooks/useCRMData';
import { CLIENTS_BOARD_ID, COLUMN_IDS } from '@/hooks/useClientBoardSync';

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

const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  meta: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  'implantação': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  implantando: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  'na fila': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  'urgência': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  projeto: { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  feito: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  publicado: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
};

const getTagStyle = (tag: string) => {
  const lowerTag = tag.toLowerCase();
  return TAG_STYLES[lowerTag] || { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' };
};

const normalizeColumnName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const DONE_LIKE_COLUMN_NAMES = new Set(['FEITO', 'SUBIR ANUNCIO', 'SUBIR ANUNCIOS']);
const isDoneLikeColumn = (name?: string | null) => !!name && DONE_LIKE_COLUMN_NAMES.has(normalizeColumnName(name));

export function ExecKanbanCard({ card, onEdit, onDelete, onTogglePin, onMoveToColumn, columns, isSelected, onToggleSelect, showSelectCheckbox }: ExecKanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const updateCard = useUpdateCard();
  const updateClientStage = useUpdateClientOnboardingStage();
  const checklist: ChecklistItem[] = card.checklist || [];
  const completedCount = checklist.filter((item) => item.done).length;
  const totalCount = checklist.length;
  const hasChecklist = totalCount > 0;
  const allCompleted = hasChecklist && completedCount === totalCount;
  const isClientCard = card.board_id === CLIENTS_BOARD_ID && card.client_id;
  const currentStageIndex = isClientCard ? ONBOARDING_STAGES.findIndex((s) => s.columnId === card.column_id) : -1;
  const currentStage = currentStageIndex >= 0 ? ONBOARDING_STAGES[currentStageIndex] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < ONBOARDING_STAGES.length - 1 ? ONBOARDING_STAGES[currentStageIndex + 1] : null;
  const isLastStage = currentStageIndex === ONBOARDING_STAGES.length - 1;

  const handleAdvanceStage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.client_id || !nextStage) return;
    try {
      await updateClientStage.mutateAsync({ clientId: card.client_id, stage: nextStage.key });
      toast.success(`Cliente avançado para ${nextStage.label}!`);
    } catch {
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
  const getUrgencyLevel = () => {
    if (!card.due_date || card.completed_at || isInDoneLikeColumn) return 'none';
    const now = new Date();
    const dueDate = new Date(card.due_date);
    if (isPast(dueDate)) return 'overdue';
    if (differenceInHours(dueDate, now) <= 24) return 'critical';
    if (differenceInDays(dueDate, now) <= 2) return 'warning';
    return 'none';
  };

  const urgencyLevel = getUrgencyLevel();
  const isDueDateOverdue = urgencyLevel === 'overdue';
  const isDueDateCritical = urgencyLevel === 'critical';
  const isDueDateWarning = urgencyLevel === 'warning';
  const hasUrgency = urgencyLevel !== 'none';

  const handleToggleChecklistItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const updatedChecklist = checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
    try {
      await updateCard.mutateAsync({ id: card.id, board_id: card.board_id, checklist: updatedChecklist });
    } catch {
      toast.error('Erro ao atualizar subtarefa');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newSubtask.trim()) return;
    try {
      await updateCard.mutateAsync({
        id: card.id,
        board_id: card.board_id,
        checklist: [...checklist, { id: crypto.randomUUID(), text: newSubtask.trim(), done: false }],
      });
      setNewSubtask('');
      setIsAddingSubtask(false);
      toast.success('Subtarefa adicionada!');
    } catch {
      toast.error('Erro ao adicionar subtarefa');
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('cardId', card.id);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      onClick={onEdit}
      className={cn(
        'group relative cursor-grab rounded-2xl border border-slate-200 bg-white px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:border-white/8 dark:bg-[rgba(255,255,255,0.045)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.18)]',
        isDragging && 'cursor-grabbing opacity-40 rotate-2 scale-105 shadow-xl ring-2 ring-primary/40',
        isSelected && 'bg-primary/5 ring-2 ring-primary/40',
        urgencyLevel === 'overdue' && !isSelected && 'border-destructive bg-destructive/5 shadow-[0_0_0_1px_rgba(239,68,68,0.08)] dark:bg-destructive/10',
        urgencyLevel === 'critical' && !isSelected && 'border-orange-300 bg-orange-50/70 dark:bg-orange-900/10',
        urgencyLevel === 'warning' && !isSelected && 'border-amber-300 bg-amber-50/70 dark:bg-amber-900/10',
        !hasUrgency && !isSelected && 'hover:border-primary/20 dark:hover:border-primary/30',
        card.pinned && !hasUrgency && !isSelected && 'border-primary/20 bg-primary/5 dark:bg-primary/10'
      )}
    >
      {showSelectCheckbox && (
        <div className="absolute left-2 top-2 z-10" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(card.id); }}>
          <Checkbox checked={isSelected} className="h-4 w-4 border-muted-foreground/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
        </div>
      )}

      {hasUrgency && (
        <div className={cn('absolute -right-2 -top-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm', urgencyLevel === 'overdue' && 'animate-pulse bg-destructive text-destructive-foreground', urgencyLevel === 'critical' && 'bg-orange-500 text-white', urgencyLevel === 'warning' && 'bg-yellow-500 text-yellow-900')}>
          {urgencyLevel === 'overdue' ? <><AlertTriangle className="h-3 w-3" />Atrasada</> : urgencyLevel === 'critical' ? <><Clock className="h-3 w-3" />Urgente</> : <><Clock className="h-3 w-3" />Em breve</>}
        </div>
      )}

      {card.pinned && !hasUrgency && <div className="absolute -left-1.5 -top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground"><Pin className="h-3 w-3" /></div>}

      <h3 className={cn('mb-2 pr-6 text-sm font-medium text-foreground line-clamp-2', showSelectCheckbox && 'pl-6')}>{card.title}</h3>

      {card.due_date && (
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <span className={cn('inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium dark:bg-white/8', isDueDateOverdue && 'text-destructive', isDueDateCritical && 'text-orange-600 dark:text-orange-400', isDueDateWarning && 'text-yellow-600 dark:text-yellow-500', !hasUrgency && 'text-muted-foreground')}>
            {hasUrgency ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {formatDueDate(card.due_date)}
          </span>
        </div>
      )}

      {hasChecklist && (
        <div className="mb-2">
          <button onClick={(e) => { e.stopPropagation(); setIsChecklistExpanded(!isChecklistExpanded); }} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors -mx-2 hover:bg-muted/50', allCompleted ? 'text-success' : 'text-muted-foreground')}>
            {isChecklistExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn('h-full transition-all duration-300', allCompleted ? 'bg-success' : 'bg-primary')} style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} /></div>
            <span className="shrink-0 font-medium">{completedCount}/{totalCount}</span>
          </button>
          {isChecklistExpanded && (
            <div className="mt-2 space-y-1.5 pl-1" onClick={(e) => e.stopPropagation()}>
              {checklist.map((item) => (
                <div key={item.id} className="group/item flex items-start gap-2">
                  <Checkbox checked={item.done} onCheckedChange={() => {}} onClick={(e) => handleToggleChecklistItem(e, item.id)} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className={cn('text-xs leading-relaxed', item.done && 'line-through text-muted-foreground')}>{item.text}</span>
                </div>
              ))}
              {isAddingSubtask ? (
                <form onSubmit={handleAddSubtask} className="mt-2 flex items-center gap-2">
                  <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Nova subtarefa..." className="h-7 flex-1 text-xs" autoFocus onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setIsAddingSubtask(false); setNewSubtask(''); } }} />
                  <Button type="submit" size="sm" className="h-7 px-2" disabled={!newSubtask.trim()}><Check className="h-3 w-3" /></Button>
                </form>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setIsAddingSubtask(true); setIsChecklistExpanded(true); }} className="mt-1 flex items-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" />Adicionar subtarefa</button>
              )}
            </div>
          )}
        </div>
      )}

      {!hasChecklist && (
        <button onClick={(e) => { e.stopPropagation(); setIsAddingSubtask(true); }} className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"><Plus className="h-3 w-3" />Adicionar subtarefa</button>
      )}

      {!hasChecklist && isAddingSubtask && (
        <form onSubmit={handleAddSubtask} className="mb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Nova subtarefa..." className="h-7 flex-1 text-xs" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setIsAddingSubtask(false); setNewSubtask(''); } }} />
          <Button type="submit" size="sm" className="h-7 px-2" disabled={!newSubtask.trim()}><Check className="h-3 w-3" /></Button>
        </form>
      )}

      {isClientCard && nextStage && (
        <div className="mb-2">
          <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 rounded-xl border-primary/20 bg-primary/5 text-xs text-primary hover:bg-primary/10" onClick={handleAdvanceStage} disabled={updateClientStage.isPending}>
            {updateClientStage.isPending ? 'Avançando...' : <>Avançar para {nextStage.label}<ArrowRight className="h-3 w-3" /></>}
          </Button>
        </div>
      )}

      {isClientCard && isLastStage && <div className="mb-2"><Badge className="w-full justify-center border-0 bg-success/10 py-1 text-xs text-success"><Check className="mr-1 h-3 w-3" />Cliente Ativo</Badge></div>}

      <div className="flex flex-wrap items-center gap-1.5">
        {card.client && (card.client as any).client_tier && (
          <Badge variant="outline" className={cn('h-5 gap-0.5 border-0 px-1.5 py-0.5 text-[10px] font-medium', (card.client as any).client_tier === 'PREMIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')}>
            {(card.client as any).client_tier === 'PREMIUM' ? <Crown className="h-2.5 w-2.5" /> : <Users2 className="h-2.5 w-2.5" />}
            {(card.client as any).client_tier}
          </Badge>
        )}
        {isClientCard && currentStage && !isLastStage && <Badge variant="outline" className="h-5 border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">{currentStage.label}</Badge>}
        {card.assignee && <Badge variant="outline" className="h-5 border-0 bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-700 dark:bg-white/8 dark:text-slate-200">{card.assignee.full_name.split(' ')[0].toLowerCase()}</Badge>}
        {card.tags && card.tags.slice(0, 3).map((tag, idx) => { const style = getTagStyle(tag); return <Badge key={idx} variant="outline" className={cn('h-5 border-0 px-1.5 py-0.5 text-[10px] font-normal', style.bg, style.text)}>{tag}</Badge>; })}
        {card.tags && card.tags.length > 3 && <Badge variant="outline" className="h-5 border-0 bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">+{card.tags.length - 3}</Badge>}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50 w-48 bg-popover">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>Editar</DropdownMenuItem>
          {columns && columns.length > 0 && onMoveToColumn && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><MoveRight className="mr-2 h-3.5 w-3.5" />Mover para</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="z-50 bg-popover">
                  {columns.filter((col) => col.id !== card.column_id).sort((a, b) => a.order - b.order).map((col) => <DropdownMenuItem key={col.id} onClick={(e) => { e.stopPropagation(); onMoveToColumn(card.id, col.id); }}>{col.name}</DropdownMenuItem>)}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          {onTogglePin && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(card.id, !card.pinned); }}>{card.pinned ? <><PinOff className="mr-2 h-3.5 w-3.5" />Desafixar</> : <><Pin className="mr-2 h-3.5 w-3.5" />Fixar no topo</>}</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
