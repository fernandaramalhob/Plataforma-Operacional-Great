import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgendamentoLead, FATURAMENTO_OPTIONS, HORARIO_OPTIONS, SALAO_OU_CLINICA_OPTIONS, FUNIL_OPTIONS } from '@/hooks/useAgendamentoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { Users, TrendingUp, Clock, Building2, DollarSign, Target, UserCheck, UserX, Loader2, Star, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendamentoDashboardProps {
  leads: AgendamentoLead[];
  selectedDay?: Date;
  selectedMonth?: string;
  selectedMonthRange?: { startDate: Date; endDate: Date } | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Agendamento statuses that indicate a completed appointment (meeting happened)
const COMPLETED_STATUSES = [
  'NEGOCIACAO',
  'TAXA_INTERESSE',
  'PERDIDO',
  'FECHADO',
];

// SDRs for radar chart
const SDRS = ['MIGUEL', 'HEBERT'];
const SDR_COLORS: Record<string, string> = {
  'MIGUEL': '#3B82F6',
  'HEBERT': '#F59E0B',
};

export function AgendamentoDashboard({ leads, selectedDay, selectedMonth, selectedMonthRange }: AgendamentoDashboardProps) {
  // Fetch pipeline data ONLY for SDR performance (needs agendado_por field)
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline-clients-metrics-evolution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('stage, agendado_por, created_at')
        .limit(10000);
      if (error) throw error;
      return data;
    },
  });

  // Filter pipeline data by selected day or month for SDR performance
  const filteredPipelineData = useMemo(() => {
    if (!pipelineData) return [];
    
    if (selectedDay) {
      const dayStr = format(selectedDay, 'yyyy-MM-dd');
      return pipelineData.filter(c => c.created_at?.split('T')[0] === dayStr);
    }
    
    if (selectedMonth && selectedMonth !== 'all' && selectedMonthRange) {
      return pipelineData.filter(c => {
        const createdDate = c.created_at?.split('T')[0];
        if (!createdDate) return false;
        const date = new Date(createdDate);
        return date >= selectedMonthRange.startDate && date <= selectedMonthRange.endDate;
      });
    }
    
    return pipelineData;
  }, [pipelineData, selectedDay, selectedMonth, selectedMonthRange]);

  // Fetch ALL agendamento leads for evolution chart (unfiltered)
  const { data: allAgendamentoLeads = [] } = useQuery({
    queryKey: ['agendamento-leads-all-for-evolution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agendamento_leads')
        .select('status, data')
        .limit(10000);
      if (error) throw error;
      return data;
    },
  });

  // Evolution data for line chart - uses agendamento_leads as source of truth
  const evolutionData = useMemo(() => {
    // If a specific day is selected, show single-day data point
    if (selectedDay) {
      const dayLabel = format(selectedDay, 'dd/MM', { locale: ptBR });
      const noShow = leads.filter(l => l.status === 'NO_SHOW').length;
      const realizados = leads.filter(l => COMPLETED_STATUSES.includes(l.status)).length;
      return [{ month: dayLabel, 'No Show': noShow, 'Realizados': realizados }];
    }
    
    // If a specific month is selected
    if (selectedMonth && selectedMonth !== 'all' && selectedMonthRange) {
      const monthLabel = format(selectedMonthRange.startDate, 'MMM/yy', { locale: ptBR });
      const noShow = leads.filter(l => l.status === 'NO_SHOW').length;
      const realizados = leads.filter(l => COMPLETED_STATUSES.includes(l.status)).length;
      return [{ month: monthLabel, 'No Show': noShow, 'Realizados': realizados }];
    }
    
    // Default: Get last 6 months from ALL agendamento leads
    const now = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(now), 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    
    return months.map(monthDate => {
      const monthNum = format(monthDate, 'MM');
      const yearNum = format(monthDate, 'yyyy');
      const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });
      
      // Parse DD/MM/YYYY from the `data` field to match by month/year
      const monthLeads = allAgendamentoLeads.filter(l => {
        if (!l.data) return false;
        const parts = l.data.split('/');
        if (parts.length !== 3) return false;
        return parts[1] === monthNum && parts[2] === yearNum;
      });
      const noShow = monthLeads.filter(l => l.status === 'NO_SHOW').length;
      const realizados = monthLeads.filter(l => COMPLETED_STATUSES.includes(l.status || '')).length;
      
      return { month: monthLabel, 'No Show': noShow, 'Realizados': realizados };
    });
  }, [leads, allAgendamentoLeads, selectedDay, selectedMonth, selectedMonthRange]);

  // SDR Performance bar chart data - uses filtered data when day/month is selected
  const sdrPerformanceData = useMemo(() => {
    const dataSource = (selectedDay || (selectedMonth && selectedMonth !== 'all')) ? filteredPipelineData : pipelineData;
    if (!dataSource) return { barData: [], sdrTotals: [] };
    
    const sdrStats: Record<string, { noShow: number; realizados: number }> = {};
    SDRS.forEach(sdr => {
      sdrStats[sdr] = { noShow: 0, realizados: 0 };
    });
    
    // Count from pipeline based on agendado_por
    dataSource.forEach(c => {
      const sdr = c.agendado_por?.toUpperCase();
      if (!sdr || !SDRS.includes(sdr)) return;
      
      if (c.stage === 'NO_SHOW') {
        sdrStats[sdr].noShow++;
      } else if (COMPLETED_STATUSES.includes(c.stage || '')) {
        sdrStats[sdr].realizados++;
      }
    });
    
    // Create bar chart data - each SDR is a bar group
    const barData = SDRS.map(sdr => {
      const total = sdrStats[sdr].noShow + sdrStats[sdr].realizados;
      const taxaComparecimento = total > 0 
        ? ((sdrStats[sdr].realizados / total) * 100).toFixed(1) 
        : '0';
      return {
        name: sdr,
        'Realizados': sdrStats[sdr].realizados,
        'No Show': sdrStats[sdr].noShow,
        taxaComparecimento,
      };
    });
    
    // SDR totals for stats
    const sdrTotals = SDRS.map(sdr => {
      const total = sdrStats[sdr].noShow + sdrStats[sdr].realizados;
      const taxaComparecimento = total > 0 
        ? ((sdrStats[sdr].realizados / total) * 100).toFixed(1) 
        : '0';
      return {
        name: sdr,
        noShow: sdrStats[sdr].noShow,
        realizados: sdrStats[sdr].realizados,
        taxaComparecimento,
        color: SDR_COLORS[sdr],
      };
    });
    
    return { barData, sdrTotals };
  }, [pipelineData, selectedDay, selectedMonth, filteredPipelineData]);

  // Metrics calculations - ALL from agendamento_leads (the `leads` prop is already filtered)
  const metrics = useMemo(() => {
    const total = leads.length;
    
    // No Show count from agendamento_leads status
    const noShowCount = leads.filter(l => l.status === 'NO_SHOW').length;
    
    // Completed appointments (meetings that happened)
    const completedAppointments = leads.filter(l => 
      COMPLETED_STATUSES.includes(l.status)
    ).length;
    
    // Conversion rate
    const totalMeetings = noShowCount + completedAppointments;
    const completionRate = totalMeetings > 0 
      ? ((completedAppointments / totalMeetings) * 100).toFixed(1) 
      : '0';
    
    // Faturamento distribution
    const faturamentoCount: Record<string, number> = {};
    FATURAMENTO_OPTIONS.forEach(opt => faturamentoCount[opt.value] = 0);
    leads.forEach(lead => {
      if (lead.faturamento) {
        faturamentoCount[lead.faturamento] = (faturamentoCount[lead.faturamento] || 0) + 1;
      }
    });
    const faturamentoData = FATURAMENTO_OPTIONS.map(opt => ({
      name: opt.label,
      value: faturamentoCount[opt.value] || 0,
      percentage: total > 0 ? ((faturamentoCount[opt.value] || 0) / total * 100).toFixed(1) : '0',
    })).filter(item => item.value > 0);
    
    // Top faturamento
    const topFaturamento = faturamentoData.reduce((max, item) => 
      item.value > max.value ? item : max, 
      { name: 'N/A', value: 0, percentage: '0' }
    );
    
    // Criativo distribution from agendamento_leads funil field
    const criativoCount: Record<string, number> = {};
    
    leads.forEach(lead => {
      if (lead.funil && lead.funil.trim()) {
        const criativoKey = lead.funil.trim();
        criativoCount[criativoKey] = (criativoCount[criativoKey] || 0) + 1;
      } else {
        criativoCount['NÃO IDENTIFICADO'] = (criativoCount['NÃO IDENTIFICADO'] || 0) + 1;
      }
    });
    
    // Convert to array sorted by count (descending)
    const criativoData = Object.entries(criativoCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Status distribution
    const statusCount: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.status) {
        statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
      }
    });
    const statusData = Object.entries(statusCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    // Horário distribution
    const horarioCount: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.horario) {
        horarioCount[lead.horario] = (horarioCount[lead.horario] || 0) + 1;
      }
    });
    const horarioData = HORARIO_OPTIONS.map(opt => ({
      name: opt.label,
      value: horarioCount[opt.value] || 0,
    })).filter(item => item.value > 0);
    
    // Salão vs Clínica distribution
    const salaoClinicaCount: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.salao_ou_clinica) {
        salaoClinicaCount[lead.salao_ou_clinica] = (salaoClinicaCount[lead.salao_ou_clinica] || 0) + 1;
      }
    });
    const salaoClinicaData = SALAO_OU_CLINICA_OPTIONS.map(opt => ({
      name: opt.label,
      value: salaoClinicaCount[opt.value] || 0,
    })).filter(item => item.value > 0);
    
    // Tem sócio distribution
    const comSocio = leads.filter(l => l.tem_socio === 'SIM').length;
    const semSocio = leads.filter(l => l.tem_socio === 'NAO').length;
    
    // Tem MKT distribution
    const comMkt = leads.filter(l => l.tem_mkt === 'SIM').length;
    const semMkt = leads.filter(l => l.tem_mkt === 'NAO').length;
    
    // This week leads
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekLeads = leads.filter(lead => {
      const created = new Date(lead.created_at);
      return created >= weekAgo;
    }).length;
    
    // Today's leads
    const today = now.toISOString().split('T')[0];
    const todayLeads = leads.filter(lead => {
      const created = new Date(lead.created_at).toISOString().split('T')[0];
      return created === today;
    }).length;
    
    return {
      total,
      todayLeads,
      thisWeekLeads,
      topFaturamento,
      faturamentoData,
      criativoData,
      statusData,
      horarioData,
      salaoClinicaData,
      comSocio,
      semSocio,
      comMkt,
      semMkt,
      noShowCount,
      completedAppointments,
      completionRate,
    };
  }, [leads]);

  const isLoadingMetrics = pipelineLoading;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{payload[0].name || payload[0].payload?.name || payload[0].payload?.month}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name || entry.dataKey}: <span className="font-semibold" style={{ color: entry.color }}>{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoadingMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Hoje</p>
                <p className="text-2xl font-bold">{metrics.todayLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Semana</p>
                <p className="text-2xl font-bold">{metrics.thisWeekLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-success/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realizados</p>
                <p className="text-2xl font-bold text-success">{metrics.completedAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">No Show</p>
                <p className="text-2xl font-bold text-destructive">{metrics.noShowCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Faturamento</p>
                <p className="text-lg font-bold">{metrics.topFaturamento.name}</p>
                <p className="text-xs text-muted-foreground">{metrics.topFaturamento.percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Show vs Realizados Evolution + SDR Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Evolução: No Show x Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Realizados" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="No Show" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados disponíveis
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Comparecimento (Geral)</span>
                <span className={`text-lg font-bold ${Number(metrics.completionRate) >= 70 ? 'text-success' : Number(metrics.completionRate) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {metrics.completionRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDR Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              Performance SDRs
            </CardTitle>
            <p className="text-xs text-muted-foreground">No Show x Realizados por SDR</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {sdrPerformanceData.barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdrPerformanceData.barData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs font-medium">{value}</span>}
                    />
                    <Bar 
                      dataKey="Realizados" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]}
                      name="Realizados"
                    />
                    <Bar 
                      dataKey="No Show" 
                      fill="#EF4444" 
                      radius={[4, 4, 0, 0]}
                      name="No Show"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados de SDRs
                </div>
              )}
            </div>
            {/* SDR Stats */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
              {sdrPerformanceData.sdrTotals.map(sdr => (
                <div key={sdr.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: sdr.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold tracking-wide">{sdr.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-success">{sdr.realizados} realizados</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm font-medium text-destructive">{sdr.noShow} no show</span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Taxa:</span>{' '}
                      <span className={`font-bold ${Number(sdr.taxaComparecimento) >= 70 ? 'text-success' : Number(sdr.taxaComparecimento) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {sdr.taxaComparecimento}%
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faturamento Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Distribuição por Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.faturamentoData} margin={{ left: 0, right: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Criativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Top Criativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
              {metrics.criativoData.map((criativo, index) => {
                const maxValue = Math.max(...metrics.criativoData.map(c => c.value), 1);
                const percentage = (criativo.value / maxValue) * 100;
                return (
                  <div key={criativo.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate max-w-[180px]" title={criativo.name}>
                        {criativo.name}
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${criativo.value > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {criativo.value}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: criativo.value > 0 
                            ? COLORS[index % COLORS.length] 
                            : 'hsl(var(--muted-foreground) / 0.3)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Horário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.horarioData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.horarioData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Salão vs Clínica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Salão vs Clínica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.salaoClinicaData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.salaoClinicaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index + 3 % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.statusData.map((status, index) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-sm truncate max-w-[140px]">{status.name}</span>
                  </div>
                  <span className="text-sm font-medium">{status.value}</span>
                </div>
              ))}
              {metrics.statusData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Com Sócio</p>
            <p className="text-xl font-bold text-success">{metrics.comSocio}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Sem Sócio</p>
            <p className="text-xl font-bold text-muted-foreground">{metrics.semSocio}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Com Marketing</p>
            <p className="text-xl font-bold text-primary">{metrics.comMkt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Sem Marketing</p>
            <p className="text-xl font-bold text-muted-foreground">{metrics.semMkt}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
