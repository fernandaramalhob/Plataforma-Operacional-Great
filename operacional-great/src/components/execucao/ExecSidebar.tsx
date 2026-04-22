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

const SECTOR_COLORS: Record<Sector, string> = {
  GERAL: 'text-primary',
  TRAFEGO: 'text-red-500',
  ATENDIMENTO: 'text-rose-500',
  MARKETING_DIGITAL: 'text-orange-500',
};

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

  const getBoardsBySector = (sector: Sector) => boards?.filter((b) => b.sector === sector) || [];

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
    if (deleteBoard && selectedBoardId === deleteBoard.id) {
      const sectorBoards = getBoardsBySector(deleteBoard.sector as Sector);
      const remainingBoards = sectorBoards.filter((b) => b.id !== deleteBoard.id);
      if (remainingBoards.length > 0) {
        onBoardChange(remainingBoards[0].id);
      }
    }
    setDeleteBoard(null);
  };

  return (
    <>
      <aside className="flex h-full w-72 min-w-[18rem] flex-col border-r border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,246,246,0.96))] dark:bg-[linear-gradient(180deg,rgba(21,24,31,1),rgba(37,22,24,0.98))]">
        <div className="border-b border-primary/10 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Execuções
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {SECTORS.map((sector) => {
            const sectorBoards = getBoardsBySector(sector);
            const isExpanded = expandedSectors[sector];
            const isSelected = selectedSector === sector;

            return (
              <div key={sector} className="mb-1 px-2">
                <button
                  onClick={() => handleSectorClick(sector)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:hover:shadow-none',
                    isSelected && 'bg-white text-foreground shadow-sm ring-1 ring-primary/10 dark:bg-white/5 dark:shadow-none'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSector(sector);
                    }}
                    className="rounded-md p-0.5 hover:bg-primary/5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <Folder className={cn('h-4 w-4', SECTOR_COLORS[sector])} />
                  <span className={cn('flex-1 truncate text-left font-medium', SECTOR_COLORS[sector])}>
                    {SECTOR_LABELS[sector]}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-6 mt-1">
                    {isLoading ? (
                      <div className="space-y-1 px-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-3/4" />
                      </div>
                    ) : sectorBoards.length === 0 ? (
                      <div className="px-3 py-2">
                        <p className="mb-2 text-xs text-muted-foreground">Nenhum quadro</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full justify-start rounded-xl border border-dashed border-primary/20 bg-white text-xs hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10"
                          onClick={() => handleInitializeDefault(sector)}
                          disabled={initializeBoard.isPending}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Criar quadro padrão
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {sectorBoards.map((board) => (
                          <div
                            key={board.id}
                            className={cn(
                              'group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                              'hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:hover:shadow-none',
                              selectedBoardId === board.id && 'bg-primary/10 font-medium text-primary ring-1 ring-primary/10 dark:bg-primary/15'
                            )}
                          >
                            <button
                              onClick={() => {
                                onSectorChange(sector);
                                onBoardChange(board.id);
                              }}
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{board.name}</span>
                              {board.is_default && (
                                <span className="text-[10px] text-muted-foreground">padrão</span>
                              )}
                            </button>

                            {canManageBoards && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => setEditBoard(board)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteBoard(board)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
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

        <div className="border-t border-primary/10 p-4">
          <Button variant="outline" size="sm" className="w-full justify-start rounded-xl border-primary/15 bg-white hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10" onClick={onCreateBoard}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Quadro
          </Button>
        </div>
      </aside>

      <EditBoardDialog
        open={!!editBoard}
        onOpenChange={(open) => !open && setEditBoard(null)}
        board={editBoard}
      />

      <DeleteBoardDialog
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
        board={deleteBoard}
        onDeleted={handleBoardDeleted}
      />
    </>
  );
}
