import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Clipboard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ExecCard } from '@/hooks/useExecData';
import { BOARDS } from '@/hooks/useClientWorkflowAutomation';

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ExecCard | null;
  boardId: string;
  onConfirm: (responsibleUserId: string, selectedBoardIds: string[]) => void;
  isLoading?: boolean;
}

// Map board to allowed sectors for destination boards
const BOARD_SECTOR_MAP: Record<string, string> = {
  [BOARDS.DESIGN_PRODUCAO]: 'MARKETING_DIGITAL',
  [BOARDS.TRAFEGO_EXECUCAO]: 'TRAFEGO',
};

// Design team members names (case insensitive matching)
const DESIGN_TEAM_MEMBERS = ['brenda', 'hannah', 'taiwan', 'thiago'];

// Role label mapping for display
const ROLE_LABELS: Record<string, string> = {
  'COORDENADOR_RED': 'Coordenador/Head',
  'GESTOR_TRAFEGO': 'Gestor de Tráfego',
  'DESIGN': 'Design',
  'EDITOR_VIDEO': 'Editor de Vídeo',
  'ATENDENTE': 'Atendente',
  'EQUIPE_DESIGN': 'Equipe Design',
  'EQUIPE_TECH': 'Equipe Tech',
};

// System boards that should never appear as destinations
const SYSTEM_BOARD_IDS = [
  BOARDS.CLIENTES,
  BOARDS.DESIGN_PRODUCAO,
  BOARDS.TRAFEGO_EXECUCAO,
];

export function CompleteTaskDialog({
  open,
  onOpenChange,
  card,
  boardId,
  onConfirm,
  isLoading = false,
}: CompleteTaskDialogProps) {
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  // Check if this is the Marketing Digital board
  const isMarketingDigitalBoard = boardId === BOARDS.DESIGN_PRODUCAO;

  // Fetch active users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['profiles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, operational_role')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Filter users based on board type - only design team for Marketing Digital
  const users = isMarketingDigitalBoard
    ? allUsers.filter(user => 
        DESIGN_TEAM_MEMBERS.some(name => 
          user.full_name?.toLowerCase().includes(name.toLowerCase())
        )
      )
    : allUsers;

  // Helper function to format role label
  const formatRoleLabel = (role: string | null): string => {
    if (!role) return '';
    return ROLE_LABELS[role] || role.replace(/_/g, ' ');
  };

  // Get the allowed sector for the current board
  const allowedSector = BOARD_SECTOR_MAP[boardId];

  // Fetch boards filtered by sector
  const { data: boards = [] } = useQuery({
    queryKey: ['exec-boards-by-sector', allowedSector],
    queryFn: async () => {
      if (!allowedSector) return [];
      const { data, error } = await supabase
        .from('exec_boards')
        .select('id, name, sector')
        .eq('sector', allowedSector)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!allowedSector,
  });

  // Filter out system boards from the results
  const availableBoards = boards.filter(
    (board) => !SYSTEM_BOARD_IDS.includes(board.id)
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedResponsible(card?.assigned_to_user_id || '');
      setSelectedBoards([]);
    }
  }, [open, card]);

  const handleBoardToggle = (boardId: string, checked: boolean) => {
    if (checked) {
      setSelectedBoards((prev) => [...prev, boardId]);
    } else {
      setSelectedBoards((prev) => prev.filter((id) => id !== boardId));
    }
  };

  const handleConfirm = () => {
    if (!selectedResponsible) return;
    onConfirm(selectedResponsible, selectedBoards);
  };

  const boardType = boardId === BOARDS.DESIGN_PRODUCAO ? 'Marketing Digital' : 'Tráfego Pago';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-primary" />
            Concluir Tarefa
          </DialogTitle>
          <DialogDescription>
            Defina o responsável e selecione os quadros onde o cliente será adicionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Card info */}
          {card && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="font-medium text-sm">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quadro: {boardType}
              </p>
            </div>
          )}

          {/* Responsible selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Responsável *
            </Label>
            <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                    {user.operational_role && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({formatRoleLabel(user.operational_role)})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Board selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              Adicionar aos quadros (ClickUp)
            </Label>
            <p className="text-xs text-muted-foreground">
              Selecione um ou mais quadros onde o card do cliente será criado.
            </p>
            
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              <div className="space-y-2">
                {availableBoards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum quadro disponível
                  </p>
                ) : (
                  availableBoards.map((board) => (
                    <div
                      key={board.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`board-${board.id}`}
                        checked={selectedBoards.includes(board.id)}
                        onCheckedChange={(checked) => handleBoardToggle(board.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`board-${board.id}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {board.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            {selectedBoards.length > 0 && (
              <p className="text-xs text-primary">
                {selectedBoards.length} quadro(s) selecionado(s)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedResponsible || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Conclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
