import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, LayoutGrid, Folder, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sector, SECTOR_LABELS, ExecBoard, useExecBoards, useInitializeDefaultBoard } from '@/hooks/useExecData';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditBoardDialog } from './EditBoardDialog';
import { DeleteBoardDialog } from './DeleteBoardDialog';
import { useAuth } from '@/contexts/AuthContext';

interface ExecSidebarProps {
  selectedSector: Sector;
  onSectorChange: (sector: Sector) => void;
  selectedBoardId: string | null;
  onBoardChange: (boardId: string) => void;
  onCreateBoard: () => void;
}

const SECTORS: Sector[] = ['GERAL', 'TRAFEGO', 'ATENDIMENTO', 'MARKETING_DIGITAL'];

export function ExecSidebar({
  selectedSector,
  onSectorChange,
  selectedBoardId,
  onBoardChange,
  onCreateBoard,
}: ExecSidebarProps) {
  const [expandedSectors, setExpandedSectors] = useState<Record<Sector, boolean>>({
    GERAL: true,
    TRAFEGO: true,
    ATENDIMENTO: true,
    MARKETING_DIGITAL: true,
  });
  const [editBoard, setEditBoard] = useState<ExecBoard | null>(null);
  const [deleteBoard, setDeleteBoard] = useState<ExecBoard | null>(null);

  const { data: boards, isLoading } = useExecBoards();
  const initializeBoard = useInitializeDefaultBoard();
  const { user, isAdmin } = useAuth();

  // Check if user can manage boards (admin or coordinator)
  const isCoordinator = user?.role === 'COORDENADOR_RED' || user?.role === 'COORDENADOR_COMERCIAL';
  const canManageBoards = isAdmin || isCoordinator;

  const toggleSector = (sector: Sector) => {
    setExpandedSectors((prev) => ({ ...prev, [sector]: !prev[sector] }));
  };

  const handleSectorClick = (sector: Sector) => {
    onSectorChange(sector);
    if (!expandedSectors[sector]) {
      toggleSector(sector);
    }
  };

  const getBoardsBySector = (sector: Sector) => {
    return boards?.filter((b) => b.sector === sector) || [];
  };

  const handleInitializeDefault = async (sector: Sector) => {
    try {
      const board = await initializeBoard.mutateAsync(sector);
      onBoardChange(board.id);
      toast.success('Quadro padrão criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar quadro padrão');
    }
  };

  const handleBoardDeleted = () => {
    // If the deleted board was selected, clear selection
    if (deleteBoard && selectedBoardId === deleteBoard.id) {
      const sectorBoards = getBoardsBySector(deleteBoard.sector as Sector);
      const remainingBoards = sectorBoards.filter(b => b.id !== deleteBoard.id);
      if (remainingBoards.length > 0) {
        onBoardChange(remainingBoards[0].id);
      }
    }
    setDeleteBoard(null);
  };

  return (
    <>
      <aside className="w-64 min-w-[16rem] border-r border-border bg-surface flex flex-col h-full">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Execuções
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {SECTORS.map((sector) => {
            const sectorBoards = getBoardsBySector(sector);
            const isExpanded = expandedSectors[sector];
            const isSelected = selectedSector === sector;

            return (
              <div key={sector} className="mb-1">
                {/* Sector Header */}
                <button
                  onClick={() => handleSectorClick(sector)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors',
                    'hover:bg-surface-2',
                    isSelected && 'bg-surface-2 text-foreground'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSector(sector);
                    }}
                    className="p-0.5 hover:bg-surface-3 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className={cn('flex-1 text-left truncate', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                    {SECTOR_LABELS[sector]}
                  </span>
                </button>

                {/* Boards List */}
                {isExpanded && (
                  <div className="ml-6 mt-0.5">
                    {isLoading ? (
                      <div className="space-y-1 px-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                      </div>
                    ) : sectorBoards.length === 0 ? (
                      <div className="px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-2">Nenhum quadro</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs w-full justify-start"
                          onClick={() => handleInitializeDefault(sector)}
                          disabled={initializeBoard.isPending}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Criar quadro padrão
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {sectorBoards.map((board) => (
                          <div
                            key={board.id}
                            className={cn(
                              'group w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                              'hover:bg-surface-2 rounded-sm',
                              selectedBoardId === board.id && 'bg-primary/10 text-primary font-medium'
                            )}
                          >
                            <button
                              onClick={() => {
                                onSectorChange(sector);
                                onBoardChange(board.id);
                              }}
                              className="flex-1 flex items-center gap-2 text-left"
                            >
                              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{board.name}</span>
                              {board.is_default && (
                                <span className="text-[10px] text-muted-foreground">padrão</span>
                              )}
                            </button>
                            
                            {/* Board Actions Menu (only for admin/coordinator) */}
                            {canManageBoards && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => setEditBoard(board)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteBoard(board)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Board Button */}
        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={onCreateBoard}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Quadro
          </Button>
        </div>
      </aside>
      
      {/* Edit Board Dialog */}
      <EditBoardDialog
        open={!!editBoard}
        onOpenChange={(open) => !open && setEditBoard(null)}
        board={editBoard}
      />
      
      {/* Delete Board Dialog */}
      <DeleteBoardDialog
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
        board={deleteBoard}
        onDeleted={handleBoardDeleted}
      />
    </>
  );
}
