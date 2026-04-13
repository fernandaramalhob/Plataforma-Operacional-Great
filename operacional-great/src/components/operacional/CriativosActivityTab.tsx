import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart3,
  Trophy,
  User,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  Palette,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AdCreative {
  id: string;
  client_name: string;
  status: string;
  created_by_name: string;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function CriativosActivityTab() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data: allAds = [], isLoading } = useQuery({
    queryKey: ['ad-creatives-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_creatives')
        .select('id, client_name, status, created_by_name, completed_by_name, completed_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AdCreative[];
    },
  });

  // Filter by selected month
  const filteredAds = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return allAds.filter((ad) => {
      const d = new Date(ad.created_at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [allAds, selectedMonth]);

  // Stats
  const totalCreated = filteredAds.length;
  const totalActivated = filteredAds.filter((a) => a.status === 'ATIVO').length;
  const pendingCount = filteredAds.filter((a) => a.status === 'PARA_SUBIR').length;

  // Top designers (created_by_name)
  const designerRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAds.forEach((ad) => {
      const name = ad.created_by_name || 'Desconhecido';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({ name, count, rank: idx + 1 }));
  }, [filteredAds]);

  // Top gestores (completed_by_name)
  const gestorRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAds
      .filter((ad) => ad.status === 'ATIVO' && ad.completed_by_name)
      .forEach((ad) => {
        const name = ad.completed_by_name!;
        map[name] = (map[name] || 0) + 1;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({ name, count, rank: idx + 1 }));
  }, [filteredAds]);

  // Month options
  const monthOptions = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, []);

  const formatMonthLabel = (val: string) => {
    const [y, m] = val.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Registro de Atividades</h2>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalCreated}</p>
                  <p className="text-xs text-muted-foreground">Criativos Criados</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalActivated}</p>
                  <p className="text-xs text-muted-foreground">Anúncios Ativos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pendentes p/ Subir</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Designers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top Designers (Quem mais criou)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {designerRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum dado no período</p>
                ) : (
                  designerRanking.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{d.rank <= 3 ? rankEmojis[d.rank - 1] : `${d.rank}º`}</span>
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {d.count} {d.count === 1 ? 'criativo' : 'criativos'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Gestores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Gestores (Quem mais ativou)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gestorRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum dado no período</p>
                ) : (
                  gestorRanking.map((g) => (
                    <div
                      key={g.name}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{g.rank <= 3 ? rankEmojis[g.rank - 1] : `${g.rank}º`}</span>
                        <span className="text-sm font-medium text-foreground">{g.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {g.count} {g.count === 1 ? 'ativação' : 'ativações'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Histórico de Atividades ({filteredAds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredAds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade no período</p>
                ) : (
                  filteredAds.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                          ad.status === 'ATIVO' ? 'bg-green-500/10' : 'bg-orange-500/10'
                        )}
                      >
                        {ad.status === 'ATIVO' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Upload className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{ad.client_name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              ad.status === 'ATIVO'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                            )}
                          >
                            {ad.status === 'ATIVO' ? 'Ativado' : 'Criado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Arte: {ad.created_by_name}
                          </span>
                          {ad.status === 'ATIVO' && ad.completed_by_name && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Gestor: {ad.completed_by_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(ad.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
