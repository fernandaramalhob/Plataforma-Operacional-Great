import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  Filter, 
  Eye, 
  Plus, 
  Rocket,
  Palette,
  Crown,
  Users2,
  ChevronDown,
  ChevronUp,
  Building2,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OperationalClient, useUpdateClientOnboardingStage } from '@/hooks/useCRMData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
}

interface CRMSpreadsheetProps {
  clients: OperationalClient[];
  teams: Team[];
  onClientSelect: (clientId: string) => void;
  onViewDetails: (client: OperationalClient) => void;
  onAddEvent: (client: OperationalClient) => void;
  onAddCreative: (client: OperationalClient) => void;
  onActivateClient: (client: OperationalClient) => void;
  selectedClientId: string | null;
  isLoading: boolean;
  onStatsChange?: (stats: { total: number; emAtivacao: number; ativos: number; encerrados: number }) => void;
}

// Status options replacing "Fase"
const STATUS_OPTIONS = [
  { value: 'EM_ATIVACAO', label: 'Em Ativação', color: 'bg-amber-500/20 text-amber-700' },
  { value: 'ATIVO', label: 'Ativo', color: 'bg-success/20 text-success' },
  { value: 'PAUSADO', label: 'Pausado', color: 'bg-blue-500/20 text-blue-700' },
  { value: 'ENCERRADO', label: 'Encerrado', color: 'bg-destructive/10 text-destructive' },
] as const;

// Package type labels
const PACOTE_LABELS: Record<string, string> = {
  COMPLETO: 'Completo',
  TRAFEGO_E_CRIATIVOS: 'Tráf. + Criativos',
  TRAFEGO_E_ARTES: 'Tráf. + Artes',
  ATENDIMENTO: 'Atendimento',
  TRAFEGO: 'Tráfego',
  CONSULTORIA_COMERCIAL: 'Consultoria',
};

// Map operational status to our display status
const getDisplayStatus = (client: OperationalClient): string => {
  if (client.status_operacional === 'ENCERRADO' || client.status_operacional === 'CHURNED') {
    return 'ENCERRADO';
  }
  if (client.status_operacional === 'PAUSADO') {
    return 'PAUSADO';
  }
  if (client.status_operacional === 'ATIVO' && client.onboarding_stage === 'ATIVO') {
    return 'ATIVO';
  }
  return 'EM_ATIVACAO';
};

const getStatusStyle = (status: string) => {
  const found = STATUS_OPTIONS.find(s => s.value === status);
  return found?.color || 'bg-muted text-muted-foreground';
};

const getStatusLabel = (status: string) => {
  const found = STATUS_OPTIONS.find(s => s.value === status);
  return found?.label || status;
};

type SortField = 'client_name' | 'created_at' | 'pacote';
type SortDirection = 'asc' | 'desc';

