import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExecBoard, useDeleteBoard } from '@/hooks/useExecData';
import { toast } from 'sonner';

interface DeleteBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: ExecBoard | null;
  onDeleted?: () => void;
}

export function DeleteBoardDialog({ open, onOpenChange, board, onDeleted }: DeleteBoardDialogProps) {
  const deleteBoard = useDeleteBoard();
  
  const handleDelete = async () => {
    if (!board) return;
    
    try {
      await deleteBoard.mutateAsync(board.id);
      toast.success('Quadro removido com sucesso!');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error('Erro ao remover quadro');
    }
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Quadro</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o quadro <strong>"{board?.name}"</strong>?
            <br /><br />
            Esta ação é irreversível e irá remover todas as colunas e cards do quadro.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteBoard.isPending}
          >
            {deleteBoard.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
