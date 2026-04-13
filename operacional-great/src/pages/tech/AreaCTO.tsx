import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Activity, 
  Database, 
  Cloud, 
  Shield, 
  Cpu,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Users,
  GitBranch,
  Lock,
  Zap,
  ExternalLink,
  RefreshCw,
  Bot,
  Loader2,
  History,
  Timer,
  Target,
  TrendingDown,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface SystemMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}


interface ERPActivity {
  id: string;
  action: string;
  user: string;
  task: string;
  timestamp: Date;
  type: 'create' | 'update' | 'delete' | 'move';
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  rawStatus?: string;
}

interface StatusAPIResponse {
  service: string;
  overallStatus: 'operational' | 'degraded' | 'outage' | 'unknown' | 'error';
  description: string;
  lastUpdated: string;
  components: Array<{
    id: string;
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    rawStatus: string;
  }>;
  error?: string;
}

const SYSTEM_METRICS: SystemMetric[] = [
  { label: 'CPU', value: 42, max: 100, unit: '%', status: 'healthy' },
  { label: 'Memória', value: 68, max: 100, unit: '%', status: 'warning' },
  { label: 'Disco', value: 55, max: 100, unit: '%', status: 'healthy' },
  { label: 'Rede', value: 23, max: 100, unit: 'Mbps', status: 'healthy' },
];


const MOCK_ERP_ACTIVITIES: ERPActivity[] = [
  { id: '1', action: 'Tarefa criada', user: 'Bruno', task: 'Implementar sistema de notificações push', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'create' },
  { id: '2', action: 'Tarefa movida para "Em Progresso"', user: 'Carlos', task: 'Corrigir bug no login com Google', timestamp: new Date(Date.now() - 1000 * 60 * 15), type: 'move' },
  { id: '3', action: 'Tarefa atualizada', user: 'Bruno', task: 'Otimizar queries do dashboard', timestamp: new Date(Date.now() - 1000 * 60 * 30), type: 'update' },
  { id: '4', action: 'Tarefa concluída', user: 'Ana', task: 'Setup de CI/CD para staging', timestamp: new Date(Date.now() - 1000 * 60 * 60), type: 'update' },
  { id: '5', action: 'Tarefa criada', user: 'Carlos', task: 'Documentar API de integração', timestamp: new Date(Date.now() - 1000 * 60 * 90), type: 'create' },
  { id: '6', action: 'Tarefa excluída', user: 'Bruno', task: 'Revisar código legado', timestamp: new Date(Date.now() - 1000 * 60 * 120), type: 'delete' },
];

// Productivity Metrics Mock Data
interface ProductivityMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  avgCompletionTime: number; // in hours
  completionRate: number; // percentage
  tasksCompletedThisWeek: number;
  tasksCompletedLastWeek: number;
  weeklyTrend: number; // percentage change
}

const MOCK_PRODUCTIVITY: ProductivityMetrics = {
  totalTasks: 48,
  completedTasks: 32,
  overdueTasks: 5,
  inProgressTasks: 8,
  avgCompletionTime: 18.5,
  completionRate: 66.7,
  tasksCompletedThisWeek: 12,
  tasksCompletedLastWeek: 9,
  weeklyTrend: 33.3,
};

// Task Evolution Data (last 30 days)
const generateTaskEvolutionData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const baseCreated = Math.floor(Math.random() * 3) + 1;
    const baseCompleted = Math.floor(Math.random() * 4);
    const baseOverdue = Math.floor(Math.random() * 2);
    
    data.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      fullDate: format(date, 'dd MMM', { locale: ptBR }),
      created: baseCreated,
      completed: baseCompleted,
      overdue: baseOverdue,
      inProgress: Math.floor(Math.random() * 5) + 3,
    });
  }
  return data;
};

// Weekly Summary Data (last 8 weeks)
const generateWeeklySummaryData = () => {
  const data = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = subDays(new Date(), i * 7 + 6);
    const weekEnd = subDays(new Date(), i * 7);
    
    data.push({
      week: `Sem ${8 - i}`,
      weekLabel: `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`,
      completed: Math.floor(Math.random() * 8) + 5,
      created: Math.floor(Math.random() * 10) + 6,
      avgTime: Math.floor(Math.random() * 12) + 12,
    });
  }
  return data;
};

// Cumulative Progress Data
const generateCumulativeData = () => {
  const data = [];
  let totalCompleted = 0;
  let totalCreated = 0;
  
  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    totalCreated += Math.floor(Math.random() * 3) + 1;
    totalCompleted += Math.floor(Math.random() * 3);
    
    data.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      fullDate: format(date, 'dd MMM', { locale: ptBR }),
      totalCreated,
      totalCompleted,
      backlog: totalCreated - totalCompleted,
    });
  }
  return data;
};

const TASK_EVOLUTION_DATA = generateTaskEvolutionData();
const WEEKLY_SUMMARY_DATA = generateWeeklySummaryData();
const CUMULATIVE_DATA = generateCumulativeData();

