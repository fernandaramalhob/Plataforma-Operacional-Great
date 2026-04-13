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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OperationalClient } from '@/hooks/useCRMData';
import { Loader2 } from 'lucide-react';

interface DeleteOperationalClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OperationalClient | null;
  onSuccess?: () => void;
}

export function DeleteOperationalClientDialog({ 
  open, 
  onOpenChange, 
  client,
  onSuccess 
}: DeleteOperationalClientDialogProps) {
  const queryClient = useQueryClient();

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('operational_clients')
        .delete()
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Cliente excluído com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  });

  const handleDelete = () => {
    if (!client) return;
    deleteClientMutation.mutate(client.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir <strong>{client?.client_name}</strong>
            {client?.clinic_name && ` (${client.clinic_name})`} do sistema.
            <br /><br />
            <strong className="text-destructive">Esta ação é irreversível.</strong> Todos os dados associados a este cliente serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteClientMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteClientMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteClientMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Cliente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
