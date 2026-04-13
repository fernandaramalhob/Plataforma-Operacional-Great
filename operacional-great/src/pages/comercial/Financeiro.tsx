import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCommercial, STAGE_LABELS } from '@/contexts/CommercialContext';
import { CreateClientDialog } from '@/components/comercial/CreateClientDialog';
import { EditGoalDialog } from '@/components/comercial/EditGoalDialog';
import { SalesByCategoryTable } from '@/components/comercial/SalesByCategoryTable';
import { 
  DollarSign, 
  Users, 
  Target, 
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  Kanban,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatBRL, formatBRLShort } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  'NOVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'EM_CONTATO': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'NEGOCIACAO': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'FECHADO': 'bg-success/20 text-success border-success/30',
  'PERDIDO': 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function ComercialDashboard() {
  const { user } = useAuth();
  const { 
    pipelineClients, 
    currentGoal, 
    getGoalStats, 
    getPipelineStats 
  } = useCommercial();
  const navigate = useNavigate();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editGoalOpen, setEditGoalOpen] = useState(false);

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const goalValue = currentGoal?.goalValue || 100000;
  const stats = getGoalStats();
  const pipelineStats = getPipelineStats();

  // Get recent pipeline clients (last 5, excluding lost)
  const recentClients = pipelineClients
    .filter(c => c.stage !== 'PERDIDO')
    .sort((a, b) => new Date(b.dataEntrada || b.entryDate || 0).getTime() - new Date(a.dataEntrada || a.entryDate || 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Comercial</h1>
          <p className="text-muted-foreground mt-1">
            Olá, {user?.name?.split(' ')[0]}! Aqui está seu resumo de {currentMonth}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar cliente
          </Button>
          <Button variant="outline" onClick={() => navigate('/comercial/pipeline')} className="gap-2">
            <Kanban className="h-4 w-4" />
            Acessar pipeline
          </Button>
          <Button variant="outline" onClick={() => setEditGoalOpen(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar meta
          </Button>
        </div>
      </div>

      {/* Meta Progress */}
      <Card className={cn(
        "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
        stats.status === 'danger' && "border-destructive/30 from-destructive/5",
        stats.status === 'risk' && "border-warning/30 from-warning/5"
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ProgressRing 
              value={stats.totalSold} 
              max={goalValue} 
              size="lg" 
              label="da meta" 
              color={stats.status === 'danger' ? 'danger' : stats.status === 'risk' ? 'warning' : 'primary'} 
            />
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Meta de {currentMonth}</p>
                {stats.status !== 'ok' && (
                  <Badge className={cn(
                    "gap-1",
                    stats.status === 'danger' 
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : "bg-warning/20 text-warning border-warning/30"
                  )}>
                    <AlertTriangle className="h-3 w-3" />
                    {stats.status === 'danger' ? 'Fora da meta' : 'Em risco'}
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold tabular-nums">
                R$ {stats.totalSold.toLocaleString('pt-BR')} 
                <span className="text-lg text-muted-foreground font-normal"> / R$ {goalValue.toLocaleString('pt-BR')}</span>
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className="text-xl font-semibold text-primary">R$ {stats.remaining.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dias restantes</p>
                  <p className="text-xl font-semibold">{stats.daysRemaining} dias</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Necessário/dia</p>
                  <p className={cn(
                    "text-xl font-semibold",
                    stats.status === 'danger' ? "text-destructive" : stats.status === 'risk' ? "text-warning" : ""
                  )}>
                    {formatBRLShort(stats.dailyNeeded)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Meta do Mês"
          value={`R$ ${(goalValue / 1000).toFixed(0)}k`}
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          label="Total Vendido"
          value={`R$ ${(stats.totalSold / 1000).toFixed(1)}k`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          label="Projeção"
          value={`R$ ${(stats.projection / 1000).toFixed(0)}k`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={stats.projection >= goalValue ? 'up' : 'down'}
        />
        <KPICard
          label="Em Negociação"
          value={`R$ ${(pipelineStats.negotiationValue / 1000).toFixed(1)}k`}
          icon={<Users className="h-5 w-5" />}
          variant="warning"
        />
        <KPICard
          label="Leads no Pipeline"
          value={pipelineStats.leadCount.toString()}
          icon={<Kanban className="h-5 w-5" />}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Taxa de Conversão"
          value={`${pipelineStats.conversionRate.toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRLShort(pipelineStats.averageTicket)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          label="Fechados no Mês"
          value={`R$ ${(pipelineStats.closedValue / 1000).toFixed(1)}k`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          label="Total no Pipeline"
          value={`R$ ${(pipelineStats.totalValue / 1000).toFixed(1)}k`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Pipeline Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pipeline Recente</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/comercial/pipeline" className="gap-1">
              Ver todos <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum cliente no pipeline ainda.</p>
                <Button 
                  variant="outline" 
                  className="mt-4 gap-2"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro cliente
                </Button>
              </div>
            ) : (
              recentClients.map((client) => {
                const daysInPipeline = Math.floor(
                  (new Date().getTime() - new Date(client.dataEntrada || client.entryDate || new Date()).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border hover:border-muted-foreground/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/comercial/pipeline')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client.clientName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{daysInPipeline} {daysInPipeline === 1 ? 'dia' : 'dias'} no pipeline</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold tabular-nums">
                        R$ {(client.entrada || client.dealValue || 0).toLocaleString('pt-BR')}
                      </span>
                      <Badge className={STAGE_COLORS[client.stage]}>
                        {STAGE_LABELS[client.stage]}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales by Category Table */}
      <SalesByCategoryTable />

      <CreateClientDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
      <EditGoalDialog 
        open={editGoalOpen} 
        onOpenChange={setEditGoalOpen} 
      />
    </div>
  );
}
