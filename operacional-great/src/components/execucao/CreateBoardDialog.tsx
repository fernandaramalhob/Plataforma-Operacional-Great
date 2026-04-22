import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Sector, SECTOR_LABELS, DEFAULT_BOARDS_CONFIG, useCreateBoard } from '@/hooks/useExecData';
import { toast } from 'sonner';

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSector?: Sector;
  onSuccess?: (boardId: string) => void;
}

export function CreateBoardDialog({
  open,
  onOpenChange,
  defaultSector = 'GERAL',
  onSuccess,
}: CreateBoardDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState<Sector>(defaultSector);
  const [teamScope, setTeamScope] = useState<'GLOBAL' | 'EQUIPE'>('EQUIPE');
  const [useDefaultColumns, setUseDefaultColumns] = useState(true);

  const createBoard = useCreateBoard();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Nome do quadro é obrigatório');
      return;
    }

    try {
      const columns = useDefaultColumns ? DEFAULT_BOARDS_CONFIG[sector].columns : undefined;
      const board = await createBoard.mutateAsync({
        sector,
        name: name.trim(),
        description: description.trim() || undefined,
        team_scope: teamScope,
        columns,
      });

      toast.success('Quadro criado com sucesso!');
      onOpenChange(false);
      onSuccess?.(board.id);

      // Reset form
      setName('');
      setDescription('');
      setUseDefaultColumns(true);
    } catch (error) {
      toast.error('Erro ao criar quadro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Quadro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nome do quadro</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Produção Semanal"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do quadro..."
              className="mt-1.5 min-h-[60px] resize-none"
            />
          </div>

          <div>
            <Label>Setor</Label>
            <Select value={sector} onValueChange={(v) => setSector(v as Sector)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SECTOR_LABELS) as Sector[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SECTOR_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Escopo</Label>
            <Select value={teamScope} onValueChange={(v) => setTeamScope(v as 'GLOBAL' | 'EQUIPE')}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">Global (visível para todos)</SelectItem>
                <SelectItem value="EQUIPE">Equipe (visível para a equipe)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="useDefault"
              checked={useDefaultColumns}
              onCheckedChange={(checked) => setUseDefaultColumns(!!checked)}
            />
            <label htmlFor="useDefault" className="text-sm text-muted-foreground cursor-pointer">
              Criar com colunas padrão do setor
            </label>
          </div>

          {useDefaultColumns && (
            <div className="bg-surface rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Colunas que serão criadas:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_BOARDS_CONFIG[sector].columns.map((col, idx) => (
                  <span key={idx} className="text-xs bg-surface-2 px-2 py-1 rounded">
                    {col.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createBoard.isPending}>
            {createBoard.isPending ? 'Criando...' : 'Criar Quadro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
