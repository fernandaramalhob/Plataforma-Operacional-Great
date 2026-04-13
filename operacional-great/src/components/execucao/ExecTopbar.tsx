import { Search, Filter, ArrowUpDown, User, Plus, LayoutGrid, List, Eye, EyeOff, Layers, CheckSquare, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
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
    ? teamMembers.find(m => m.id === selectedAssignee) 
    : null;

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top row - ClickUp style toolbar */}
      <div className="h-12 flex items-center justify-between px-4 gap-4">
        {/* Left side controls */}
        <div className="flex items-center gap-1">
          {/* Board name */}
          <h1 className="text-sm font-semibold text-foreground mr-2">{boardName}</h1>
          
          {/* Group by Status */}
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <Layers className="h-3.5 w-3.5" />
            Grupo: Status
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Subtasks toggle */}
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <CheckSquare className="h-3.5 w-3.5" />
            Subtarefas
          </Button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          {/* Sort */}
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Classificar
          </Button>

          {/* Filter */}
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtro
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Show Only Mine - For non-admin/coordinator users, this is always on */}
          <Button 
            variant={showOnlyMine ? "secondary" : "ghost"}
            size="sm" 
            className={cn(
              "h-8 text-xs gap-1.5 transition-colors",
              showOnlyMine ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={onToggleShowOnlyMine}
            disabled={!canFilterByUser}
            title={!canFilterByUser ? "Você só pode ver seus próprios cards" : ""}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Meus Cards
          </Button>

          {/* Assignee Filter - Only for admin/coordinator */}
          {canFilterByUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={selectedAssignee ? "secondary" : "ghost"}
                  size="sm" 
                  className={cn(
                    "h-8 text-xs gap-1.5 transition-colors",
                    selectedAssignee ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {selectedMember ? (
                    <>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={selectedMember.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {selectedMember.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                <DropdownMenuItem 
                  onClick={() => onAssigneeChange(null)}
                  className={cn(!selectedAssignee && 'bg-primary/10')}
                >
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className={cn(!selectedAssignee && 'font-medium')}>Todos os responsáveis</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map((member) => (
                  <DropdownMenuItem 
                    key={member.id} 
                    onClick={() => onAssigneeChange(member.id)}
                    className={cn(selectedAssignee === member.id && 'bg-primary/10')}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(selectedAssignee === member.id && 'font-medium')}>
                      {member.full_name}
                    </span>
                    {member.id === user?.id && (
                      <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">Você</Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="w-px h-4 bg-border mx-1" />

          {/* Show/Hide Completed */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "h-8 text-xs gap-1.5",
              showCompleted ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={onToggleCompleted}
          >
            {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Concluído
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-44 pl-8 text-xs bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
