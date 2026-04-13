import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCEOHistoricalData } from '@/hooks/useCEOHistoricalData';
import { TrendingUp, Users, DollarSign, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Legend,
} from 'recharts';

export function CEOTrendCharts() {
  const { data: historicalData, isLoading, error } = useCEOHistoricalData(6);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value}`;
  };

  if (error) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="col-span-2">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Erro ao carregar dados de tendência. Tente recarregar a página.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-muted/50 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Ensure we have valid data to work with
  const chartData = historicalData || [];

  if (chartData.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="col-span-2">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado histórico disponível ainda.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            Evolução de Receita (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                className="text-xs" 
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs" 
                tick={{ fontSize: 11 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                  'Receita'
                ]}
                labelClassName="font-medium"
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Clients Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-600" />
            Evolução de Clientes (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line 
                type="monotone" 
                dataKey="activeClients" 
                name="Ativos"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="newClients" 
                name="Novos"
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="lostClients" 
                name="Perdidos"
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tasks Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Produtividade (Tarefas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar 
                dataKey="tasksCreated" 
                name="Criadas"
                fill="hsl(var(--muted-foreground))" 
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="tasksDone" 
                name="Concluídas"
                fill="hsl(var(--primary))" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Taxa de Crescimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData.map((m, i, arr) => {
              const prevRevenue = i > 0 ? arr[i - 1].revenue : m.revenue;
              const growth = prevRevenue > 0 ? ((m.revenue - prevRevenue) / prevRevenue) * 100 : 0;
              return { ...m, growth: Math.round(growth) };
            })}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Crescimento']}
              />
              <Area 
                type="monotone" 
                dataKey="growth" 
                stroke="hsl(var(--chart-2))" 
                fill="url(#growthGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
