import { useState } from 'react';
import { Plus, CheckCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreference } from '@/hooks/useUserPreference';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'primary';
  roles?: string[];
  module?: 'COMERCIAL' | 'OPERACIONAL';
}

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const { user, getModule } = useAuth();
  const currentModule = getModule();
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const today = new Date().toDateString();
  const { value: lastCheckIn, setValue: setLastCheckIn } = useUserPreference<string | null>(
    'great_last_checkin',
    null,
  );
  const isCheckedIn = lastCheckIn === today;

  const handleCheckIn = async () => {
    await setLastCheckIn(today);
    setIsCheckInDialogOpen(false);
    toast.success('Check-in realizado com sucesso!', {
      description: `VocÃª fez check-in Ã s ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  const actions: QuickAction[] = [
    {
      id: 'create-client',
      label: 'Criar cliente',
      icon: Plus,
      onClick: () => console.log('Create client'),
      variant: 'primary',
      module: 'COMERCIAL',
    },
    {
      id: 'create-task',
      label: 'Criar tarefa',
      icon: ClipboardList,
      onClick: () => toast.info('Em breve!', { description: 'Funcionalidade de criaÃ§Ã£o de tarefas em desenvolvimento.' }),
      module: 'OPERACIONAL',
      roles: ['GESTOR', 'COORDENADOR_RED'],
    },
    {
      id: 'checkin',
      label: isCheckedIn ? 'Check-in feito âœ“' : 'Fazer check-in',
      icon: CheckCircle,
      onClick: () => {
        if (isCheckedIn) {
          toast.info('VocÃª jÃ¡ fez check-in hoje!');
        } else {
          setIsCheckInDialogOpen(true);
        }
      },
      variant: 'primary',
      module: 'OPERACIONAL',
    },
  ];

  const filteredActions = actions.filter(action => {
    if (action.module && action.module !== currentModule) return false;
    if (action.roles && user && !action.roles.includes(user.role)) return false;
    return true;
  });

  if (filteredActions.length === 0) return null;

  return (
    <>
      <div className={cn('flex flex-wrap gap-3', className)}>
        {filteredActions.map(action => (
          <Button
            key={action.id}
            variant={action.variant === 'primary' ? 'default' : 'outline'}
            onClick={action.onClick}
            className={cn(
              "gap-2",
              action.id === 'checkin' && isCheckedIn && "bg-success hover:bg-success/90"
            )}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Check-in</DialogTitle>
            <DialogDescription>
              VocÃª estÃ¡ prestes a registrar seu check-in de hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckInDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckIn}>
              Confirmar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
