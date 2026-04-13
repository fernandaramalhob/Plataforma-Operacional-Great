import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  UserPlus,
  Loader2,
  Users,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
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
import { 
  useOperationalClients, 
  useActivateClient,
  OperationalClient
} from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { AddEventDialog } from '@/components/operacional/AddEventDialog';

import { CreateOperationalClientDialog } from '@/components/operacional/CreateOperationalClientDialog';
import { CRMSpreadsheet } from '@/components/operacional/CRMSpreadsheet';
import { AddCreativeDialog } from '@/components/operacional/AddCreativeDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CRM() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [clientToActivate, setClientToActivate] = useState<OperationalClient | null>(null);
  const [eventClientId, setEventClientId] = useState<string | null>(null);
  const [eventClientName, setEventClientName] = useState<string>('');
  const [showAddCreative, setShowAddCreative] = useState(false);
  const [creativeClientId, setCreativeClientId] = useState<string | null>(null);
  const [creativeClientName, setCreativeClientName] = useState<string>('');
  const [filteredStats, setFilteredStats] = useState({ total: 0, emAtivacao: 0, ativos: 0, encerrados: 0 });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [], isLoading: clientsLoading } = useOperationalClients();
  const activateClient = useActivateClient();

  const handleStatsChange = useCallback((stats: { total: number; emAtivacao: number; ativos: number; encerrados: number }) => {
    setFilteredStats(stats);
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleViewDetails = (client: OperationalClient) => {
    navigate(`/operacional/crm/cliente/${client.id}`);
  };

  const handleAddEvent = (client: OperationalClient) => {
    setEventClientId(client.id);
    setEventClientName(client.client_name);
    setShowAddEvent(true);
  };

  const handleActivateClick = (client: OperationalClient) => {
    setClientToActivate(client);
  };

  const handleAddCreative = (client: OperationalClient) => {
    setCreativeClientId(client.id);
    setCreativeClientName(client.client_name);
    setShowAddCreative(true);
  };

  const handleConfirmActivation = async () => {
    if (!clientToActivate) return;
    try {
      await activateClient.mutateAsync(clientToActivate.id);
      toast.success('Cliente ativado com sucesso!');
      setClientToActivate(null);
    } catch (error) {
      toast.error('Erro ao ativar cliente');
    }
  };

  return (
    <div className="min-h-screen bg-background -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-soft flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">CRM Operacional</h1>
            <p className="text-text-secondary">Gestão de clientes e eventos</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateClient(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredStats.total}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-info mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Em Ativação</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredStats.emAtivacao}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredStats.ativos}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Encerrados</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredStats.encerrados}</p>
        </div>
      </div>

      {/* CRM Spreadsheet */}
      <CRMSpreadsheet
        clients={clients}
        teams={teams}
        onClientSelect={handleClientSelect}
        onViewDetails={handleViewDetails}
        onAddEvent={handleAddEvent}
        onAddCreative={handleAddCreative}
        onActivateClient={handleActivateClick}
        selectedClientId={selectedClientId}
        isLoading={clientsLoading}
        onStatsChange={handleStatsChange}
      />

      {/* Add Event Dialog */}
      {eventClientId && (
        <AddEventDialog
          open={showAddEvent}
          onOpenChange={(open) => {
            setShowAddEvent(open);
            if (!open) {
              setEventClientId(null);
              setEventClientName('');
            }
          }}
          clientId={eventClientId}
          clientName={eventClientName}
        />
      )}


      {/* Create Client Dialog */}
      <CreateOperationalClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
      />

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={!!clientToActivate} onOpenChange={(open) => !open && setClientToActivate(null)}>
        <AlertDialogContent className="bg-white border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Confirmar Ativação</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Você está prestes a ativar o cliente <strong>{clientToActivate?.client_name}</strong>.
              Esta ação mudará o status para "Ativo" e registrará a ativação no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmActivation}
              disabled={activateClient.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {activateClient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Ativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Creative Dialog */}
      {creativeClientId && (
        <AddCreativeDialog
          open={showAddCreative}
          onOpenChange={(open) => {
            setShowAddCreative(open);
            if (!open) {
              setCreativeClientId(null);
              setCreativeClientName('');
            }
          }}
          clientId={creativeClientId}
          clientName={creativeClientName}
        />
      )}
    </div>
  );
}
