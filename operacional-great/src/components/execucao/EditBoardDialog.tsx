import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExecBoard, useUpdateBoard } from '@/hooks/useExecData';
import { toast } from 'sonner';

interface EditBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: ExecBoard | null;
}

export function EditBoardDialog({ open, onOpenChange, board }: EditBoardDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamScope, setTeamScope] = useState<'GLOBAL' | 'EQUIPE'>('EQUIPE');
  
  const updateBoard = useUpdateBoard();
  
  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || '');
      setTeamScope(board.team_scope);
    }
  }, [board]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!board) return;
    
    if (!name.trim()) {
      toast.error('Nome do quadro é obrigatório');
      return;
    }
    
    try {
      await updateBoard.mutateAsync({
        id: board.id,
        name: name.trim(),
        description: description.trim() || null,
        team_scope: teamScope,
      });
      toast.success('Quadro atualizado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao atualizar quadro');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Quadro</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Quadro *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tráfego - Sprint 1"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do quadro..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scope">Escopo</Label>
            <Select value={teamScope} onValueChange={(v) => setTeamScope(v as 'GLOBAL' | 'EQUIPE')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">Global (todos podem ver)</SelectItem>
                <SelectItem value="EQUIPE">Equipe (apenas membros)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateBoard.isPending}>
              {updateBoard.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