function MetricCard({ metric }: { metric: SystemMetric }) {
  const statusColors = {
    healthy: 'text-green-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
  };

  const progressColors = {
    healthy: '[&>div]:bg-green-500',
    warning: '[&>div]:bg-amber-500',
    critical: '[&>div]:bg-red-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{metric.label}</span>
        <span className={cn('text-sm font-semibold', statusColors[metric.status])}>
          {metric.value}{metric.unit}
        </span>
      </div>
      <Progress 
        value={(metric.value / metric.max) * 100} 
        className={cn('h-2', progressColors[metric.status])}
      />
    </div>
  );
}

function ProductivityDashboard() {
  const metrics = MOCK_PRODUCTIVITY;
  
  return (
    <div className="space-y-6">
      {/* Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Métricas de Produtividade - Tech
          </CardTitle>
          <CardDescription>Análise de desempenho das tarefas do ERP Tech</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                  {metrics.completionRate.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold">{metrics.completedTasks}</p>
              <p className="text-xs text-muted-foreground">Tarefas Concluídas</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">{metrics.inProgressTasks}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold">{metrics.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{metrics.avgCompletionTime}h</p>
              <p className="text-xs text-muted-foreground">Tempo Médio de Conclusão</p>
            </div>
          </div>

          {/* Weekly Comparison */}
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm">Comparativo Semanal</h4>
              <Badge 
                variant="outline" 
                className={cn(
                  'gap-1',
                  metrics.weeklyTrend >= 0 
                    ? 'text-green-500 border-green-500/30' 
                    : 'text-red-500 border-red-500/30'
                )}
              >
                {metrics.weeklyTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {metrics.weeklyTrend >= 0 ? '+' : ''}{metrics.weeklyTrend.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Esta Semana</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(metrics.tasksCompletedThisWeek / 15) * 100} 
                    className="h-2 flex-1 [&>div]:bg-emerald-500" 
                  />
                  <span className="text-sm font-semibold">{metrics.tasksCompletedThisWeek}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Semana Passada</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(metrics.tasksCompletedLastWeek / 15) * 100} 
                    className="h-2 flex-1 [&>div]:bg-slate-400" 
                  />
                  <span className="text-sm font-semibold">{metrics.tasksCompletedLastWeek}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <Target className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-lg font-bold">{metrics.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Total de Tarefas</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-lg font-bold">{((metrics.completedTasks / 30) * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Velocidade Mensal</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <Activity className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-lg font-bold">{(metrics.completedTasks / 4).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Média/Semana</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <CalendarDays className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
              <p className="text-lg font-bold">30</p>
              <p className="text-xs text-muted-foreground">Dias Analisados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily Task Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Evolução Diária de Tarefas
            </CardTitle>
            <CardDescription>Tarefas criadas vs concluídas nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={TASK_EVOLUTION_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullDate;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  name="Criadas"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  name="Concluídas"
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="overdue" 
                  name="Atrasadas"
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-purple-500" />
              Progresso Acumulado
            </CardTitle>
            <CardDescription>Total de tarefas criadas vs concluídas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={CUMULATIVE_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullDate;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalCreated" 
                  name="Total Criadas"
                  stroke="#8b5cf6" 
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalCompleted" 
                  name="Total Concluídas"
                  stroke="#22c55e" 
                  fill="#22c55e"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Summary Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              Resumo Semanal
            </CardTitle>
            <CardDescription>Performance por semana nas últimas 8 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={WEEKLY_SUMMARY_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.weekLabel;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  name="Criadas"
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  name="Concluídas"
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Backlog Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-red-500" />
              Evolução do Backlog
            </CardTitle>
            <CardDescription>Tarefas pendentes ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={CUMULATIVE_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullDate;
                    }
                    return label;
                  }}
                  formatter={(value) => [`${value} tarefas`, 'Backlog']}
                />
                <Area 
                  type="monotone" 
                  dataKey="backlog" 
                  name="Backlog"
                  stroke="#ef4444" 
                  fill="url(#backlogGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="backlogGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function ERPActivityLog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-cyan-500" />
          Registro de Atividades - ERP Tech
        </CardTitle>
        <CardDescription>Todas as movimentações do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {MOCK_ERP_ACTIVITIES.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  activity.type === 'create' && 'bg-green-500/10',
                  activity.type === 'update' && 'bg-blue-500/10',
                  activity.type === 'delete' && 'bg-red-500/10',
                  activity.type === 'move' && 'bg-amber-500/10'
                )}>
                  {activity.type === 'create' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {activity.type === 'update' && <Activity className="h-4 w-4 text-blue-500" />}
                  {activity.type === 'delete' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {activity.type === 'move' && <GitBranch className="h-4 w-4 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.task}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{format(activity.timestamp, "HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StatusPage({ type }: { type: 'gpt' | 'cloudflare' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage' | 'unknown' | 'error'>('unknown');
  const [statusDescription, setStatusDescription] = useState<string>('Carregando...');

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const serviceType = type === 'gpt' ? 'openai' : 'cloudflare';
      
      const { data, error } = await supabase.functions.invoke('fetch-status', {
        body: { service: serviceType },
      });

      if (error) {
        console.error('Error fetching status:', error);
        toast.error(`Erro ao buscar status: ${error.message}`);
        setOverallStatus('error');
        setStatusDescription('Falha ao conectar com a API');
        return;
      }

      const response = data as StatusAPIResponse;
      
      setOverallStatus(response.overallStatus);
      setStatusDescription(response.description);
      setLastChecked(new Date(response.lastUpdated));
      
      // Map components to services
      const mappedServices: ServiceStatus[] = response.components.map((comp) => ({
        name: comp.name,
        status: comp.status,
        lastChecked: new Date(response.lastUpdated),
        rawStatus: comp.rawStatus,
      }));

      setServices(mappedServices);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao buscar status dos serviços');
      setOverallStatus('error');
      setStatusDescription('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRefresh = () => {
    fetchStatus();
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-amber-500';
      case 'outage': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'Operacional';
      case 'degraded': return 'Degradado';
      case 'outage': return 'Fora do Ar';
      default: return 'Desconhecido';
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'operational': return 'bg-green-500/10 border-green-500/20';
      case 'degraded': return 'bg-amber-500/10 border-amber-500/20';
      case 'outage': return 'bg-red-500/10 border-red-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getOverallDotColor = () => {
    switch (overallStatus) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-amber-500';
      case 'outage': return 'bg-red-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOverallTextColor = () => {
    switch (overallStatus) {
      case 'operational': return 'text-green-600 dark:text-green-400';
      case 'degraded': return 'text-amber-600 dark:text-amber-400';
      case 'outage': return 'text-red-600 dark:text-red-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {type === 'gpt' ? (
                <Bot className="h-4 w-4 text-green-500" />
              ) : (
                <Cloud className="h-4 w-4 text-orange-500" />
              )}
              Status {type === 'gpt' ? 'OpenAI / GPT' : 'Cloudflare'}
            </CardTitle>
            <CardDescription>
              {lastChecked 
                ? `Atualizado: ${format(lastChecked, "dd/MM HH:mm:ss", { locale: ptBR })}`
                : 'Carregando...'
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(
                type === 'gpt' 
                  ? 'https://status.openai.com' 
                  : 'https://www.cloudflarestatus.com',
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Status */}
        <div className={cn(
          'p-4 rounded-lg mb-4 flex items-center gap-3 border',
          getOverallStatusColor()
        )}>
          <div className={cn('h-3 w-3 rounded-full', getOverallDotColor())} />
          <span className={cn('font-semibold', getOverallTextColor())}>
            {statusDescription}
          </span>
        </div>

        {/* Services List */}
        {isLoading && services.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum componente encontrado
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {services.map((service, index) => (
                <div 
                  key={`${service.name}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('h-2 w-2 rounded-full', getStatusColor(service.status))} />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <Badge variant="outline" className={cn(
                    'text-xs',
                    service.status === 'operational' && 'text-green-500 border-green-500/30',
                    service.status === 'degraded' && 'text-amber-500 border-amber-500/30',
                    service.status === 'outage' && 'text-red-500 border-red-500/30',
                    service.status === 'unknown' && 'text-gray-500 border-gray-500/30'
                  )}>
                    {getStatusLabel(service.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default function AreaCTO() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Área CTO</h1>
            <p className="text-muted-foreground text-sm">Painel de controle de infraestrutura e sistemas</p>
          </div>
        </div>
        <Badge className="bg-violet-500/20 text-violet-500 border-violet-500/30">
          <Shield className="h-3 w-3 mr-1" />
          Acesso Restrito - Administradores
        </Badge>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-card to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-green-500" />
              <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                Online
              </Badge>
            </div>
            <p className="text-2xl font-bold">99.99%</p>
            <p className="text-xs text-muted-foreground">Uptime (30 dias)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">45ms</p>
            <p className="text-xs text-muted-foreground">Latência média</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">Integrações Ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">847</p>
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="productivity" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="productivity" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="gpt-status" className="gap-2">
            <Bot className="h-4 w-4" />
            Status GPT
          </TabsTrigger>
          <TabsTrigger value="cloudflare-status" className="gap-2">
            <Cloud className="h-4 w-4" />
            Status Cloudflare
          </TabsTrigger>
        </TabsList>

        {/* Productivity Tab */}
        <TabsContent value="productivity">
          <ProductivityDashboard />
        </TabsContent>

        {/* GPT Status Tab */}
        <TabsContent value="gpt-status">
          <StatusPage type="gpt" />
        </TabsContent>

        {/* Cloudflare Status Tab */}
        <TabsContent value="cloudflare-status">
          <StatusPage type="cloudflare" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
