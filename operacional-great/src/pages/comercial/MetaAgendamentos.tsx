import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Target, Users, TrendingUp, Calendar, Save, Loader2, Edit2, Sparkles } from 'lucide-react';
import { useCommercial, AGENDADOR_OPTIONS, Agendador } from '@/contexts/CommercialContext';
import { useSDRGoalsDB, useUpsertSDRGoal } from '@/hooks/useCommercialGoals';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { PeriodFilter, PeriodFilterValue, usePeriodFilter } from '@/components/comercial/PeriodFilter';

const DAILY_GOAL = 8;
const SDR_NAMES: Record<string, string> = {
  MIGUEL: 'Miguel',
  HEBERT: 'Hebert',
};

export default function MetaAgendamentos() {
  const { pipelineClients } = useCommercial();
  const { data: sdrGoalsDB, isLoading: isLoadingGoals } = useSDRGoalsDB();
  const upsertSDRGoal = useUpsertSDRGoal();
  const queryClient = useQueryClient();
  const { filterByPeriod } = usePeriodFilter();

  // Period filter state
  const [period, setPeriod] = useState<PeriodFilterValue>('current_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Fetch general goal from commercial_settings
  const { data: generalGoalData } = useQuery({
    queryKey: ['scheduling-general-goal', currentMonthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_settings')
        .select('setting_value')
        .eq('setting_key', `scheduling_general_goal_${currentMonthKey}`)
        .maybeSingle();
      
      if (error) throw error;
      return data?.setting_value ? parseInt(data.setting_value) : 0;
    },
  });

  // Mutation to save general goal
  const saveGeneralGoalMutation = useMutation({
    mutationFn: async (goalValue: number) => {
      const { error } = await supabase
        .from('commercial_settings')
        .upsert({
          setting_key: `scheduling_general_goal_${currentMonthKey}`,
          setting_value: goalValue.toString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-general-goal'] });
      toast.success('Meta geral salva!');
    },
    onError: () => {
      toast.error('Erro ao salvar meta geral');
    },
  });

  const [generalGoal, setGeneralGoal] = useState('');
  const [isEditingGeneralGoal, setIsEditingGeneralGoal] = useState(false);

  useEffect(() => {
    if (generalGoalData !== undefined) {
      setGeneralGoal(generalGoalData > 0 ? generalGoalData.toString() : '');
    }
  }, [generalGoalData]);

  const [goals, setGoals] = useState<Record<Agendador, string>>(() => {
    const initial: Record<Agendador, string> = {} as Record<Agendador, string>;
    AGENDADOR_OPTIONS.forEach(a => {
      initial[a.value] = '';
    });
    return initial;
  });

  // Load current goals from database
  useEffect(() => {
    if (sdrGoalsDB) {
      const newGoals: Record<Agendador, string> = {} as Record<Agendador, string>;
      AGENDADOR_OPTIONS.forEach(a => {
        const dbGoal = sdrGoalsDB.find(g => g.agendador === a.value && g.month === currentMonthKey);
        newGoals[a.value] = dbGoal?.goal_count ? dbGoal.goal_count.toString() : '';
      });
      setGoals(newGoals);
    }
  }, [sdrGoalsDB, currentMonthKey]);

  // Calculate SDR scheduling stats filtered by selected period
  const sdrStats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    const stats: Record<Agendador, { scheduledCount: number; todayCount: number }> = {} as Record<Agendador, { scheduledCount: number; todayCount: number }>;

    AGENDADOR_OPTIONS.forEach(a => {
      const scheduledLeads = pipelineClients.filter(c => {
        if (c.agendadoPor !== a.value) return false;
        const entryDate = c.dataEntrada instanceof Date ? c.dataEntrada : new Date(c.dataEntrada);
        return filterByPeriod(entryDate, period, customStart, customEnd);
      });

      // Today count always uses current day (not affected by period filter)
      const todayLeads = pipelineClients.filter(c => {
        if (c.agendadoPor !== a.value) return false;
        const entryDate = c.dataEntrada instanceof Date ? c.dataEntrada : new Date(c.dataEntrada);
        return entryDate >= todayStart && entryDate <= todayEnd;
      });

      stats[a.value] = {
        scheduledCount: scheduledLeads.length,
        todayCount: todayLeads.length,
      };
    });

    return stats;
  }, [pipelineClients, period, customStart, customEnd, filterByPeriod]);

  // Track which SDRs have already been celebrated today to avoid repeated celebrations
  const [celebratedSDRs, setCelebratedSDRs] = useState<Set<string>>(new Set());

  // Celebration function
  const triggerCelebration = useCallback((sdrName: string) => {
    // Fire confetti from both sides
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Show celebration toast
    toast.success(`🎉 ${sdrName} BATEU A META!!! 🎉`, {
      duration: 5000,
      style: {
        fontSize: '1.25rem',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
      },
    });
  }, []);

  // Check for daily goal achievement
  useEffect(() => {
    const sdrsToCheck = ['MIGUEL', 'HEBERT'] as const;
    
    sdrsToCheck.forEach(sdr => {
      const todayCount = sdrStats[sdr]?.todayCount || 0;
      
      if (todayCount >= DAILY_GOAL && !celebratedSDRs.has(sdr)) {
        triggerCelebration(SDR_NAMES[sdr]);
        setCelebratedSDRs(prev => new Set(prev).add(sdr));
      }
    });
  }, [sdrStats, celebratedSDRs, triggerCelebration]);

  // Calculate total scheduled filtered by selected period
  const totalScheduled = useMemo(() => {
    return pipelineClients.filter(c => {
      const entryDate = c.dataEntrada instanceof Date ? c.dataEntrada : new Date(c.dataEntrada);
      if (!filterByPeriod(entryDate, period, customStart, customEnd)) return false;
      // Exclude entries without agendador that are still in NOVO stage (non-appointments)
      if (!c.agendadoPor && c.stage === 'NOVO') return false;
      return true;
    }).length;
  }, [pipelineClients, period, customStart, customEnd, filterByPeriod]);

  const handleSaveGoal = async (agendador: Agendador) => {
    const value = parseInt(goals[agendador]) || 0;
    if (value <= 0) {
      toast.error('A meta deve ser maior que zero');
      return;
    }

    try {
      await upsertSDRGoal.mutateAsync({
        agendador,
        month: currentMonthKey,
        goalCount: value,
      });
      toast.success(`Meta de ${AGENDADOR_OPTIONS.find(a => a.value === agendador)?.label} salva!`);
    } catch (error) {
      toast.error('Erro ao salvar meta');
    }
  };

  const handleSaveAll = async () => {
    try {
      const promises = AGENDADOR_OPTIONS.map(a => {
        const value = parseInt(goals[a.value]) || 0;
        if (value > 0) {
          return upsertSDRGoal.mutateAsync({
            agendador: a.value,
            month: currentMonthKey,
            goalCount: value,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success('Todas as metas foram salvas!');
    } catch (error) {
      toast.error('Erro ao salvar metas');
    }
  };

  const handleSaveGeneralGoal = () => {
    const value = parseInt(generalGoal) || 0;
    if (value <= 0) {
      toast.error('A meta geral deve ser maior que zero');
      return;
    }
    saveGeneralGoalMutation.mutate(value);
    setIsEditingGeneralGoal(false);
  };

  // Calculate totals using individual goals
  const totalsFromIndividual = AGENDADOR_OPTIONS.reduce(
    (acc, a) => {
      acc.scheduled += sdrStats[a.value]?.scheduledCount || 0;
      acc.goal += parseInt(goals[a.value]) || 0;
      return acc;
    },
    { scheduled: 0, goal: 0 }
  );



  // Use general goal if set, otherwise sum of individual goals
  const generalGoalValue = parseInt(generalGoal) || 0;
  const effectiveGeneralGoal = generalGoalValue > 0 ? generalGoalValue : totalsFromIndividual.goal;
  const totalProgress = effectiveGeneralGoal > 0 ? Math.min((totalScheduled / effectiveGeneralGoal) * 100, 100) : 0;

  if (isLoadingGoals) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meta de Agendamentos</h1>
            <p className="text-sm text-muted-foreground">
              Defina e acompanhe as metas de agendamentos por SDR
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
          <Button onClick={handleSaveAll} disabled={upsertSDRGoal.isPending}>
            {upsertSDRGoal.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Todas
          </Button>
        </div>
      </div>

      {/* General Goal Card - Modern Design */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 animate-pulse" />
        
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Meta Geral</span>
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Progresso total de agendamentos • {currentMonthLabel}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditingGeneralGoal(!isEditingGeneralGoal)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-6 pt-4">
          {isEditingGeneralGoal && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <Input
                type="number"
                min="0"
                value={generalGoal}
                onChange={(e) => setGeneralGoal(e.target.value)}
                placeholder="Meta de agendamentos"
                className="max-w-[180px] bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              />
              <Button 
                size="sm" 
                onClick={handleSaveGeneralGoal}
                disabled={saveGeneralGoalMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                {saveGeneralGoalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          {/* Main stats display */}
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-amber-400 bg-clip-text text-transparent">
                  {totalScheduled}
                </span>
                <span className="text-2xl text-slate-500">/ {effectiveGeneralGoal || '—'}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">agendamentos realizados</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">
                {effectiveGeneralGoal > 0 ? `${totalProgress.toFixed(1)}%` : '—'}
              </span>
              <p className="text-sm text-slate-400">da meta</p>
            </div>
          </div>
          
          {/* Modern Fire Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-4 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm">
              {/* Base progress */}
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${Math.min(totalProgress, 100)}%`,
                  background: 'linear-gradient(90deg, #f97316 0%, #ef4444 50%, #f59e0b 100%)',
                }}
              />
              
              {/* Animated glow overlay */}
              {totalProgress > 0 && (
                <div 
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ 
                    width: `${Math.min(totalProgress, 100)}%`,
                    background: 'linear-gradient(90deg, rgba(249,115,22,0.4) 0%, rgba(239,68,68,0.4) 50%, rgba(245,158,11,0.4) 100%)',
                    animation: 'fireGlow 2s ease-in-out infinite',
                  }}
                />
              )}
              
              {/* Shine effect */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                }}
              />
              
              {/* Leading edge fire effect */}
              {totalProgress > 2 && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                  style={{ 
                    left: `calc(${Math.min(totalProgress, 100)}% - 16px)`,
                    background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(249,115,22,0.4) 40%, transparent 70%)',
                    animation: 'firePulse 1s ease-in-out infinite',
                    filter: 'blur(4px)',
                  }}
                />
              )}
            </div>
            
            {/* Progress markers */}
            <div className="flex justify-between text-xs text-slate-500">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* CSS Animations */}
          <style>{`
            @keyframes fireGlow {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
            @keyframes firePulse {
              0%, 100% { transform: translateY(-50%) scale(1); opacity: 0.8; }
              50% { transform: translateY(-50%) scale(1.3); opacity: 1; }
            }
          `}</style>
          
          {generalGoalValue > 0 && (
            <p className="text-xs text-slate-500 text-center">
              Meta geral definida: <span className="text-slate-300 font-medium">{generalGoalValue}</span> agendamentos
            </p>
          )}
        </CardContent>
      </Card>

      {/* SDR Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENDADOR_OPTIONS.map(agendador => {
          const scheduledCount = sdrStats[agendador.value]?.scheduledCount || 0;
          const todayCount = sdrStats[agendador.value]?.todayCount || 0;
          const goalValue = parseInt(goals[agendador.value]) || 0;
          const progress = goalValue > 0 ? Math.min((scheduledCount / goalValue) * 100, 100) : 0;
          const isAchieved = goalValue > 0 && scheduledCount >= goalValue;
          const isSDRWithDailyGoal = agendador.value === 'MIGUEL' || agendador.value === 'HEBERT';
          const dailyGoalProgress = isSDRWithDailyGoal ? Math.min((todayCount / DAILY_GOAL) * 100, 100) : 0;
          const dailyGoalAchieved = isSDRWithDailyGoal && todayCount >= DAILY_GOAL;

          return (
            <Card 
              key={agendador.value} 
              className={`${isAchieved ? 'border-green-500/50 bg-green-500/5' : ''} ${dailyGoalAchieved ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {agendador.label}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {dailyGoalAchieved && (
                      <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Meta Diária!
                      </span>
                    )}
                    {isAchieved && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        ✓ Meta Mensal
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Daily Progress for Miguel/Felipe */}
                {isSDRWithDailyGoal && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Meta Diária (Hoje)
                      </span>
                      <span className="text-sm font-bold">
                        {todayCount} / {DAILY_GOAL}
                      </span>
                    </div>
                    <Progress 
                      value={dailyGoalProgress} 
                      className={`h-2 ${dailyGoalAchieved ? '[&>div]:bg-yellow-500' : ''}`} 
                    />
                    {dailyGoalAchieved && (
                      <p className="text-xs text-yellow-600 font-medium mt-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Parabéns! Meta diária atingida!
                      </p>
                    )}
                  </div>
                )}

                {/* Monthly Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Agendamentos (Mês)</span>
                    <span className="text-sm font-medium">
                      {scheduledCount} / {goalValue || '—'}
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-2 ${isAchieved ? '[&>div]:bg-green-500' : ''}`} 
                  />
                  {goalValue > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.toFixed(0)}% concluído
                    </p>
                  )}
                </div>

                {/* Goal Input */}
                <div className="space-y-2">
                  <Label htmlFor={`goal-${agendador.value}`} className="text-sm">
                    Meta mensal
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`goal-${agendador.value}`}
                      type="number"
                      min="0"
                      value={goals[agendador.value]}
                      onChange={(e) => setGoals(prev => ({ 
                        ...prev, 
                        [agendador.value]: e.target.value 
                      }))}
                      placeholder="Ex: 30"
                      className="flex-1"
                    />
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleSaveGoal(agendador.value)}
                      disabled={upsertSDRGoal.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
