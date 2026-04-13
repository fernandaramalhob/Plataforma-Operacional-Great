import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCEOMetrics } from '@/hooks/useCEOData';
import { useCEOHistoricalData } from '@/hooks/useCEOHistoricalData';
import { useCommercialGoals, useUpsertCommercialGoal } from '@/hooks/useCommercialGoals';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/userMapping';
import { 
  Target, DollarSign, Users, CheckCircle2, 
  TrendingUp, TrendingDown, Minus, ArrowRight, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface GoalItemProps {
  label: string;
  icon: React.ReactNode;
  current: number;
  goal: number;
  format?: 'currency' | 'number' | 'percent';
  trend?: number;
  description?: string;
  onEditGoal?: () => void;
  canEdit?: boolean;
}

function GoalItem({ label, icon, current, goal, format: formatType = 'number', trend, description, onEditGoal, canEdit }: GoalItemProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 150) : 0;
  const displayPercentage = goal > 0 ? (current / goal) * 100 : 0;
  const isAchieved = current >= goal;
  const isClose = percentage >= 80 && percentage < 100;
  const isBehind = percentage < 50;

  const formatValue = (value: number) => {
    if (formatType === 'currency') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    }
    if (formatType === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('pt-BR');
  };

  const getStatusColor = () => {
    if (isAchieved) return 'text-green-600';
    if (isClose) return 'text-yellow-600';
    if (isBehind) return 'text-red-600';
    return 'text-primary';
  };

  const getProgressColor = () => {
    if (isAchieved) return 'bg-green-500';
    if (isClose) return 'bg-yellow-500';
    if (isBehind) return 'bg-red-500';
    return 'bg-primary';
  };

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-background">
            {icon}
          </div>
          <div>
            <h4 className="font-medium text-sm">{label}</h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onEditGoal && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEditGoal}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {isAchieved ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Atingida
            </Badge>
          ) : isClose ? (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Quase lá
            </Badge>
          ) : isBehind ? (
            <Badge variant="destructive">
              Atrás
            </Badge>
          ) : (
            <Badge variant="secondary">
              Em progresso
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getStatusColor()}`}>
              {formatValue(current)}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Meta: {formatValue(goal)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${getStatusColor()}`}>
              {displayPercentage.toFixed(0)}%
            </span>
            {trend !== undefined && (
              <span className={`flex items-center text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3 mr-0.5" />
                {Math.abs(trend).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          {percentage > 100 && (
            <div 
              className="absolute top-0 h-full bg-green-300 dark:bg-green-700 rounded-r-full transition-all duration-500"
              style={{ 
                left: '100%', 
                width: `${Math.min((percentage - 100), 50)}%`,
                marginLeft: '-2px'
              }}
            />
          )}
          {/* Goal marker */}
          <div 
            className="absolute top-0 w-0.5 h-full bg-foreground/50"
            style={{ left: 'calc(100% - 1px)' }}
          />
        </div>

        {/* Mini breakdown */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>50%</span>
          <span>Meta</span>
        </div>
      </div>
    </div>
  );
}

interface CEOGoalsProgressProps {
  period?: string;
}

export function CEOGoalsProgress({ period }: CEOGoalsProgressProps) {
  const selectedPeriod = period || format(new Date(), 'yyyy-MM');
  const { user } = useAuth();
  const canEdit = isAdmin(user?.email || '');
  
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useCEOMetrics(selectedPeriod);
  const { data: historicalData, isLoading: historyLoading, error: historyError } = useCEOHistoricalData(3);
  const { data: commercialGoals, isLoading: goalsLoading } = useCommercialGoals();
  const upsertGoal = useUpsertCommercialGoal();

  // Edit goal dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<'revenue' | 'clients' | 'activeClients' | 'tasks'>('revenue');
  const [editGoalValue, setEditGoalValue] = useState('');

  const isLoading = metricsLoading || historyLoading || goalsLoading;
  const hasError = metricsError || historyError;

  // Calculate trends from historical data
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Safe access to historical data with proper null checks
  const previousMonth = historicalData && historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
  const currentMonth = historicalData && historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

  // Get goals from database or calculate defaults
  const currentMonthGoal = commercialGoals?.find(g => g.month === selectedPeriod);
  
  // Define goals based on database or historical averages as fallback
  const avgRevenue = (historicalData?.reduce((sum, m) => sum + m.revenue, 0) || 0) / Math.max(historicalData?.length || 1, 1);
  const avgClients = Math.ceil((historicalData?.reduce((sum, m) => sum + m.newClients, 0) || 0) / Math.max(historicalData?.length || 1, 1));
  const avgTasks = Math.ceil((historicalData?.reduce((sum, m) => sum + m.tasksDone, 0) || 0) / Math.max(historicalData?.length || 1, 1));

  // Use database goal for revenue, otherwise calculate from history
  const revenueGoal = currentMonthGoal?.goal_value || Math.max(avgRevenue * 1.2, 50000);
  const clientsGoal = Math.max(avgClients + 3, 5);
  const tasksGoal = Math.max(avgTasks + 5, 20);
  const activeClientsGoal = Math.max((metrics?.operational?.activeClients || 0) + 2, 10);

  const handleEditGoal = (type: 'revenue' | 'clients' | 'activeClients' | 'tasks') => {
    setEditingGoalType(type);
    const currentGoalValue = type === 'revenue' ? revenueGoal : type === 'clients' ? clientsGoal : type === 'activeClients' ? activeClientsGoal : tasksGoal;
    setEditGoalValue(currentGoalValue.toString());
    setEditDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    const value = parseFloat(editGoalValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (editingGoalType === 'revenue') {
      try {
        await upsertGoal.mutateAsync({ month: selectedPeriod, goalValue: value });
        toast.success('Meta de receita atualizada!');
        setEditDialogOpen(false);
      } catch (error) {
        toast.error('Erro ao salvar meta');
      }
    } else {
      toast.info('Meta atualizada localmente');
      setEditDialogOpen(false);
    }
  };

  const getGoalLabel = () => {
    switch (editingGoalType) {
      case 'revenue': return 'Meta de Receita';
      case 'clients': return 'Meta de Novos Clientes';
      case 'activeClients': return 'Meta de Clientes Ativos';
      case 'tasks': return 'Meta de Tarefas';
    }
  };

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas vs Realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Erro ao carregar dados. Tente novamente.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas vs Realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trends safely
  const revenueTrend = previousMonth && currentMonth 
    ? calculateTrend(currentMonth.revenue, previousMonth.revenue) 
    : undefined;
  
  const clientsTrend = previousMonth && currentMonth 
    ? calculateTrend(currentMonth.newClients, previousMonth.newClients) 
    : undefined;

  const tasksTrend = previousMonth && currentMonth 
    ? calculateTrend(currentMonth.tasksDone, previousMonth.tasksDone) 
    : undefined;

  // Safe access to metrics with defaults
  const commercialRevenue = metrics?.commercial?.revenue || 0;
  const operationalNewClients = metrics?.operational?.newClients || 0;
  const operationalActiveClients = metrics?.operational?.activeClients || 0;
  const operationalTasksDone = metrics?.operational?.tasksDone || 0;
  const mrrEstimated = metrics?.commercial?.mrrEstimated || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas vs Realizado
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {format(new Date(selectedPeriod + '-01'), 'MMMM yyyy')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <GoalItem
              label="Receita do Mês"
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              current={commercialRevenue}
              goal={revenueGoal}
              format="currency"
              trend={revenueTrend}
              description="Faturamento de novos contratos"
              canEdit={canEdit}
              onEditGoal={() => handleEditGoal('revenue')}
            />

            <GoalItem
              label="Novos Clientes"
              icon={<Users className="h-4 w-4 text-blue-600" />}
              current={operationalNewClients}
              goal={clientsGoal}
              trend={clientsTrend}
              description="Clientes fechados no período"
              canEdit={canEdit}
              onEditGoal={() => handleEditGoal('clients')}
            />

            <GoalItem
              label="Clientes Ativos"
              icon={<Users className="h-4 w-4 text-primary" />}
              current={operationalActiveClients}
              goal={activeClientsGoal}
              description="Base ativa total"
              canEdit={canEdit}
              onEditGoal={() => handleEditGoal('activeClients')}
            />

            <GoalItem
              label="Tarefas Concluídas"
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              current={operationalTasksDone}
              goal={tasksGoal}
              trend={tasksTrend}
              description="Entregas do time operacional"
              canEdit={canEdit}
              onEditGoal={() => handleEditGoal('tasks')}
            />
          </div>

          {/* Summary footer */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Atingida</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">&gt;80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">&lt;50%</span>
              </div>
            </div>
            <div className="text-muted-foreground">
              MRR Estimado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrEstimated)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Goal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getGoalLabel()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goalValue">Valor da Meta</Label>
              <Input
                id="goalValue"
                type="number"
                value={editGoalValue}
                onChange={(e) => setEditGoalValue(e.target.value)}
                placeholder={editingGoalType === 'revenue' ? 'Ex: 100000' : 'Ex: 10'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGoal} disabled={upsertGoal.isPending}>
              {upsertGoal.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
