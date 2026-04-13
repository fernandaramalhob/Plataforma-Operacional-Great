import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RaioXFilters, getDefaultRaioXFilter, filterClientByRaioX, type RaioXFilterState, type RaioXFilterMode } from '@/components/comercial/RaioXFilters';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, LineChart } from 'recharts';
import { TrendingUp, Crosshair, Award, Filter, X, ChevronRight, Phone, Package, Users, DollarSign, Calendar as CalendarLucide, User, Building2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardClosersTab } from '@/components/comercial/DashboardClosersTab';
import { parseISO, format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL, formatBRLShort } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const FATURAMENTO_LABELS: Record<string, string> = {
  '0_A_15K': 'R$ 0 - 15K',
  '0_10K': 'R$ 0 - 10K',
  '15K_A_30K': 'R$ 15K - 30K',
  '15K_MAIS': 'R$ 15K+',
  '30K_A_50K': 'R$ 30K - 50K',
  '50K_A_100K': 'R$ 50K - 100K',
  '100K_PLUS': 'R$ 100K+',
  'NAO_INFORMADO': 'Não informado',
  'PERSONALIZADO': 'Personalizado',
};

interface PipelineClient {
  id: string;
  client_name: string;
  clinic_name: string | null;
  telefone: string | null;
  stage: string | null;
  agendado_por: string | null;
  vendedor: string | null;
  criativo: string | null;
  faturamento: string | null;
  faturamento_personalizado: string | null;
  meeting_time: string | null;
  meeting_date: string | null;
  entrada: number | null;
  created_at: string;
  last_stage_change: string | null;
  data_entrada: string | null;
  periodo: string | null;
  equipe: string | null;
  pacote: string | null;
  tem_mkt: string | null;
  tem_socio: string | null;
  tem_secretaria: string | null;
  salao_ou_clinica: string | null;
  pode_investir: string | null;
  lost_reason: string | null;
  no_show_reason: string | null;
  notes: string | null;
  indicacao: string | null;
  pagador_anuncio: string | null;
}

