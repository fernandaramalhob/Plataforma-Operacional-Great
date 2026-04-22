import { Search, User, Plus, LayoutGrid, List, Eye, EyeOff, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export type ViewMode = 'board' | 'list';

interface ExecTopbarProps {
  boardName: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddCard: () => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  selectedAssignee: string | null;
  onAssigneeChange: (assigneeId: string | null) => void;
  teamMembers: { id: string; full_name: string; avatar_url?: string | null }[];
  showOnlyMine: boolean;
  onToggleShowOnlyMine: () => void;
}

export function ExecTopbar({
  boardName,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onAddCard,
  showCompleted,
  onToggleCompleted,
  selectedAssignee,
  onAssigneeChange,
  teamMembers,
  showOnlyMine,
  onToggleShowOnlyMine,
}: ExecTopbarProps) {
  const { user, isAdmin } = useAuth();
  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canFilterByUser = isAdmin || isCoordinator;

  const selectedMember = selectedAssignee
    ? teamMembers.find((m) => m.id === selectedAssignee)
    : null;

  return (
    <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,242,242,0.98)_58%,rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(24,27,34,0.98),rgba(52,24,26,0.96)_58%,rgba(24,27,34,0.98))]">
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(225,6,0,0.08)]" />
              <h1 className="truncate text-lg font-semibold text-foreground">{boardName}</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Visual de quadro mais limpo, inspirado no Trello e alinhado com a identidade vermelha da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'board' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 gap-1.5', viewMode === 'board' && 'bg-primary hover:bg-primary/90')}
              onClick={() => onViewModeChange('board')}
            >
              <LayoutGrid className="h-4 w-4" />
              Quadro
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              className={cn('h-9 gap-1.5', viewMode === 'list' && 'bg-primary hover:bg-primary/90')}
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
            <Button onClick={onAddCard} size="sm" className="h-9 gap-1.5 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Novo card
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar cards..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 rounded-xl border-primary/10 bg-white pl-9 text-sm shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-foreground dark:placeholder:text-muted-foreground"
            />
          </div>

          <Button
            variant={showOnlyMine ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-9 rounded-xl border text-xs gap-1.5 transition-colors',
              showOnlyMine
                ? 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
            )}
            onClick={onToggleShowOnlyMine}
            disabled={!canFilterByUser}
            title={!canFilterByUser ? 'Você só pode ver seus próprios cards' : ''}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Meus cards
          </Button>

          {canFilterByUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedAssignee ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 rounded-xl border text-xs gap-1.5 transition-colors',
                    selectedAssignee
                      ? 'border-primary/20 bg-primary/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {selectedMember ? (
                    <>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={selectedMember.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {selectedMember.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-20 truncate">{selectedMember.full_name.split(' ')[0]}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3.5 w-3.5" />
                      Responsável
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-medium">Filtrar por responsável</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAssigneeChange(null)} className={cn(!selectedAssignee && 'bg-primary/10')}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className={cn(!selectedAssignee && 'font-medium')}>Todos os responsáveis</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => onAssigneeChange(member.id)}
                    className={cn(selectedAssignee === member.id && 'bg-primary/10')}
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {member.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(selectedAssignee === member.id && 'font-medium')}>{member.full_name}</span>
                    {member.id === user?.id && (
                      <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[9px]">
                        Você
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant={showCompleted ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'h-9 rounded-xl border text-xs gap-1.5',
              showCompleted
                ? 'border-primary/20 bg-primary/10 text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
            )}
            onClick={onToggleCompleted}
          >
            {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Concluídos
          </Button>
        </div>
      </div>
    </div>
  );
}
