import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Search,
  Loader2,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperationalClients, OperationalClient } from '@/hooks/useCRMData';
import { useSectorAccess, AccessDeniedMessage } from '@/hooks/useSectorAccess';

// Package type labels
const PACOTE_LABELS: Record<string, string> = {
  COMPLETO: 'Completo',
  TRAFEGO_E_CRIATIVOS: 'Tráfego e Criativos',
  TRAFEGO_E_ARTES: 'Tráfego e Artes',
  ATENDIMENTO: 'Atendimento',
  TRAFEGO: 'Tráfego',
  CONSULTORIA_COMERCIAL: 'Consultoria Comercial',
};

// Period labels
const PLAN_LABELS: Record<string, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
};

const stageLabels: Record<string, string> = {
  'NAO_INICIADO': 'Não Iniciado',
  'EM_ANDAMENTO': 'Em Andamento',
  'OK': 'OK',
  'BLOQUEADO': 'Bloqueado',
};

const stageColors: Record<string, string> = {
  'NAO_INICIADO': 'bg-surface-2 text-muted-foreground border-border',
  'EM_ANDAMENTO': 'bg-info/10 text-info border-info/20',
  'OK': 'bg-success/10 text-success border-success/20',
  'BLOQUEADO': 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function ClientesAtendimento() {
  const { hasAccessToSector } = useSectorAccess();
  const { data: clients, isLoading } = useOperationalClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Check access
  if (!hasAccessToSector('atendimento')) {
    return <AccessDeniedMessage sector="Atendimento" />;
  }

  const operationalClients = clients || [];

  const filteredClients = operationalClients.filter(client => {
    const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || client.stage_atendimento === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Calculate stats by stage
  const stats = {
    total: operationalClients.length,
    naoIniciado: operationalClients.filter(c => c.stage_atendimento === 'NAO_INICIADO' || !c.stage_atendimento).length,
    emAndamento: operationalClients.filter(c => c.stage_atendimento === 'EM_ANDAMENTO').length,
    ok: operationalClients.filter(c => c.stage_atendimento === 'OK').length,
    bloqueado: operationalClients.filter(c => c.stage_atendimento === 'BLOQUEADO').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h1 className="text-h1 text-foreground">Atendimento</h1>
            <p className="text-body text-muted-foreground">Gestão de atendimento por cliente</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-caption text-muted-foreground">Total</p>
            </div>
            <p className="text-h2 text-foreground mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-caption text-muted-foreground">Não Iniciado</p>
            </div>
            <p className="text-h2 text-muted-foreground mt-1">{stats.naoIniciado}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-info" />
              <p className="text-caption text-muted-foreground">Em Andamento</p>
            </div>
            <p className="text-h2 text-info mt-1">{stats.emAndamento}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-caption text-muted-foreground">OK</p>
            </div>
            <p className="text-h2 text-success mt-1">{stats.ok}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-caption text-muted-foreground">Bloqueado</p>
            </div>
            <p className="text-h2 text-destructive mt-1">{stats.bloqueado}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
            <SelectValue placeholder="Estágio" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todos os estágios</SelectItem>
            <SelectItem value="NAO_INICIADO">Não Iniciado</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-body text-muted-foreground">Nenhum cliente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <AttendanceClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceClientCard({ client }: { client: OperationalClient }) {
  const stage = client.stage_atendimento || 'NAO_INICIADO';
  
  return (
    <Card className="bg-card border-border hover:border-warning/50 transition-colors cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-body font-medium text-foreground truncate">
              {client.client_name}
            </CardTitle>
            {client.clinic_name && (
              <p className="text-caption text-muted-foreground truncate">{client.clinic_name}</p>
            )}
          </div>
          <Badge variant="outline" className={cn('text-caption shrink-0', stageColors[stage])}>
            {stageLabels[stage]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-caption">
          <span className="text-muted-foreground">
            Pacote: {client.pacote 
              ? (PACOTE_LABELS[client.pacote] || client.pacote)
              : (client.plan ? (PACOTE_LABELS[client.plan] || PLAN_LABELS[client.plan] || client.plan) : 'N/A')}
          </span>
          <span className="font-medium text-foreground">
            R$ {(client.deal_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
