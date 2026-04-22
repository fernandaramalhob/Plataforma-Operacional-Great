import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Rocket, CheckCircle, Clock, AlertTriangle, Loader2, Crown, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { OperationalClient, useActivateClient } from '@/hooks/useCRMData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientActivationCardProps {
  client: OperationalClient;
}

const STATUS_CONFIG = {
  NOVO_CLIENTE: { label: 'Novo Cliente', color: 'bg-blue-100 text-blue-700', icon: Clock },
  ONBOARDING: { label: 'Onboarding', color: 'bg-warning-soft text-warning', icon: Clock },
  ATIVO: { label: 'Ativo', color: 'bg-success-soft text-success', icon: CheckCircle },
  PAUSADO: { label: 'Pausado', color: 'bg-surface-2 text-text-secondary', icon: AlertTriangle },
  CHURNED: { label: 'Churned', color: 'bg-danger-soft text-danger', icon: AlertTriangle },
};

export function ClientActivationCard({ client }: ClientActivationCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const activateClient = useActivateClient();

  const statusConfig = STATUS_CONFIG[client.status_operacional as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOVO_CLIENTE;
  const StatusIcon = statusConfig.icon;
  const isActivated = !!client.activated_at;
  const canActivate = !isActivated && client.status_operacional !== 'ATIVO';

  const handleActivate = async () => {
    try {
      await activateClient.mutateAsync(client.id);
      toast.success('Cliente ativado com sucesso!');
      setShowConfirm(false);
    } catch (error) {
      toast.error('Erro ao ativar cliente');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                statusConfig.color
              )}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </span>
              {client.plan && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-text-secondary">
                  {client.plan}
                </span>
              )}
              {/* Client Tier Badge */}
              {client.client_tier && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    client.client_tier === 'PREMIUM' 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}
                >
                  {client.client_tier === 'PREMIUM' ? (
                    <Crown className="h-3 w-3" />
                  ) : (
                    <Users2 className="h-3 w-3" />
                  )}
                  {client.client_tier}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {client.client_name}
            </h3>
            {client.clinic_name && (
              <p className="text-sm text-text-secondary truncate">{client.clinic_name}</p>
            )}

            <div className="mt-3 space-y-1 text-xs text-text-muted">
              <p>
                Cadastrado em {format(new Date(client.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              {isActivated && client.activated_at && (
                <p className="text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ativado em {format(new Date(client.activated_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {canActivate && (
            <Button
              onClick={() => setShowConfirm(true)}
              className="bg-primary hover:bg-primary/90 text-white shrink-0"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Ativar Cliente
            </Button>
          )}

          {isActivated && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-success-soft text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Ativado</span>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-white border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Confirmar Ativação</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Você está prestes a ativar o cliente <strong>{client.client_name}</strong>.
              Esta ação mudará o status para "Ativo" e registrará a ativação no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={activateClient.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {activateClient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Ativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
