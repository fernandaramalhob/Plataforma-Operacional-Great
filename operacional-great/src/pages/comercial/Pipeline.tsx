import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StaleRecontatoAlert } from '@/components/notifications/StaleRecontatoAlert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCommercial, PipelineStage, STAGE_ORDER, STAGE_LABELS, PipelineClient, VENDEDOR_OPTIONS, EQUIPE_OPTIONS, AGENDADOR_OPTIONS, Pacote, Periodo, PagadorAnuncio, Equipe, Vendedor } from '@/contexts/CommercialContext';
import { useAuth } from '@/contexts/AuthContext';
import { PipelineColumn } from '@/components/comercial/PipelineColumn';
import { PipelineCard } from '@/components/comercial/PipelineCard';
import { PipelineSpreadsheet } from '@/components/comercial/PipelineSpreadsheet';
import { SalesSpreadsheet } from '@/components/comercial/SalesSpreadsheet';
import { PipelineViewToggle, PipelineView } from '@/components/comercial/PipelineViewToggle';
import { RecontatoList } from '@/components/comercial/RecontatoList';
import { CreateClientDialog } from '@/components/comercial/CreateClientDialog';
import { EditClientDialog } from '@/components/comercial/EditClientDialog';
import { DeleteClientDialog } from '@/components/comercial/DeleteClientDialog';
import { LostReasonDialog } from '@/components/comercial/LostReasonDialog';
import { NoShowReasonDialog } from '@/components/comercial/NoShowReasonDialog';
import { NotesDialog } from '@/components/comercial/NotesDialog';
import { NegotiationDetailsDialog } from '@/components/comercial/NegotiationDetailsDialog';
import { ClosedDetailsDialog } from '@/components/comercial/ClosedDetailsDialog';
import { ManageCriativosDialog } from '@/components/comercial/ManageCriativosDialog';
import { CelebrationAnimation } from '@/components/comercial/CelebrationAnimation';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';
import { MonthPeriodFilter, useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { DayPeriodFilter, useDayFilter } from '@/components/comercial/DayPeriodFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPICard } from '@/components/dashboard/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Handshake, 
  CheckCircle, 
  Target, 
  TrendingUp,
  Plus,
  Filter,
  Search,
  Settings,
  Sparkles,
  PhoneCall,
  LayoutList,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PipelinePage() {
  const { 
    pipelineClients, 
    movePipelineClient,
    updatePipelineClient,
    deletePipelineClient,
    getPipelineStats 
  } = useCommercial();
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();

  const [activeClient, setActiveClient] = useState<PipelineClient | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<PipelineClient | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; clientName: string } | null>(null);
  const [pendingNoShow, setPendingNoShow] = useState<{ id: string; clientName: string } | null>(null);
  const [pendingNegotiation, setPendingNegotiation] = useState<{ id: string; clientName: string; clinicName?: string; targetStage: 'NEGOCIACAO' | 'FECHADO' } | null>(null);
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [pendingClosed, setPendingClosed] = useState<{ id: string; clientName: string; clinicName?: string; entrada: number } | null>(null);
  const [closedDialogOpen, setClosedDialogOpen] = useState(false);
  const [pendingTaxa, setPendingTaxa] = useState<{ id: string; clientName: string } | null>(null);
  const [taxaDialogOpen, setTaxaDialogOpen] = useState(false);
  const [taxaVendedor, setTaxaVendedor] = useState<string>('');
  const [criativosDialogOpen, setCriativosDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ clientName: string; value: number } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<PipelineView>('table'); // Default to table view
  const [activeTab, setActiveTab] = useState<'pipeline' | 'recontato'>('pipeline');

  // Period filter for KPIs
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterValue>('all_time');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const { filterByPeriod } = usePeriodFilter();

  // Multi-select
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Day filter for Kanban
  const [dayFilter, setDayFilter] = useState<Date | undefined>(undefined);
  const { filterByDay } = useDayFilter();

  // Filters for Kanban
  const [vendedorFilter, setVendedorFilter] = useState<string>('all');
  const [equipeFilter, setEquipeFilter] = useState<string>('all');
  const [sdrFilter, setSdrFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { filterByMonth } = useMonthFilter();

  // When the user wants "Todo o período", ensure the month filter doesn't hide anything
  useEffect(() => {
    if (periodFilter === 'all_time') {
      setMonthFilter('all');
    }
  }, [periodFilter]);

  // Clear day filter when period filter changes to a preset
  useEffect(() => {
    if (periodFilter !== 'all_time') {
      setDayFilter(undefined);
    }
  }, [periodFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper to get relevant date for a client
  const getClientDate = (client: PipelineClient) => {
    // For FECHADO/TAXA_INTERESSE, use closing date (lastStageChange)
    if (client.stage === 'FECHADO' || client.stage === 'TAXA_INTERESSE') {
      return client.lastStageChange 
        ? new Date(client.lastStageChange) 
        : (client.dataEntrada || client.entryDate);
    }
    return client.dataEntrada || client.entryDate;
  };

  // Filter clients by period AND day for stats
  const periodFilteredClients = useMemo(() => {
    return pipelineClients.filter(client => {
      if (!client.ativo && client.stage !== 'PERDIDO' && client.stage !== 'FECHADO') return false;
      const clientDate = getClientDate(client);
      
      // Apply period filter
      if (!filterByPeriod(clientDate, periodFilter, customStart, customEnd)) return false;
      
      // Apply day filter if set
      if (dayFilter) {
        const dateToCheck = clientDate instanceof Date ? clientDate : (clientDate ? new Date(clientDate as any) : undefined);
        if (!filterByDay(dateToCheck, dayFilter)) return false;
      }
      
      return true;
    });
  }, [pipelineClients, periodFilter, dayFilter, customStart, customEnd, filterByPeriod, filterByDay]);

  // Calculate stats based on period-filtered clients
  const stats = useMemo(() => {
    const closedClients = periodFilteredClients.filter(c => c.stage === 'FECHADO');
    const negotiationClients = periodFilteredClients.filter(c => c.stage === 'NEGOCIACAO');
    const totalActiveClients = periodFilteredClients.filter(c => c.stage !== 'PERDIDO');
    
    const totalValue = totalActiveClients.reduce((sum, c) => sum + (c.entrada || 0), 0);
    const closedValue = closedClients.reduce((sum, c) => sum + (c.entrada || 0), 0);
    const negotiationValue = negotiationClients.reduce((sum, c) => sum + (c.entrada || 0), 0);
    const conversionRate = totalActiveClients.length > 0 
      ? (closedClients.length / totalActiveClients.length) * 100 
      : 0;
    const averageTicket = closedClients.length > 0 
      ? closedValue / closedClients.length 
      : 0;
    
    return {
      totalValue,
      closedValue,
      negotiationValue,
      conversionRate,
      averageTicket,
    };
  }, [periodFilteredClients]);

  const handleDragStart = (event: DragStartEvent) => {
    const client = pipelineClients.find(c => c.id === event.active.id);
    setActiveClient(client || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    if (!over) return;

    const clientId = active.id as string;
    const newStage = over.id as PipelineStage;
    const client = pipelineClients.find(c => c.id === clientId);

    if (!client || client.stage === newStage) return;

    // If moving to PERDIDO, ask for reason
    if (newStage === 'PERDIDO') {
      setPendingMove({ id: clientId, clientName: client.clientName });
      setLostDialogOpen(true);
      return;
    }

    // If moving to NO_SHOW, ask for reason
    if (newStage === 'NO_SHOW') {
      setPendingNoShow({ id: clientId, clientName: client.clientName });
      setNoShowDialogOpen(true);
      return;
    }

    // If moving to TAXA_INTERESSE, ask for closer
    if (newStage === 'TAXA_INTERESSE') {
      setPendingTaxa({ id: clientId, clientName: client.clientName });
      setTaxaVendedor('');
      setTaxaDialogOpen(true);
      return;
    }

    // If moving to NEGOCIACAO, ask for details (if not already set)
    if (newStage === 'NEGOCIACAO' && client.entrada === 0) {
      setPendingNegotiation({ id: clientId, clientName: client.clientName, targetStage: 'NEGOCIACAO' });
      setNegotiationDialogOpen(true);
      return;
    }

    // If moving to FECHADO, ask for details
    if (newStage === 'FECHADO') {
      // If entrada is 0, need full negotiation details
      if (client.entrada === 0) {
        setPendingNegotiation({ id: clientId, clientName: client.clientName, clinicName: client.clinicName, targetStage: 'FECHADO' });
        setNegotiationDialogOpen(true);
        return;
      }
      // If entrada is set but no pagadorAnuncio, ask only for pagador
      setPendingClosed({ id: clientId, clientName: client.clientName, clinicName: client.clinicName, entrada: client.entrada });
      setClosedDialogOpen(true);
      return;
    }

    movePipelineClient(clientId, newStage);
  };

  const handleLostConfirm = (reason: string, vendedor: string) => {
    if (pendingMove) {
      movePipelineClient(pendingMove.id, 'PERDIDO', reason, { vendedor: vendedor as any });
      toast.info('Cliente movido para Perdidos');
      setPendingMove(null);
    }
  };

  const handleNoShowConfirm = (reason: string, vendedor: string) => {
    if (pendingNoShow) {
      movePipelineClient(pendingNoShow.id, 'NO_SHOW', undefined, { vendedor: vendedor as any, noShowReason: reason });
      toast.warning(`${pendingNoShow.clientName} marcado como No Show`);
      setPendingNoShow(null);
    }
  };

  const handleTaxaConfirm = () => {
    if (pendingTaxa && taxaVendedor) {
      movePipelineClient(pendingTaxa.id, 'TAXA_INTERESSE', undefined, { vendedor: taxaVendedor as any });
      toast.success(`${pendingTaxa.clientName} movido para Taxa de Interesse`);
      setPendingTaxa(null);
      setTaxaDialogOpen(false);
    }
  };

  const handleNegotiationConfirm = (data: { vendedor: Vendedor; pacote: Pacote; periodo: Periodo; entrada: number; clinicName?: string; equipe?: Equipe; pagadorAnuncio?: PagadorAnuncio }) => {
    if (pendingNegotiation) {
      const extraData = {
        vendedor: data.vendedor,
        pacote: data.pacote,
        periodo: data.periodo,
        entrada: data.entrada,
        ...(data.clinicName && { clinicName: data.clinicName }),
        ...(data.equipe && { equipe: data.equipe }),
        ...(data.pagadorAnuncio && { pagadorAnuncio: data.pagadorAnuncio }),
      };
      
      movePipelineClient(pendingNegotiation.id, pendingNegotiation.targetStage, undefined, extraData);
      
      if (pendingNegotiation.targetStage === 'FECHADO') {
        // Trigger celebration animation
        setCelebrationData({ clientName: pendingNegotiation.clientName, value: data.entrada });
        setShowCelebration(true);
      } else {
        toast.success(`${pendingNegotiation.clientName} movido para Negociação`);
      }
      
      setPendingNegotiation(null);
    }
  };

  const handleClosedConfirm = (equipe: Equipe, pagadorAnuncio: PagadorAnuncio, clinicName: string) => {
    if (pendingClosed) {
      const client = pipelineClients.find(c => c.id === pendingClosed.id);
      const extraData = { 
        equipe,
        pagadorAnuncio,
        clinicName,
        periodo: client?.periodo,
        entrada: client?.entrada || pendingClosed.entrada,
      };
      movePipelineClient(pendingClosed.id, 'FECHADO', undefined, extraData);
      // Trigger celebration animation
      setCelebrationData({ clientName: pendingClosed.clientName, value: pendingClosed.entrada });
      setShowCelebration(true);
      setPendingClosed(null);
    }
  };

  const handleNotesClick = (client: PipelineClient) => {
    setSelectedClient(client);
    setNotesDialogOpen(true);
  };

  const handleEditClient = (client: PipelineClient) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleDeleteClient = (client: PipelineClient) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  // Multi-select handlers
  const handleSelectToggle = (clientId: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleSelectAllInColumn = (_stage: PipelineStage, clientIds: string[]) => {
    setSelectedCardIds(prev => {
      const allSelected = clientIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        clientIds.forEach(id => next.delete(id));
      } else {
        clientIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Bulk move selected cards to a stage
  const handleBulkMove = async (targetStage: PipelineStage) => {
    if (selectedCardIds.size === 0) return;
    try {
      for (const id of selectedCardIds) {
        await movePipelineClient(id, targetStage);
      }
      toast.success(`${selectedCardIds.size} lead(s) movido(s) para ${STAGE_LABELS[targetStage]}`);
      setSelectedCardIds(new Set());
    } catch (error) {
      toast.error('Erro ao mover leads em massa');
    }
  };

  // Bulk delete selected cards
  const handleBulkDelete = async () => {
    if (selectedCardIds.size === 0) return;
    const idsArray = Array.from(selectedCardIds);
    const count = idsArray.length;
    
    // Collect client info for agenda cleanup before deleting
    const clientsToDelete = pipelineClients.filter(c => selectedCardIds.has(c.id));
    
    try {
      // Bulk delete pipeline clients in a single query
      const { error } = await supabase
        .from('pipeline_clients')
        .delete()
        .in('id', idsArray);

      if (error) throw error;

      // Clean up agenda events in parallel
      const agendaCleanups: Promise<unknown>[] = [];
      for (const client of clientsToDelete) {
        if (client.telefone) {
          agendaCleanups.push(
            Promise.resolve(supabase.from('agenda_events').delete().eq('client_phone', client.telefone))
          );
        }
        agendaCleanups.push(
          Promise.resolve(supabase.from('agenda_events').delete().eq('client_name', client.clientName))
        );
      }
      await Promise.all(agendaCleanups);

      queryClient.invalidateQueries({ queryKey: ['pipeline-clients-db'] });
      toast.success(`${count} lead(s) removido(s) do pipeline`);
      setSelectedCardIds(new Set());
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erro ao remover leads em massa');
    }
  };

  const filteredClients = pipelineClients.filter(client => {
    // Allow inactive clients only if they are in PERDIDO stage (so they show in that column)
    if (!client.ativo && client.stage !== 'PERDIDO' && client.stage !== 'FECHADO') return false;
    if (vendedorFilter !== 'all' && client.vendedor !== vendedorFilter) return false;
    if (equipeFilter !== 'all' && client.equipe !== equipeFilter) return false;
    if (sdrFilter !== 'all' && client.agendadoPor !== sdrFilter) return false;

    // Get the relevant date for this client
    const clientDate = getClientDate(client);
    
    // Apply the general period filter to the Kanban list
    if (!filterByPeriod(clientDate, periodFilter, customStart, customEnd)) return false;
    
    // Apply day filter if set
    if (dayFilter) {
      const dateToCheck = clientDate instanceof Date ? clientDate : (clientDate ? new Date(clientDate as any) : undefined);
      if (!filterByDay(dateToCheck, dayFilter)) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const normalizedQuery = query.replace(/\D/g, ''); // Remove non-digits for phone matching
      const matchesSearch = 
        client.clientName.toLowerCase().includes(query) ||
        client.clinicName.toLowerCase().includes(query) ||
        client.criativo.toLowerCase().includes(query) ||
        (normalizedQuery.length > 0 && client.telefone && client.telefone.replace(/\D/g, '').includes(normalizedQuery));
      if (!matchesSearch) return false;
    }
    
    // Month filter (optional)
    if (monthFilter !== 'all') {
      if (!filterByMonth(clientDate ? new Date(clientDate as any) : undefined, monthFilter)) return false;
    }
    
    return true;
  });

  // Group by stage
  const clientsByStage = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = filteredClients.filter(c => c.stage === stage);
    return acc;
  }, {} as Record<PipelineStage, PipelineClient[]>);

  // Total pipeline value for percentage calculation (exclude PERDIDO)
  const totalPipelineValue = filteredClients
    .filter(c => c.stage !== 'PERDIDO')
    .reduce((sum, c) => sum + c.entrada, 0);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas oportunidades de vendas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button 
              variant="outline" 
              onClick={() => setCriativosDialogOpen(true)} 
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Criativos
            </Button>
          )}
          {activeTab === 'pipeline' && (
            <PipelineViewToggle 
              view={viewMode} 
              onViewChange={setViewMode}
              showAnalytics={false}
            />
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipeline' | 'recontato')}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="pipeline" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="recontato" className="gap-2">
            <PhoneCall className="h-4 w-4" />
            Recontato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6 space-y-6">
          {/* Period Filter + Day Filter + KPIs */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <DayPeriodFilter value={dayFilter} onChange={setDayFilter} />
            <PeriodFilter 
              value={periodFilter} 
              onChange={setPeriodFilter} 
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={(start, end) => {
                setCustomStart(start);
                setCustomEnd(end);
              }}
            />
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              label="Total no Pipeline"
              value={formatBRL(stats.totalValue)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <KPICard
              label="Em Negociação"
              value={formatBRL(stats.negotiationValue)}
              icon={<Handshake className="h-5 w-5" />}
              variant="warning"
            />
            <KPICard
              label="Fechado no Mês"
              value={formatBRL(stats.closedValue)}
              icon={<CheckCircle className="h-5 w-5" />}
              variant="success"
            />
            <KPICard
              label="Taxa de Conversão"
              value={`${stats.conversionRate.toFixed(1)}%`}
              icon={<Target className="h-5 w-5" />}
            />
            <KPICard
              label="Ticket Médio"
              value={`R$ ${stats.averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <>
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filtros:</span>
                    </div>
                    <MonthPeriodFilter value={monthFilter} onChange={setMonthFilter} />
                    <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Vendedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todos vendedores</SelectItem>
                        {VENDEDOR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={equipeFilter} onValueChange={setEquipeFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Equipe" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todas equipes</SelectItem>
                        {EQUIPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sdrFilter} onValueChange={setSdrFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="SDR" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todos SDRs</SelectItem>
                        {AGENDADOR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {(vendedorFilter !== 'all' || equipeFilter !== 'all' || sdrFilter !== 'all' || monthFilter !== 'all' || dayFilter || searchQuery) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setVendedorFilter('all');
                          setEquipeFilter('all');
                          setSdrFilter('all');
                          setMonthFilter('all');
                          setDayFilter(undefined);
                          setSearchQuery('');
                        }}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Selection summary bar with bulk actions */}
              {selectedCardIds.size > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {selectedCardIds.size} lead{selectedCardIds.size > 1 ? 's' : ''} selecionado{selectedCardIds.size > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Valor: {formatBRL(
                          pipelineClients
                            .filter(c => selectedCardIds.has(c.id))
                            .reduce((sum, c) => sum + (c.entrada || 0), 0)
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Move to stage dropdown */}
                      <Select onValueChange={(value) => handleBulkMove(value as PipelineStage)}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Mover para..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_ORDER.map(stage => (
                            <SelectItem key={stage} value={stage}>
                              {STAGE_LABELS[stage]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Bulk delete */}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                      >
                        Remover ({selectedCardIds.size})
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCardIds(new Set())}
                      >
                        Limpar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pipeline Board */}
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {STAGE_ORDER.map(stage => (
                    <PipelineColumn
                      key={stage}
                      stage={stage}
                      clients={clientsByStage[stage]}
                      totalPipelineValue={totalPipelineValue}
                      onAddClient={stage === 'NOVO' ? () => setCreateDialogOpen(true) : undefined}
                      onEditClient={handleEditClient}
                      onDeleteClient={handleDeleteClient}
                      onNotesClient={handleNotesClick}
                      selectedCardIds={selectedCardIds}
                      onSelectToggle={handleSelectToggle}
                      onSelectAllInColumn={handleSelectAllInColumn}
                      selectionMode={selectedCardIds.size > 0}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeClient && <PipelineCard client={activeClient} />}
                </DragOverlay>
              </DndContext>
            </>
          )}

          {/* Table/Spreadsheet View */}
          {viewMode === 'table' && (
            <PipelineSpreadsheet
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              canExport={true}
            />
          )}

          {/* Sales View */}
          {viewMode === 'sales' && (
            <SalesSpreadsheet />
          )}
        </TabsContent>

        <TabsContent value="recontato" className="mt-6">
          <RecontatoList
            clients={pipelineClients}
            onEditClient={handleEditClient}
            onNotesClient={handleNotesClick}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateClientDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={selectedClient}
      />
      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        client={selectedClient}
      />
      <LostReasonDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        clientName={pendingMove?.clientName || ''}
        onConfirm={handleLostConfirm}
      />
      <NoShowReasonDialog
        open={noShowDialogOpen}
        onOpenChange={setNoShowDialogOpen}
        clientName={pendingNoShow?.clientName || ''}
        onConfirm={handleNoShowConfirm}
      />
      <NotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        client={selectedClient}
      />
      <NegotiationDetailsDialog
        open={negotiationDialogOpen}
        onOpenChange={setNegotiationDialogOpen}
        clientName={pendingNegotiation?.clientName || ''}
        currentClinicName={pendingNegotiation?.clinicName}
        targetStage={pendingNegotiation?.targetStage || 'NEGOCIACAO'}
        onConfirm={handleNegotiationConfirm}
      />
      <ClosedDetailsDialog
        open={closedDialogOpen}
        onOpenChange={setClosedDialogOpen}
        clientName={pendingClosed?.clientName || ''}
        currentClinicName={pendingClosed?.clinicName}
        onConfirm={handleClosedConfirm}
      />
      <ManageCriativosDialog
        open={criativosDialogOpen}
        onOpenChange={setCriativosDialogOpen}
      />

      {/* Taxa de Interesse - Vendedor Selection */}
      <Dialog open={taxaDialogOpen} onOpenChange={setTaxaDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Closer responsável</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o closer responsável por <strong>{pendingTaxa?.clientName}</strong>:
          </p>
          <Select value={taxaVendedor} onValueChange={setTaxaVendedor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o closer" />
            </SelectTrigger>
            <SelectContent>
              {VENDEDOR_OPTIONS.map(v => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleTaxaConfirm} disabled={!taxaVendedor}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {selectedCardIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente os {selectedCardIds.size} leads selecionados do pipeline. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Celebration Animation */}
      <CelebrationAnimation
        show={showCelebration}
        type="sale"
        title={celebrationData ? `🎉 ${celebrationData.clientName} fechou!` : undefined}
        subtitle={celebrationData ? `Valor: ${formatBRL(celebrationData.value)}` : undefined}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Stale Recontato Alert - Shows for all commercial users */}
      <StaleRecontatoAlert />
    </div>
  );
}
