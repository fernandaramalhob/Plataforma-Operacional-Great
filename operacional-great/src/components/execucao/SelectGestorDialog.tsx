import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, LayoutGrid } from 'lucide-react';
import { ExecCard } from '@/hooks/useExecData';

interface SelectGestorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ExecCard | null;
  onConfirm: (gestorId: string, gestorName: string, boardId: string, boardName: string) => void;
  isLoading: boolean;
}

export function SelectGestorDialog({
  open,
  onOpenChange,
  card,
  onConfirm,
  isLoading,
}: SelectGestorDialogProps) {
  const [selectedGestorId, setSelectedGestorId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  // Fetch gestores de tráfego (users with GESTOR role)
  const { data: gestores = [] } = useQuery({
    queryKey: ['gestores-trafego'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, operational_role')
        .eq('operational_role', 'GESTOR')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch tráfego boards
  const { data: trafegoBoards = [] } = useQuery({
    queryKey: ['trafego-boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exec_boards')
        .select('id, name')
        .eq('sector', 'TRAFEGO')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedGestorId('');
      setSelectedBoardId('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedGestorId || !selectedBoardId) return;
    const gestor = gestores.find(g => g.id === selectedGestorId);
    const board = trafegoBoards.find(b => b.id === selectedBoardId);
    onConfirm(selectedGestorId, gestor?.full_name || '', selectedBoardId, board?.name || '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar para Gestor de Tráfego
          </DialogTitle>
          <DialogDescription>
            Selecione o quadro de destino e o Gestor de Tráfego responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {card && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium">{card.title}</p>
              {card.client?.client_name && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cliente: {card.client.client_name}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Quadro de Tráfego *
            </Label>
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o quadro..." />
              </SelectTrigger>
              <SelectContent>
                {trafegoBoards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span>{board.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trafegoBoards.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum quadro de tráfego encontrado.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Gestor de Tráfego Responsável *</Label>
            <Select value={selectedGestorId} onValueChange={setSelectedGestorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o gestor..." />
              </SelectTrigger>
              <SelectContent>
                {gestores.map((gestor) => (
                  <SelectItem key={gestor.id} value={gestor.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={gestor.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {gestor.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{gestor.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {gestores.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum gestor de tráfego encontrado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedGestorId || !selectedBoardId || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