// ── Closed deals detail dialog ───────────────────────────────────────────────
const FATURAMENTO_LABELS_INLINE: Record<string, string> = {
  '0_A_15K': 'R$ 0–15K', '0_10K': 'R$ 0–10K', '15K_A_30K': 'R$ 15K–30K',
  '15K_MAIS': 'R$ 15K+', '30K_A_50K': 'R$ 30K–50K', '50K_A_100K': 'R$ 50K–100K',
  '100K_PLUS': 'R$ 100K+', 'NAO_INFORMADO': 'Não informado', 'PERSONALIZADO': 'Personalizado',
};

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  if (!value || value === 'NAO_INFORMADO' || value === '') return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0 min-w-[120px]">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ClosedDealsDialog({
  closer,
  clients,
  open,
  onOpenChange,
}: {
  closer: string;
  clients: PipelineClient[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deals = clients.filter(c => c.vendedor === closer && c.stage === 'FECHADO');
  const totalReceita = deals.reduce((s, c) => s + (c.entrada || 0), 0);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try { return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR }); } catch { return dateStr; }
  };

  const yesNo = (v: string | null) => {
    if (!v) return null;
    if (v === 'SIM') return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs">Sim</Badge>;
    if (v === 'NAO') return <Badge variant="outline" className="text-xs">Não</Badge>;
    return v;
  };

  const STAGE_LABELS: Record<string, string> = {
    FECHADO: 'Fechado', PERDIDO: 'Perdido', NEGOCIACAO: 'Em negociação',
    TAXA_INTERESSE: 'Taxa de interesse', NO_SHOW: 'No Show', NOVO: 'Novo',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Award className="h-6 w-6 text-amber-500" />
            Vendas de <span className="text-primary">{closer}</span>
            <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 ml-1">
              {deals.length} {deals.length === 1 ? 'venda' : 'vendas'}
            </Badge>
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>Receita total: <span className="font-bold text-emerald-600">{formatBRL(totalReceita)}</span></span>
            <span>Ticket médio: <span className="font-semibold text-foreground">{deals.length > 0 ? formatBRL(totalReceita / deals.length) : '–'}</span></span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {deals.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma venda fechada no período selecionado.</p>
          ) : (
            <div className="space-y-4 pb-4">
              {deals.map((deal, idx) => (
                <div
                  key={deal.id}
                  className="rounded-lg border bg-card p-4 space-y-3 hover:bg-accent/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 text-xs font-bold shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-base leading-tight">{deal.client_name}</p>
                        {deal.clinic_name && <p className="text-xs text-muted-foreground">{deal.clinic_name}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-600 text-lg">{formatBRL(deal.entrada || 0)}</p>
                      {deal.pacote && <Badge variant="outline" className="text-xs mt-0.5">{deal.pacote}</Badge>}
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2 border-t">
                    <InfoRow label="Telefone" value={deal.telefone} icon={<Phone className="h-3.5 w-3.5" />} />
                    <InfoRow label="SDR (Agendou)" value={deal.agendado_por} icon={<User className="h-3.5 w-3.5" />} />
                    <InfoRow label="Equipe" value={deal.equipe} icon={<Users className="h-3.5 w-3.5" />} />
                    <InfoRow label="Criativo" value={deal.criativo} icon={<Info className="h-3.5 w-3.5" />} />
                    <InfoRow
                      label="Faturamento"
                      value={deal.faturamento === 'PERSONALIZADO' && deal.faturamento_personalizado
                        ? deal.faturamento_personalizado
                        : (FATURAMENTO_LABELS_INLINE[deal.faturamento || ''] || deal.faturamento)}
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                    />
                    <InfoRow label="Pode investir" value={deal.pode_investir} icon={<DollarSign className="h-3.5 w-3.5" />} />
                    <InfoRow label="Pacote" value={deal.pacote} icon={<Package className="h-3.5 w-3.5" />} />
                    <InfoRow label="Pagador anúncio" value={deal.pagador_anuncio === 'CLIENTE' ? 'Cliente' : deal.pagador_anuncio === 'GREAT' ? 'Great' : deal.pagador_anuncio} />
                    <InfoRow
                      label="Data reunião"
                      value={deal.meeting_date ? `${deal.meeting_date}${deal.meeting_time ? ' às ' + deal.meeting_time : ''}` : null}
                      icon={<CalendarLucide className="h-3.5 w-3.5" />}
                    />
                    <InfoRow label="Data fechamento" value={formatDate(deal.last_stage_change)} icon={<CalendarLucide className="h-3.5 w-3.5" />} />
                    <InfoRow label="Data entrada" value={formatDate(deal.data_entrada)} />
                    <InfoRow label="Salão ou clínica" value={deal.salao_ou_clinica === 'SALAO' ? 'Salão' : deal.salao_ou_clinica === 'CLINICA' ? 'Clínica' : deal.salao_ou_clinica === 'AMBOS' ? 'Ambos' : null} icon={<Building2 className="h-3.5 w-3.5" />} />
                    <InfoRow label="Tem sócio" value={yesNo(deal.tem_socio)} />
                    <InfoRow label="Tem mkt" value={yesNo(deal.tem_mkt)} />
                    <InfoRow label="Tem secretária" value={yesNo(deal.tem_secretaria)} />
                    <InfoRow label="Indicação" value={deal.indicacao} />
                    <InfoRow label="Período" value={deal.periodo} />
                  </div>

                  {deal.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Observações:</p>
                      <p className="text-sm text-foreground bg-muted/50 rounded p-2">{deal.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ── Mini per-card filter ─────────────────────────────────────────────────────
function CardFilter({
  value,
  onChange,
  onClear,
}: {
  value: RaioXFilterState | null;
  onChange: (v: RaioXFilterState) => void;
  onClear: () => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const current = value ?? getDefaultRaioXFilter();

  const getLabel = () => {
    const d = current.date;
    switch (current.mode) {
      case 'all': return 'Tudo';
      case 'month': return format(d, "MMM/yy", { locale: ptBR });
      case 'week': {
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        return `${format(ws, 'dd/MM')}–${format(we, 'dd/MM')}`;
      }
      case 'day': return format(d, "dd/MM/yy", { locale: ptBR });
    }
  };

  const navigate = (delta: number) => {
    const newDate = new Date(current.date);
    if (current.mode === 'month') newDate.setMonth(newDate.getMonth() + delta);
    else if (current.mode === 'week') newDate.setDate(newDate.getDate() + delta * 7);
    else newDate.setDate(newDate.getDate() + delta);
    onChange({ ...current, date: newDate });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
      <Select
        value={current.mode}
        onValueChange={(m) => onChange({ ...current, mode: m as RaioXFilterMode })}
      >
        <SelectTrigger className="h-7 w-[90px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mês</SelectItem>
          <SelectItem value="week">Semana</SelectItem>
          <SelectItem value="day">Dia</SelectItem>
          <SelectItem value="all">Tudo</SelectItem>
        </SelectContent>
      </Select>

      {current.mode !== 'all' && (
        <>
          <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => navigate(-1)}>‹</Button>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-7 px-2 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {getLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={current.date}
                onSelect={(d) => { if (d) { onChange({ ...current, date: d }); setCalOpen(false); } }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-7 w-7 text-xs" onClick={() => navigate(1)}>›</Button>
        </>
      )}

      {value && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClear} title="Resetar filtro">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── Helper to filter allClients for a specific closer with optional override ──
function filterForCloser(
  allClients: PipelineClient[],
  closer: string,
  chartFilter: RaioXFilterState | null,
  globalFilter: RaioXFilterState,
): PipelineClient[] {
  const f = chartFilter ?? globalFilter;
  return allClients.filter(c => {
    if (c.vendedor !== closer) return false;
    const dateToFilter = c.meeting_date
      ? c.meeting_date + 'T12:00:00'
      : (c.data_entrada || c.created_at);
    return filterClientByRaioX(dateToFilter, f);
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RaioXCloser() {
  const [filter, setFilter] = useState<RaioXFilterState>(getDefaultRaioXFilter);
  // Per-closer chart filter overrides (null = use global)
  const [chartFilters, setChartFilters] = useState<Record<string, RaioXFilterState | null>>({});
  // Toggleable closers for the evolution line chart
  const [hiddenClosers, setHiddenClosers] = useState<Set<string>>(new Set());
  // Expanded "outros motivos" per closer
  const [expandedLost, setExpandedLost] = useState<Set<string>>(new Set());
  const [selectedCloser, setSelectedCloser] = useState<string | null>(null);

  // Fetch ALL pipeline clients (including those without vendedor, for Dashboard Closers)
  const { data: allPipelineClients = [] } = useQuery({
    queryKey: ['raio-x-closer-all-pipeline-v4'],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      let all: PipelineClient[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('pipeline_clients')
          .select('*')
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all = all.concat(data as PipelineClient[]);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  // For Raio X tab, only clients with vendedor assigned
  const allClients = useMemo(() =>
    allPipelineClients.filter(c => c.vendedor != null),
    [allPipelineClients]
  );

  const clients = useMemo(() =>
    allClients.filter(c => {
      const dateToFilter = c.meeting_date
        ? c.meeting_date + 'T12:00:00'
        : (c.data_entrada || c.created_at);
      return filterClientByRaioX(dateToFilter, filter);
    }),
    [allClients, filter]
  );

  // All pipeline clients (including without vendedor) filtered by period — for Dashboard Closers
  const allClientsForDashboard = useMemo(() =>
    allPipelineClients.filter(c => {
      const dateToFilter = c.meeting_date
        ? c.meeting_date + 'T12:00:00'
        : (c.data_entrada || c.created_at);
      return filterClientByRaioX(dateToFilter, filter);
    }),
    [allPipelineClients, filter]
  );

  // All closers present in the globally-filtered dataset
  const closers = useMemo(() =>
    [...new Set(allClients.map(c => c.vendedor).filter(Boolean))].sort() as string[],
    [allClients]
  );

  const setChartFilter = useCallback((closer: string, f: RaioXFilterState | null) => {
    setChartFilters(prev => ({ ...prev, [closer]: f }));
  }, []);

  const toggleCloser = useCallback((closer: string) => {
    setHiddenClosers(prev => {
      const next = new Set(prev);
      if (next.has(closer)) next.delete(closer);
      else next.add(closer);
      return next;
    });
  }, []);

  // ── Ranking table (uses global filter via filterForCloser for correct meeting_date priority) ──
  const closerStats = useMemo(() => {
    return closers.map(closer => {
      const allLeads = filterForCloser(allClients, closer, null, filter);
      const fechados = allLeads.filter(c => c.stage === 'FECHADO');
      const taxaInteresse = allLeads.filter(c => c.stage === 'TAXA_INTERESSE');
      const perdidos = allLeads.filter(c => c.stage === 'PERDIDO');
      const noShows = allLeads.filter(c => c.stage === 'NO_SHOW');
      const negociacao = allLeads.filter(c => c.stage === 'NEGOCIACAO');
      const receitaFechados = fechados.reduce((sum, c) => sum + (c.entrada || 0), 0);
      const receitaTaxa = taxaInteresse.reduce((sum, c) => sum + (c.entrada || 0), 0);
      const receita = receitaFechados + receitaTaxa;
      const ticketMedio = fechados.length > 0 ? receitaFechados / fechados.length : 0;
      // total = todos os leads do closer no período (incluindo PERDIDO e NOVO)
      const total = allLeads.length;

      return {
        closer,
        total,
        fechados: fechados.length,
        perdidos: perdidos.length,
        noShows: noShows.length,
        negociacao: negociacao.length,
        receita,
        ticketMedio,
        taxaConversao: total > 0 ? ((fechados.length / total) * 100).toFixed(1) : '0',
        taxaPerdido: total > 0 ? ((perdidos.length / total) * 100).toFixed(1) : '0',
      };
    }).sort((a, b) => b.receita - a.receita);
  }, [allClients, closers, filter]);

  // ── Monthly evolution (uses ALL allClients, no date filter – shows history) ─
  const monthlyEvolution = useMemo(() => {
    const months: Record<string, Record<string, { fechados: number; receita: number }>> = {};
    allClients.filter(c => c.stage === 'FECHADO' && (c.last_stage_change || c.created_at))
      .forEach(c => {
        const date = c.last_stage_change || c.created_at;
        try {
          const d = parseISO(date);
          const key = format(d, 'yyyy-MM');
          const closer = c.vendedor || 'N/A';
          if (!months[key]) months[key] = {};
          if (!months[key][closer]) months[key][closer] = { fechados: 0, receita: 0 };
          months[key][closer].fechados++;
          months[key][closer].receita += c.entrada || 0;
        } catch {}
      });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => {
        const entry: Record<string, unknown> = { month: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }) };
        closers.forEach(c => {
          entry[c] = data[c]?.fechados || 0;
        });
        return entry;
      });
  }, [allClients, closers]);

  // ── Per-closer computed data (uses per-chart filter override) ───────────────
  // These are computed per-render based on the chart-specific filter
  const getChartClients = useCallback((closer: string) =>
    filterForCloser(allClients, closer, chartFilters[closer] ?? null, filter),
    [allClients, chartFilters, filter]
  );

  const criativoPerCloser = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer).filter(c => c.criativo);
    const grouped: Record<string, { total: number; fechados: number; receita: number }> = {};
    leads.forEach(l => {
      const key = l.criativo || 'N/A';
      if (!grouped[key]) grouped[key] = { total: 0, fechados: 0, receita: 0 };
      grouped[key].total++;
      if (l.stage === 'FECHADO') grouped[key].fechados++;
      if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[key].receita += l.entrada || 0;
    });
    return {
      closer,
      criativos: Object.entries(grouped)
        .map(([name, v]) => ({ name, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
        .sort((a, b) => b.fechados - a.fechados),
    };
  }), [closers, getChartClients]);

  const faturamentoPerCloser = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer).filter(c => c.faturamento);
    const grouped: Record<string, { total: number; fechados: number; receita: number }> = {};
    leads.forEach(l => {
      const key = l.faturamento || 'N/A';
      if (!grouped[key]) grouped[key] = { total: 0, fechados: 0, receita: 0 };
      grouped[key].total++;
      if (l.stage === 'FECHADO') grouped[key].fechados++;
      if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[key].receita += l.entrada || 0;
    });
    return {
      closer,
      faturamentos: Object.entries(grouped)
        .map(([name, v]) => ({ name: FATURAMENTO_LABELS[name] || name, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
        .sort((a, b) => Number(b.taxa) - Number(a.taxa)),
    };
  }), [closers, getChartClients]);

  const horarioPerCloser = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer).filter(c => c.meeting_time);
    const grouped: Record<string, { total: number; fechados: number }> = {};
    leads.forEach(l => {
      const hour = l.meeting_time!.slice(0, 2) + ':00';
      if (!grouped[hour]) grouped[hour] = { total: 0, fechados: 0 };
      grouped[hour].total++;
      if (l.stage === 'FECHADO') grouped[hour].fechados++;
    });
    return {
      closer,
      horarios: Object.entries(grouped)
        .map(([hora, v]) => ({ hora, ...v, taxa: v.total > 0 ? Number(((v.fechados / v.total) * 100).toFixed(1)) : 0 }))
        .sort((a, b) => a.hora.localeCompare(b.hora)),
    };
  }), [closers, getChartClients]);

  const lostReasonsPerCloser = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer).filter(c => c.stage === 'PERDIDO' && c.lost_reason);
    const grouped: Record<string, number> = {};
    leads.forEach(l => { grouped[l.lost_reason || 'Sem motivo'] = (grouped[l.lost_reason || 'Sem motivo'] || 0) + 1; });
    return {
      closer,
      reasons: Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }), [closers, getChartClients]);

  const sdrSourcePerCloser = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer).filter(c => c.agendado_por);
    const grouped: Record<string, { total: number; fechados: number; receita: number }> = {};
    leads.forEach(l => {
      const key = l.agendado_por || 'N/A';
      if (!grouped[key]) grouped[key] = { total: 0, fechados: 0, receita: 0 };
      grouped[key].total++;
      if (l.stage === 'FECHADO') grouped[key].fechados++;
      if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[key].receita += l.entrada || 0;
    });
    return {
      closer,
      sdrs: Object.entries(grouped)
        .map(([name, v]) => ({ name, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
        .sort((a, b) => b.fechados - a.fechados),
    };
  }), [closers, getChartClients]);

  const pacoteAnalysis = useMemo(() => closers.map(closer => {
    const leads = getChartClients(closer);
    const grouped: Record<string, { total: number; fechados: number }> = {};
    leads.forEach(c => {
      const pacote = c.pacote || 'N/A';
      if (!grouped[pacote]) grouped[pacote] = { total: 0, fechados: 0 };
      grouped[pacote].total++;
      if (c.stage === 'FECHADO') grouped[pacote].fechados++;
    });
    return {
      closer,
      pacotes: Object.entries(grouped).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.fechados - a.fechados),
    };
  }), [closers, getChartClients]);

  // ── Helper label for active chart filter ────────────────────────────────────
  const getFilterLabel = (f: RaioXFilterState) => {
    switch (f.mode) {
      case 'all': return 'Todo período';
      case 'month': return format(f.date, "MMM/yy", { locale: ptBR });
      case 'week': {
        const ws = startOfWeek(f.date, { weekStartsOn: 1 });
        const we = endOfWeek(f.date, { weekStartsOn: 1 });
        return `${format(ws, 'dd/MM')}–${format(we, 'dd/MM')}`;
      }
      case 'day': return format(f.date, "dd/MM/yy", { locale: ptBR });
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-rose-500" />
          Raio X — Closer
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise completa da performance dos Closers: criativos, faturamento, horários, motivos de perda e mais
        </p>
        <div className="mt-3">
          <RaioXFilters value={filter} onChange={setFilter} />
        </div>
      </div>

      <Tabs defaultValue="raio-x" className="w-full">
        <TabsList>
          <TabsTrigger value="raio-x">Raio X</TabsTrigger>
          <TabsTrigger value="dashboard-closers">Dashboard Closers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard-closers" className="mt-4">
          <DashboardClosersTab clients={allClientsForDashboard} />
        </TabsContent>

        <TabsContent value="raio-x" className="mt-4 space-y-6">

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Ranking Geral dos Closers
          </CardTitle>
          <p className="text-xs text-muted-foreground">Clique em um closer para ver os detalhes das vendas fechadas</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Closer</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Fechados</TableHead>
                <TableHead className="text-center">Perdidos</TableHead>
                <TableHead className="text-center">Negociação</TableHead>
                <TableHead className="text-center">Conversão</TableHead>
                <TableHead className="text-center">Ticket Médio</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closerStats.map((s, i) => (
                <TableRow
                  key={s.closer}
                  className="cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => setSelectedCloser(s.closer)}
                >
                  <TableCell className="font-medium">
                    {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}{s.closer}
                  </TableCell>
                  <TableCell className="text-center">{s.total}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-600">{s.fechados}</TableCell>
                  <TableCell className="text-center text-red-500">{s.perdidos}</TableCell>
                  <TableCell className="text-center text-amber-500">{s.negociacao}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">{s.taxaConversao}%</Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatBRLShort(s.ticketMedio)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">{formatBRL(s.receita)}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Closed Deals Dialog */}
      {selectedCloser && (
        <ClosedDealsDialog
          closer={selectedCloser}
          clients={clients}
          open={!!selectedCloser}
          onOpenChange={(v) => { if (!v) setSelectedCloser(null); }}
        />
      )}

      {/* Monthly evolution — Line Chart with toggleable closers */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Evolução Mensal de Fechamentos por Closer
            </CardTitle>
            {/* Toggle chips */}
            <div className="flex flex-wrap gap-2">
              {closers.map((c, i) => {
                const color = COLORS[i % COLORS.length];
                const hidden = hiddenClosers.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCloser(c)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                      hidden
                        ? 'opacity-40 border-border bg-muted text-muted-foreground'
                        : 'border-transparent text-white'
                    )}
                    style={hidden ? {} : { background: color }}
                    title={hidden ? `Mostrar ${c}` : `Ocultar ${c}`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: hidden ? color : 'white' }}
                    />
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyEvolution} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                {closers.map((c, i) =>
                  hiddenClosers.has(c) ? null : (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                      activeDot={{ r: 6 }}
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-4">Sem dados</p>
          )}
        </CardContent>
      </Card>

      {/* SDR source per closer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sdrSourcePerCloser.map(sc => (
          <Card key={sc.closer}>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base">🤝 SDRs → {sc.closer}</CardTitle>
                <CardFilter
                  value={chartFilters[sc.closer] ?? null}
                  onChange={(f) => setChartFilter(sc.closer, f)}
                  onClear={() => setChartFilter(sc.closer, null)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {chartFilters[sc.closer] && (
                <p className="text-xs text-muted-foreground mb-2">
                  Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[sc.closer]!)}</span>
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SDR</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sc.sdrs.map(s => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{s.fechados}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-indigo-500/20 text-indigo-600 border-indigo-500/30">{s.taxa}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Criativo per closer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {criativoPerCloser.map(cp => (
          <Card key={cp.closer}>
            <CardHeader>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base">🎨 Criativos que mais fecham — {cp.closer}</CardTitle>
                <CardFilter
                  value={chartFilters[cp.closer] ?? null}
                  onChange={(f) => setChartFilter(cp.closer, f)}
                  onClear={() => setChartFilter(cp.closer, null)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {chartFilters[cp.closer] && (
                <p className="text-xs text-muted-foreground mb-2">
                  Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[cp.closer]!)}</span>
                </p>
              )}
              {cp.criativos.length > 0 ? (
                <>
                  <div className="flex items-center gap-5 mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#6366f1' }} />
                      Total de leads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#10b981' }} />
                      Fechados
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(220, cp.criativos.slice(0, 10).length * 38)}>
                    <BarChart
                      data={cp.criativos.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + '…' : v}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'total' ? 'Total de leads' : 'Fechados',
                        ]}
                        labelFormatter={(label: string) => `Criativo: ${label}`}
                      />
                      <Bar dataKey="total" fill="#6366f1" name="total" radius={[0, 4, 4, 0]} barSize={13} />
                      <Bar dataKey="fechados" fill="#10b981" name="fechados" radius={[0, 4, 4, 0]} barSize={13} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Faturamento per closer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {faturamentoPerCloser.map(fp => (
          <Card key={fp.closer}>
            <CardHeader>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base">💰 Faturamento que mais converte — {fp.closer}</CardTitle>
                <CardFilter
                  value={chartFilters[fp.closer] ?? null}
                  onChange={(f) => setChartFilter(fp.closer, f)}
                  onClear={() => setChartFilter(fp.closer, null)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {chartFilters[fp.closer] && (
                <p className="text-xs text-muted-foreground mb-2">
                  Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[fp.closer]!)}</span>
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faturamento</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fp.faturamentos.map(f => (
                    <TableRow key={f.name}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-center">{f.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{f.fechados}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={Number(f.taxa) >= 30 ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>{f.taxa}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Horário per closer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {horarioPerCloser.map(hp => (
          <Card key={hp.closer}>
            <CardHeader>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base">🕐 Performance por Horário — {hp.closer}</CardTitle>
                <CardFilter
                  value={chartFilters[hp.closer] ?? null}
                  onChange={(f) => setChartFilter(hp.closer, f)}
                  onClear={() => setChartFilter(hp.closer, null)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {chartFilters[hp.closer] && (
                <p className="text-xs text-muted-foreground mb-2">
                  Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[hp.closer]!)}</span>
                </p>
              )}
              {hp.horarios.length > 0 ? (
                <>
                  <div className="flex items-center gap-5 mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#6366f1' }} />
                      Total de leads
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#10b981' }} />
                      Fechados
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f59e0b' }} />
                      Taxa de conversão (%)
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={hp.horarios}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'taxa' ? `${value}%` : value,
                          name === 'total' ? 'Total de leads' : name === 'fechados' ? 'Fechados' : 'Taxa de conversão',
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="total" fill="#6366f1" name="total" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar yAxisId="left" dataKey="fechados" fill="#10b981" name="fechados" radius={[4, 4, 0, 0]} barSize={14} />
                      <Line yAxisId="right" dataKey="taxa" stroke="#f59e0b" name="taxa" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lost reasons per closer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lostReasonsPerCloser.filter(lr => lr.reasons.length > 0).map(lr => {
          const total = lr.reasons.reduce((s, r) => s + r.value, 0);
          const isExpanded = expandedLost.has(lr.closer);
          const visibleReasons = isExpanded ? lr.reasons : lr.reasons.slice(0, 12);
          const hiddenCount = lr.reasons.length - 12;
          return (
            <Card key={lr.closer}>
              <CardHeader>
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    ❌ Motivos de Perda — {lr.closer}
                    <span className="text-xs font-normal text-muted-foreground ml-1">({total} perdidos)</span>
                  </CardTitle>
                  <CardFilter
                    value={chartFilters[lr.closer] ?? null}
                    onChange={(f) => setChartFilter(lr.closer, f)}
                    onClear={() => setChartFilter(lr.closer, null)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {chartFilters[lr.closer] && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[lr.closer]!)}</span>
                  </p>
                )}
                <div className="space-y-2">
                  {visibleReasons.map((r, i) => {
                    const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
                    return (
                      <div key={r.name} className="flex items-center gap-2 group">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span
                          className="text-xs text-muted-foreground truncate flex-1 group-hover:text-foreground transition-colors"
                          title={r.name}
                        >
                          {r.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: COLORS[i % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-10 text-right tabular-nums">
                            {r.value}× <span className="text-muted-foreground font-normal">({pct}%)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <button
                      className="text-xs text-primary hover:underline pt-1 text-left w-full cursor-pointer"
                      onClick={() => setExpandedLost(prev => {
                        const next = new Set(prev);
                        if (isExpanded) next.delete(lr.closer); else next.add(lr.closer);
                        return next;
                      })}
                    >
                      {isExpanded ? '▲ Ocultar motivos extras' : `▼ + ${hiddenCount} outros motivos`}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pacote analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pacoteAnalysis.map(pa => (
          <Card key={pa.closer}>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-base">📦 Pacotes — {pa.closer}</CardTitle>
                <CardFilter
                  value={chartFilters[pa.closer] ?? null}
                  onChange={(f) => setChartFilter(pa.closer, f)}
                  onClear={() => setChartFilter(pa.closer, null)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {chartFilters[pa.closer] && (
                <p className="text-xs text-muted-foreground mb-2">
                  Filtro próprio: <span className="font-medium text-foreground">{getFilterLabel(chartFilters[pa.closer]!)}</span>
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pacote</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pa.pacotes.map(p => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center">{p.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{p.fechados}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
