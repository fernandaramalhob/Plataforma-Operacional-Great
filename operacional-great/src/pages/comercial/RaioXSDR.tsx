import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RaioXFilters, getDefaultRaioXFilter, filterClientByRaioX, type RaioXFilterState } from '@/components/comercial/RaioXFilters';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Users, Target, TrendingUp, XCircle, Clock, Zap, Award } from 'lucide-react';
import { format, parseISO, getHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SDRS = ['FELIPE', 'MIGUEL', 'PEDRO_H', 'PEDRO_JUAN'];
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface PipelineClient {
  id: string;
  client_name: string;
  stage: string | null;
  agendado_por: string | null;
  vendedor: string | null;
  criativo: string | null;
  faturamento: string | null;
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
  salao_ou_clinica: string | null;
  pode_investir: string | null;
  agendado_via: string | null;
}

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

const STAGE_LABELS: Record<string, string> = {
  NOVO: 'Novo',
  NO_SHOW: 'No Show',
  NEGOCIACAO: 'Negociação',
  FECHADO: 'Fechado',
  PERDIDO: 'Perdido',
  TAXA_INTERESSE: 'Taxa Interesse',
};

export default function RaioXSDR() {
  const [filter, setFilter] = useState<RaioXFilterState>(getDefaultRaioXFilter);

  const { data: allClients = [] } = useQuery({
    queryKey: ['raio-x-sdr-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_clients')
        .select('*')
        .not('agendado_por', 'is', null);
      if (error) throw error;
      return data as PipelineClient[];
    },
  });

  const clients = useMemo(() =>
    allClients.filter(c => filterClientByRaioX(c.data_entrada || c.created_at, filter)),
    [allClients, filter]
  );

  const sdrClients = useMemo(() => clients.filter(c => SDRS.includes(c.agendado_por || '')), [clients]);
  const allSdrClients = clients;

  const stats = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr);
      const fechados = leads.filter(c => c.stage === 'FECHADO' || c.stage === 'TAXA_INTERESSE');
      const noShows = leads.filter(c => c.stage === 'NO_SHOW');
      const perdidos = leads.filter(c => c.stage === 'PERDIDO');
      const total = leads.length;
      const receita = fechados.reduce((sum, c) => sum + (c.entrada || 0), 0);
      const porLigacao = leads.filter(c => c.agendado_via === 'LIGACAO').length;
      const porMensagem = leads.filter(c => c.agendado_via === 'MENSAGEM').length;

      return {
        sdr,
        total,
        fechados: fechados.length,
        noShows: noShows.length,
        perdidos: perdidos.length,
        taxaConversao: total > 0 ? ((fechados.length / total) * 100).toFixed(1) : '0',
        taxaNoShow: total > 0 ? ((noShows.length / total) * 100).toFixed(1) : '0',
        receita,
        porLigacao,
        porMensagem,
      };
    });
  }, [allSdrClients]);

  // All SDRs stats (including PEDRO, HEBERT, BRENDA)
  const allSdrsStats = useMemo(() => {
    const sdrs = [...new Set(allSdrClients.map(c => c.agendado_por).filter(Boolean))];
    return sdrs.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr);
      const fechados = leads.filter(c => c.stage === 'FECHADO' || c.stage === 'TAXA_INTERESSE');
      const noShows = leads.filter(c => c.stage === 'NO_SHOW');
      return {
        sdr: sdr!,
        total: leads.length,
        fechados: fechados.length,
        noShows: noShows.length,
        taxaConversao: leads.length > 0 ? ((fechados.length / leads.length) * 100).toFixed(1) : '0',
        taxaNoShow: leads.length > 0 ? ((noShows.length / leads.length) * 100).toFixed(1) : '0',
        receita: fechados.reduce((sum, c) => sum + (c.entrada || 0), 0),
        porLigacao: leads.filter(c => c.agendado_via === 'LIGACAO').length,
        porMensagem: leads.filter(c => c.agendado_via === 'MENSAGEM').length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [allSdrClients]);

  // Criativo analysis per SDR
  const criativoPerSdr = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && c.criativo);
      const grouped: Record<string, { total: number; fechados: number }> = {};
      leads.forEach(l => {
        const key = l.criativo || 'N/A';
        if (!grouped[key]) grouped[key] = { total: 0, fechados: 0 };
        grouped[key].total++;
        if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[key].fechados++;
      });
      return {
        sdr,
        criativos: Object.entries(grouped)
          .map(([name, v]) => ({ name, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
          .sort((a, b) => b.fechados - a.fechados),
      };
    });
  }, [allSdrClients]);

  // Horário analysis per SDR
  const horarioPerSdr = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && c.meeting_time);
      const grouped: Record<string, { total: number; fechados: number }> = {};
      leads.forEach(l => {
        const hour = l.meeting_time!.slice(0, 2) + ':00';
        if (!grouped[hour]) grouped[hour] = { total: 0, fechados: 0 };
        grouped[hour].total++;
        if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[hour].fechados++;
      });
      return {
        sdr,
        data: Object.entries(grouped)
          .map(([hora, v]) => ({ hora, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
          .sort((a, b) => a.hora.localeCompare(b.hora)),
      };
    });
  }, [allSdrClients]);

  // Faturamento distribution per SDR
  const faturamentoPerSdr = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && c.faturamento);
      const grouped: Record<string, { total: number; fechados: number }> = {};
      leads.forEach(l => {
        const key = l.faturamento || 'N/A';
        if (!grouped[key]) grouped[key] = { total: 0, fechados: 0 };
        grouped[key].total++;
        if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[key].fechados++;
      });
      return {
        sdr,
        faturamentos: Object.entries(grouped)
          .map(([name, v]) => ({ name: FATURAMENTO_LABELS[name] || name, ...v }))
          .sort((a, b) => b.total - a.total),
      };
    });
  }, [allSdrClients]);

  // Stage distribution (funnel) per SDR
  const stageDistribution = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && c.stage);
      const grouped: Record<string, number> = {};
      leads.forEach(l => {
        const key = l.stage || 'N/A';
        grouped[key] = (grouped[key] || 0) + 1;
      });
      return {
        sdr,
        stages: Object.entries(grouped).map(([name, value]) => ({
          name: STAGE_LABELS[name] || name,
          value,
        })),
      };
    });
  }, [allSdrClients]);

  // Day of week analysis per SDR
  const dayOfWeekPerSdr = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && (c.data_entrada || c.created_at));
      const grouped: Record<number, { total: number; fechados: number }> = {};
      for (let i = 0; i < 7; i++) grouped[i] = { total: 0, fechados: 0 };
      leads.forEach(l => {
        const date = l.data_entrada || l.created_at;
        try {
          const d = parseISO(date);
          const day = d.getDay();
          grouped[day].total++;
          if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') grouped[day].fechados++;
        } catch {}
      });
      return {
        sdr,
        data: Object.entries(grouped).map(([day, v]) => ({
          dia: days[Number(day)],
          ...v,
          taxa: v.total > 0 ? Number(((v.fechados / v.total) * 100).toFixed(1)) : 0,
        })),
      };
    });
  }, [allSdrClients]);

  // Closer partnership analysis (which closer converts best for each SDR)
  const closerPartnership = useMemo(() => {
    return SDRS.map(sdr => {
      const leads = allSdrClients.filter(c => c.agendado_por === sdr && c.vendedor);
      const grouped: Record<string, { total: number; fechados: number; receita: number }> = {};
      leads.forEach(l => {
        const key = l.vendedor || 'N/A';
        if (!grouped[key]) grouped[key] = { total: 0, fechados: 0, receita: 0 };
        grouped[key].total++;
        if (l.stage === 'FECHADO' || l.stage === 'TAXA_INTERESSE') {
          grouped[key].fechados++;
          grouped[key].receita += l.entrada || 0;
        }
      });
      return {
        sdr,
        closers: Object.entries(grouped)
          .map(([name, v]) => ({ name, ...v, taxa: v.total > 0 ? ((v.fechados / v.total) * 100).toFixed(1) : '0' }))
          .sort((a, b) => b.fechados - a.fechados),
      };
    });
  }, [allSdrClients]);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-indigo-500" />
          Raio X — SDR
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise completa da performance dos SDRs: criativos, horários, conversão e mais
        </p>
        <div className="mt-3">
          <RaioXFilters value={filter} onChange={setFilter} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.sdr}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                {s.sdr}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Leads</span>
                <span className="font-bold">{s.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fechados</span>
                <span className="font-bold text-emerald-600">{s.fechados}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No Shows</span>
                <span className="font-bold text-red-500">{s.noShows}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa Conversão</span>
                <Badge className="bg-indigo-500/20 text-indigo-600 border-indigo-500/30">{s.taxaConversao}%</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa No Show</span>
                <Badge variant="destructive">{s.taxaNoShow}%</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita Gerada</span>
                <span className="font-bold text-emerald-600">R$ {s.receita.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">📞 Ligação</span>
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">{s.porLigacao}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">💬 Mensagem</span>
                <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">{s.porMensagem}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All SDRs Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Ranking Geral — Todos os SDRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SDR</TableHead>
                <TableHead className="text-center">Total Leads</TableHead>
                <TableHead className="text-center">Fechados</TableHead>
                <TableHead className="text-center">No Show</TableHead>
                <TableHead className="text-center">Taxa Conversão</TableHead>
                <TableHead className="text-center">Taxa No Show</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-center">📞 Ligação</TableHead>
                <TableHead className="text-center">💬 Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSdrsStats.map((s, i) => (
                <TableRow key={s.sdr}>
                  <TableCell className="font-medium">
                    {i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}{s.sdr}
                  </TableCell>
                  <TableCell className="text-center">{s.total}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-600">{s.fechados}</TableCell>
                  <TableCell className="text-center text-red-500">{s.noShows}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-indigo-500/20 text-indigo-600 border-indigo-500/30">{s.taxaConversao}%</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={Number(s.taxaNoShow) > 30 ? 'destructive' : 'outline'}>{s.taxaNoShow}%</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">R$ {s.receita.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-center">{s.porLigacao}</TableCell>
                  <TableCell className="text-center">{s.porMensagem}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Closer partnership per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {closerPartnership.map(cp => (
          <Card key={cp.sdr}>
            <CardHeader>
              <CardTitle className="text-base">🤝 {cp.sdr} → Closers (Quem converte melhor?)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead className="text-center">Atendidos</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cp.closers.map(c => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-center">{c.total}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{c.fechados}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">{c.taxa}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">R$ {c.receita.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Criativo per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {criativoPerSdr.map(cp => (
          <Card key={cp.sdr}>
            <CardHeader>
              <CardTitle className="text-base">🎨 Criativos — {cp.sdr}</CardTitle>
            </CardHeader>
            <CardContent>
              {cp.criativos.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, cp.criativos.length * 32)}>
                  <BarChart data={cp.criativos.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#6366f1" name="Total" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="fechados" fill="#10b981" name="Fechados" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Faturamento per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {faturamentoPerSdr.map(fp => {
          const total = fp.faturamentos.reduce((s, r) => s + r.total, 0);
          return (
            <Card key={fp.sdr}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>💰 Faturamento dos Leads — {fp.sdr}</span>
                  <span className="text-sm font-normal text-muted-foreground">{total} leads</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fp.faturamentos.length > 0 ? (
                  <div className="space-y-2.5">
                    {fp.faturamentos.map((r, i) => {
                      const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
                      return (
                        <div key={r.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-xs flex-1 truncate" title={r.name}>{r.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums w-20 text-right">
                              {r.total}× ({pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sem dados</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stage distribution per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stageDistribution.map(sd => (
          <Card key={sd.sdr}>
            <CardHeader>
              <CardTitle className="text-base">📊 Funil de Leads — {sd.sdr}</CardTitle>
            </CardHeader>
            <CardContent>
              {sd.stages.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={sd.stages} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {sd.stages.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Horário analysis per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {horarioPerSdr.map(hp => (
          <Card key={hp.sdr}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Performance por Horário — {hp.sdr}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hp.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hp.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#6366f1" name="Total Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fechados" fill="#10b981" name="Fechados" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sem dados de horário</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Day of week analysis per SDR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dayOfWeekPerSdr.map(dp => (
          <Card key={dp.sdr}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Performance por Dia da Semana — {dp.sdr}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dp.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8b5cf6" name="Total Leads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fechados" fill="#10b981" name="Fechados" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