export function CRMSpreadsheet({
  clients,
  teams,
  onClientSelect,
  onViewDetails,
  onAddEvent,
  onAddCreative,
  onActivateClient,
  selectedClientId,
  isLoading,
  onStatsChange,
}: CRMSpreadsheetProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // 'active' hides encerrados by default
  const [teamFilter, setTeamFilter] = useState<string>(() => {
    const saved = sessionStorage.getItem('crm-team-filter');
    return saved || 'all';
  });
  const [pacoteFilter, setPacoteFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const updateOnboardingStage = useUpdateClientOnboardingStage();

  // Realtime: refresh creative lists when ad_creatives changes
  useEffect(() => {
    const channel = supabase
      .channel('crm-ad-creatives-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_creatives' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-creatives-list'] });
        queryClient.invalidateQueries({ queryKey: ['recent-creatives-badge'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch recent creatives (last 48h, only PARA_SUBIR) to show "NOVO CRIATIVO" badge
  const { data: recentCreatives = [] } = useQuery({
    queryKey: ['recent-creatives-badge'],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ad_creatives')
        .select('client_id')
        .eq('status', 'PARA_SUBIR')
        .gte('created_at', since);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const recentCreativeClientIds = useMemo(() => {
    return new Set(recentCreatives.map(c => c.client_id).filter(Boolean));
  }, [recentCreatives]);

  // Fetch pending creatives (PARA_SUBIR) grouped by client
  const { data: pendingCreatives = [] } = useQuery({
    queryKey: ['pending-creatives-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_creatives')
        .select('client_id, client_name')
        .eq('status', 'PARA_SUBIR');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const pendingCreativesByClient = useMemo(() => {
    // Build a set of client IDs that belong to the currently filtered team
    const teamClientIds = teamFilter && teamFilter !== 'all'
      ? new Set(clients.filter(c => c.team_id === teamFilter).map(c => c.id))
      : new Set(clients.map(c => c.id));

    const map = new Map<string, { client_name: string; count: number }>();
    pendingCreatives.forEach(c => {
      if (!c.client_id) return;
      if (!teamClientIds.has(c.client_id)) return;
      const existing = map.get(c.client_id);
      if (existing) {
        existing.count++;
      } else {
        map.set(c.client_id, { client_name: c.client_name, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([id, data]) => ({ client_id: id, ...data }));
  }, [pendingCreatives, clients, teamFilter]);

  // Set default team filter when teams load
  useEffect(() => {
    if (teams.length > 0 && !teamFilter) {
      const saved = sessionStorage.getItem('crm-team-filter');
      const validSaved = saved && teams.some(t => t.id === saved);
      setTeamFilter(validSaved ? saved : teams[0].id);
    }
  }, [teams, teamFilter]);

  // Persist team filter to sessionStorage
  useEffect(() => {
    if (teamFilter) {
      sessionStorage.setItem('crm-team-filter', teamFilter);
    }
  }, [teamFilter]);
  // Filter and sort clients
  const filteredClients = useMemo(() => {
    const filtered = clients
      .filter((client) => {
        const matchesSearch =
          client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const displayStatus = getDisplayStatus(client);
        let matchesStatus = true;
        if (statusFilter === 'active') {
          matchesStatus = displayStatus !== 'ENCERRADO' && displayStatus !== 'PAUSADO';
        } else if (statusFilter !== 'all') {
          matchesStatus = displayStatus === statusFilter;
        }

        const matchesTeam = !teamFilter || teamFilter === 'all' || client.team_id === teamFilter;
        const matchesPacote = pacoteFilter === 'all' || client.pacote === pacoteFilter;
        return matchesSearch && matchesStatus && matchesTeam && matchesPacote;
      });

    // If custom order exists, use it; otherwise sort normally
    if (customOrder.length > 0 && sortField === 'created_at') {
      const orderMap = new Map(customOrder.map((id, i) => [id, i]));
      return filtered.sort((a, b) => {
        const aOrder = orderMap.get(a.id) ?? 9999;
        const bOrder = orderMap.get(b.id) ?? 9999;
        if (aOrder !== 9999 || bOrder !== 9999) return aOrder - bOrder;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'client_name':
          comparison = a.client_name.localeCompare(b.client_name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'pacote':
          comparison = (a.pacote || '').localeCompare(b.pacote || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clients, searchQuery, statusFilter, teamFilter, pacoteFilter, sortField, sortDirection, customOrder]);

  // Calculate filter-aware stats and notify parent
  useEffect(() => {
    const baseFiltered = clients.filter((client) => {
      const matchesSearch =
        client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clinic_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = !teamFilter || teamFilter === 'all' || client.team_id === teamFilter;
      const matchesPacote = pacoteFilter === 'all' || client.pacote === pacoteFilter;
      return matchesSearch && matchesTeam && matchesPacote;
    });

    const emAtivacao = baseFiltered.filter(c => getDisplayStatus(c) === 'EM_ATIVACAO').length;
    const ativos = baseFiltered.filter(c => getDisplayStatus(c) === 'ATIVO').length;
    const encerrados = baseFiltered.filter(c => getDisplayStatus(c) === 'ENCERRADO').length;
    const total = emAtivacao + ativos; // Total excludes encerrados

    onStatsChange?.({ total, emAtivacao, ativos, encerrados });
  }, [clients, searchQuery, teamFilter, pacoteFilter, onStatsChange]);

  // Get unique pacotes from clients
  const uniquePacotes = useMemo(() => {
    const pacotes = new Set(clients.map(c => c.pacote).filter(Boolean));
    return Array.from(pacotes) as string[];
  }, [clients]);

  const handleSort = (field: SortField) => {
    setCustomOrder([]); // Reset custom order when sorting
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  };

  const canActivateClient = (client: OperationalClient) => {
    return !client.activated_at && client.status_operacional !== 'ATIVO';
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
  };

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    setUpdatingStageId(clientId);
    try {
      // Map display status back to DB values
      if (newStatus === 'ENCERRADO') {
        const { error } = await supabase
          .from('operational_clients')
          .update({ 
            status_operacional: 'ENCERRADO', 
            onboarding_stage: 'ATIVO',
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);
        if (error) throw error;
      } else if (newStatus === 'PAUSADO') {
        const { error } = await supabase
          .from('operational_clients')
          .update({ 
            status_operacional: 'PAUSADO',
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);
        if (error) throw error;
      } else if (newStatus === 'ATIVO') {
        await updateOnboardingStage.mutateAsync({ clientId, stage: 'ATIVO' });
      } else {
        // EM_ATIVACAO - set to onboarding
        await updateOnboardingStage.mutateAsync({ clientId, stage: 'ONBOARDING' });
      }
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStageId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOrder = [...filteredClients.map(c => c.id)];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setCustomOrder(newOrder);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou clínica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-2 border-0"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-surface-2 border-0">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos + Em Ativação</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="EM_ATIVACAO">Em Ativação</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="PAUSADO">Pausado</SelectItem>
            <SelectItem value="ENCERRADO">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[160px] bg-surface-2 border-0">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Equipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pacoteFilter} onValueChange={setPacoteFilter}>
          <SelectTrigger className="w-[160px] bg-surface-2 border-0">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Pacote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos pacotes</SelectItem>
            {uniquePacotes.map((pacote) => (
              <SelectItem key={pacote} value={pacote}>
                {PACOTE_LABELS[pacote] || pacote}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredClients.length} cliente(s)
        </span>
      </div>

      {/* Criativos Pendentes */}
      {pendingCreativesByClient.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Criativos pendentes</h3>
          </div>
          <div className="space-y-1.5">
            {pendingCreativesByClient.map((item) => (
              <div
                key={item.client_id}
                className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/operacional/crm/cliente/${item.client_id}`)}
              >
                <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground">{item.client_name}</span>
                <span>—</span>
                <span>{item.count} criativo(s) aprovados para subir</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[1050px]">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead
                    className="w-[180px] font-semibold cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('client_name')}
                  >
                    <div className="flex items-center gap-1">
                      CLIENTE
                      <SortIcon field="client_name" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold">STATUS</TableHead>
                  <TableHead
                    className="w-[120px] font-semibold cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('pacote')}
                  >
                    <div className="flex items-center gap-1">
                      PACOTE
                      <SortIcon field="pacote" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px] font-semibold">TIER</TableHead>
                  <TableHead className="w-[120px] font-semibold">EQUIPE</TableHead>
                  <TableHead
                    className="w-[100px] font-semibold cursor-pointer hover:bg-muted/70"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      ENTRADA
                      <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Carregando clientes...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client, index) => {
                    const displayStatus = getDisplayStatus(client);
                    return (
                      <TableRow 
                        key={client.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedClientId === client.id
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/30",
                          draggedIndex === index && "opacity-50"
                        )}
                        onClick={() => onViewDetails(client)}
                      >
                        {/* DRAG HANDLE */}
                        <TableCell className="px-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                        </TableCell>

                        {/* CLIENTE */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className={cn(
                                "text-left hover:underline hover:text-primary transition-colors",
                                selectedClientId === client.id && "text-primary"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(client);
                              }}
                            >
                              {client.client_name}
                            </button>
                            {recentCreativeClientIds.has(client.id) && (
                              <span className="animate-pulse inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground border border-accent-foreground/20 whitespace-nowrap">
                                🎨 NOVO CRIATIVO
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* STATUS */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={displayStatus}
                            onValueChange={(value) => handleStatusChange(client.id, value)}
                            disabled={updatingStageId === client.id}
                          >
                            <SelectTrigger className={cn(
                              "h-7 text-xs w-[130px] gap-1 border border-border/50 hover:border-border hover:bg-muted/50 transition-colors",
                              getStatusStyle(displayStatus)
                            )}>
                              {updatingStageId === client.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue>{getStatusLabel(displayStatus)}</SelectValue>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className={cn("text-xs px-1.5 py-0.5 rounded", opt.color)}>
                                    {opt.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* PACOTE */}
                        <TableCell>
                          {client.pacote ? (
                            <Badge variant="secondary" className="text-xs font-normal bg-primary/10 text-primary border-0">
                              {PACOTE_LABELS[client.pacote] || client.pacote}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>

                        {/* TIER */}
                        <TableCell>
                          {client.client_tier ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
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
                              {client.client_tier === 'PREMIUM' ? 'Premium' : 'Popular'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>

                        {/* EQUIPE */}
                        <TableCell className="text-sm">
                          {getTeamName(client.team_id)}
                        </TableCell>

                        {/* ENTRADA */}
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(client.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>

                        {/* AÇÕES */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {canActivateClient(client) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onActivateClient(client);
                                }}
                                title="Ativar cliente"
                              >
                                <Rocket className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(client);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddCreative(client);
                              }}
                              title="Adicionar criativo"
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddEvent(client);
                              }}
                              title="Adicionar evento"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
