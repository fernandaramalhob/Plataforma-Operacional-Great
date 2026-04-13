import { useState, useMemo } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DollarSign, TrendingUp, CreditCard, Receipt, Settings,
  Download, Users, PieChart as PieChartIcon, Plus, Pencil, Trash2,
  Droplets, Zap, Wifi, Home, Monitor, Megaphone, MoreHorizontal,
  AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar,
  Repeat, HelpCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  useCEOMetrics, useTeamCostConfig, useUpdateTeamCostConfig,
  useExpenseCategories, useCreateExpenseCategory, useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
  useExpensesHistory, useFixedExpenses, useGenerateFixedExpenses,
  Expense
} from '@/hooks/useCEOData';
import { useCEORealtime } from '@/hooks/useCEORealtime';
import { useMonthFilter } from '@/components/comercial/MonthPeriodFilter';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ICON_MAP: Record<string, React.ReactNode> = {
  'Droplets': <Droplets className="h-4 w-4" />,
  'Zap': <Zap className="h-4 w-4" />,
  'Wifi': <Wifi className="h-4 w-4" />,
  'CreditCard': <CreditCard className="h-4 w-4" />,
  'TrendingUp': <TrendingUp className="h-4 w-4" />,
  'Home': <Home className="h-4 w-4" />,
  'Users': <Users className="h-4 w-4" />,
  'Monitor': <Monitor className="h-4 w-4" />,
  'Megaphone': <Megaphone className="h-4 w-4" />,
  'MoreHorizontal': <MoreHorizontal className="h-4 w-4" />,
};

const RECURRENCE_LABELS: Record<string, string> = {
  'UNICO': 'Único',
  'MENSAL': 'Mensal',
  'TRIMESTRAL': 'Trimestral',
  'ANUAL': 'Anual',
};

const VARIATION_THRESHOLD = 20; // Alert if variation > 20%

export default function CEOFinanceiro() {
  // Enable real-time updates
  useCEORealtime();
  
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [fixedExpensesDialogOpen, setFixedExpensesDialogOpen] = useState(false);
  const [isFixedExpense, setIsFixedExpense] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'MoreHorizontal', color: '#6b7280' });
  
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    description: '',
    amount: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    recurrence: 'UNICO',
    notes: '',
  });
  
  const { monthOptions } = useMonthFilter(12);
  
  const { data: metrics, isLoading } = useCEOMetrics(selectedPeriod);
  const { data: costConfig } = useTeamCostConfig();
  const updateCost = useUpdateTeamCostConfig();
  const { data: categories } = useExpenseCategories();
  const { data: expenses, isLoading: expensesLoading } = useExpenses(selectedPeriod);
  const { data: expensesHistory } = useExpensesHistory(6);
  const { data: fixedExpenses } = useFixedExpenses();
  const generateFixedExpenses = useGenerateFixedExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createCategory = useCreateExpenseCategory();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleUpdateCost = async () => {
    if (!newCost) return;
    try {
      await updateCost.mutateAsync(parseFloat(newCost));
      toast.success('Custo por equipe atualizado!');
      setCostDialogOpen(false);
    } catch {
      toast.error('Erro ao atualizar custo');
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category_id: '',
      description: '',
      amount: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      recurrence: 'UNICO',
      notes: '',
    });
    setEditingExpense(null);
    setIsFixedExpense(false);
  };

  const handleOpenExpenseDialog = (expense?: Expense, asFixed?: boolean) => {
    if (expense) {
      setEditingExpense(expense);
      setIsFixedExpense(expense.recurrence !== 'UNICO');
      setExpenseForm({
        category_id: expense.category_id || '',
        description: expense.description,
        amount: expense.amount.toString(),
        expense_date: expense.expense_date,
        recurrence: expense.recurrence || 'UNICO',
        notes: expense.notes || '',
      });
    } else {
      resetExpenseForm();
      if (asFixed) {
        setIsFixedExpense(true);
        setExpenseForm(prev => ({ ...prev, recurrence: 'MENSAL' }));
      }
    }
    setExpenseDialogOpen(true);
  };

  const handleGenerateFixedExpenses = async () => {
    try {
      const result = await generateFixedExpenses.mutateAsync(selectedPeriod);
      if (result.length > 0) {
        toast.success(`${result.length} despesas fixas geradas para o período!`);
      } else {
        toast.info('Todas as despesas fixas já foram geradas para este período.');
      }
    } catch {
      toast.error('Erro ao gerar despesas fixas');
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const data = {
        category_id: expenseForm.category_id || null,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        recurrence: expenseForm.recurrence,
        notes: expenseForm.notes || null,
        created_by_user_id: null,
      };

      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...data });
        toast.success('Despesa atualizada!');
      } else {
        await createExpense.mutateAsync(data);
        toast.success('Despesa adicionada!');
      }
      
      setExpenseDialogOpen(false);
      resetExpenseForm();
    } catch {
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense.mutateAsync(expenseToDelete.id);
      toast.success('Despesa excluída!');
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch {
      toast.error('Erro ao excluir despesa');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    try {
      await createCategory.mutateAsync(newCategory);
      toast.success('Categoria criada com sucesso!');
      setCategoryDialogOpen(false);
      setNewCategory({ name: '', icon: 'MoreHorizontal', color: '#6b7280' });
    } catch {
      toast.error('Erro ao criar categoria');
    }
  };

  // Calculate totals
  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalFixedExpenses = fixedExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  
  // Group expenses by category for chart
  const expensesByCategory = expenses?.reduce((acc, exp) => {
    const categoryName = exp.category?.name || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = { name: categoryName, value: 0, color: exp.category?.color || '#6b7280' };
    }
    acc[categoryName].value += exp.amount;
    return acc;
  }, {} as Record<string, { name: string; value: number; color: string }>) || {};
  
  const expenseChartData = Object.values(expensesByCategory);

  // Calculate monthly comparison data
  const monthlyComparisonData = useMemo(() => {
    if (!expensesHistory || expensesHistory.length === 0) return [];
    
    const monthlyTotals: Record<string, number> = {};
    
    expensesHistory.forEach(exp => {
      const monthKey = format(parseISO(exp.expense_date), 'yyyy-MM');
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount;
    });
    
    // Get last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });
      months.push({
        month: monthKey,
        label: monthLabel,
        total: monthlyTotals[monthKey] || 0,
      });
    }
    
    // Calculate variation
    return months.map((m, idx) => {
      const prevTotal = idx > 0 ? months[idx - 1].total : m.total;
      const variation = prevTotal > 0 ? ((m.total - prevTotal) / prevTotal) * 100 : 0;
      return { ...m, variation: Math.round(variation) };
    });
  }, [expensesHistory]);

  // Calculate variation alerts
  const variationAlerts = useMemo(() => {
    if (monthlyComparisonData.length < 2) return [];
    
    const currentMonth = monthlyComparisonData[monthlyComparisonData.length - 1];
    const previousMonth = monthlyComparisonData[monthlyComparisonData.length - 2];
    
    if (!currentMonth || !previousMonth || previousMonth.total === 0) return [];
    
    const alerts: { category: string; variation: number; current: number; previous: number }[] = [];
    
    // Group by category for current and previous month
    const currentMonthKey = monthlyComparisonData[monthlyComparisonData.length - 1]?.month;
    const previousMonthKey = monthlyComparisonData[monthlyComparisonData.length - 2]?.month;
    
    if (!currentMonthKey || !previousMonthKey) return [];
    
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};
    
    expensesHistory?.forEach(exp => {
      const monthKey = format(parseISO(exp.expense_date), 'yyyy-MM');
      const catName = exp.category?.name || 'Sem categoria';
      
      if (monthKey === currentMonthKey) {
        currentByCategory[catName] = (currentByCategory[catName] || 0) + exp.amount;
      } else if (monthKey === previousMonthKey) {
        previousByCategory[catName] = (previousByCategory[catName] || 0) + exp.amount;
      }
    });
    
    // Check for significant variations
    Object.keys({ ...currentByCategory, ...previousByCategory }).forEach(cat => {
      const current = currentByCategory[cat] || 0;
      const previous = previousByCategory[cat] || 0;
      
      if (previous > 0) {
        const variation = ((current - previous) / previous) * 100;
        if (Math.abs(variation) >= VARIATION_THRESHOLD) {
          alerts.push({ category: cat, variation: Math.round(variation), current, previous });
        }
      } else if (current > 0) {
        alerts.push({ category: cat, variation: 100, current, previous: 0 });
      }
    });
    
    return alerts.sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation)).slice(0, 5);
  }, [monthlyComparisonData, expensesHistory]);

  // Prepare chart data
  const productsByTeamData = metrics?.productsSold?.byTeam 
    ? Object.entries(metrics.productsSold.byTeam).map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value,
      }))
    : [];

  // Revenue trend simulation
  const revenueTrendData = [
    { day: '01', receita: Math.random() * 10000 + 5000 },
    { day: '05', receita: Math.random() * 10000 + 5000 },
    { day: '10', receita: Math.random() * 10000 + 5000 },
    { day: '15', receita: Math.random() * 10000 + 5000 },
    { day: '20', receita: Math.random() * 10000 + 5000 },
    { day: '25', receita: Math.random() * 10000 + 5000 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold">Financeiro</h1>
          </div>
          <p className="text-muted-foreground mt-1">Dados financeiros em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.slice(0, 12).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Custo por Equipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Custo médio mensal por equipe (R$)</Label>
                  <Input
                    type="number"
                    placeholder={costConfig?.default_team_cost?.toString() || '13000'}
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor atual: {formatCurrency(costConfig?.default_team_cost || 13000)}
                  </p>
                </div>
                <Button onClick={handleUpdateCost} className="w-full" disabled={updateCost.isPending}>
                  {updateCost.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Finance KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Receita Total
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Receita Total</p>
                    <p className="text-xs text-muted-foreground">Soma de todos os valores de vendas fechadas no período selecionado.</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Pipeline comercial (clientes fechados) + CRM Events (vendas operacionais)</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.commercial.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Despesas Totais
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Despesas Totais</p>
                    <p className="text-xs text-muted-foreground">Soma de todas as despesas lançadas no período, incluindo despesas fixas e variáveis.</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Tabela expenses (despesas) filtrada pelo período</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses?.length || 0} lançamentos
            </p>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              MRR Estimado
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">MRR Estimado</p>
                    <p className="text-xs text-muted-foreground">Receita Recorrente Mensal estimada com base nos clientes ativos e seus planos (mensal, trimestral, semestral).</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Clientes operacionais ativos (deal_value ÷ duração do plano)</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.commercial.mrrEstimated || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Receita recorrente mensal
            </p>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Para Renovar
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Clientes Para Renovar</p>
                    <p className="text-xs text-muted-foreground">Quantidade de clientes ativos com data de renovação nos próximos 30 dias.</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Clientes operacionais (renewal_due_date)</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{(metrics?.operational as any)?.clientsToRenew || 0}</div>
            <p className="text-xs text-muted-foreground">
              Clientes próximos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Custo/Cliente
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Custo por Cliente</p>
                    <p className="text-xs text-muted-foreground">Despesas totais do período dividido pelo número de clientes ativos.</p>
                    <div className="pt-1 border-t">
                      <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                      <p className="text-xs text-muted-foreground">Despesas ÷ Clientes operacionais ativos</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.operational.activeClients 
                ? totalExpenses / metrics.operational.activeClients 
                : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.operational.activeClients || 0} clientes ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <PieChartIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(metrics?.commercial.revenue || 0) - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency((metrics?.commercial.revenue || 0) - totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita - Despesas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="fixed">Despesas Fixas</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          <TabsTrigger value="revenue">Receitas</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Variation Alerts */}
          {variationAlerts.length > 0 && (
            <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800 dark:text-orange-400">Alertas de Variação</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  {variationAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-orange-700 dark:text-orange-300">{alert.category}</span>
                      <div className="flex items-center gap-2">
                        {alert.variation > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-red-500" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-green-500" />
                        )}
                        <span className={alert.variation > 0 ? 'text-red-600' : 'text-green-600'}>
                          {alert.variation > 0 ? '+' : ''}{alert.variation}%
                        </span>
                        <span className="text-muted-foreground">
                          ({formatCurrency(alert.previous)} → {formatCurrency(alert.current)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gestão de Despesas</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleGenerateFixedExpenses} disabled={generateFixedExpenses.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generateFixedExpenses.isPending ? 'animate-spin' : ''}`} />
                Gerar Fixas do Mês
              </Button>
              <Button onClick={() => handleOpenExpenseDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Expenses Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Lançamentos do Período</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : expenses && expenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Recorrência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span 
                                className="p-1 rounded" 
                                style={{ backgroundColor: expense.category?.color || '#6b7280', color: 'white' }}
                              >
                                {ICON_MAP[expense.category?.icon || 'MoreHorizontal']}
                              </span>
                              {expense.category?.name || 'Sem categoria'}
                            </div>
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {RECURRENCE_LABELS[expense.recurrence || 'UNICO']}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenExpenseDialog(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setExpenseToDelete(expense);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma despesa lançada neste período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {expenseChartData.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fixed Expenses Tab */}
        <TabsContent value="fixed" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Despesas Fixas</h2>
              <p className="text-sm text-muted-foreground">
                Despesas recorrentes que são geradas automaticamente a cada período
              </p>
            </div>
            <Button onClick={() => handleOpenExpenseDialog(undefined, true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa Fixa
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Fixed Expenses Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Resumo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(totalFixedExpenses)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fixedExpenses?.length || 0} despesas fixas cadastradas
                  </p>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Distribuição por recorrência:</p>
                    <div className="space-y-1">
                      {['MENSAL', 'TRIMESTRAL', 'ANUAL'].map(rec => {
                        const count = fixedExpenses?.filter(e => e.recurrence === rec).length || 0;
                        const total = fixedExpenses?.filter(e => e.recurrence === rec).reduce((s, e) => s + e.amount, 0) || 0;
                        if (count === 0) return null;
                        return (
                          <div key={rec} className="flex justify-between text-sm">
                            <span>{RECURRENCE_LABELS[rec]}</span>
                            <span className="font-medium">{formatCurrency(total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Expenses List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Lista de Despesas Fixas</CardTitle>
              </CardHeader>
              <CardContent>
                {fixedExpenses && fixedExpenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Recorrência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span 
                                className="p-1 rounded" 
                                style={{ backgroundColor: expense.category?.color || '#6b7280', color: 'white' }}
                              >
                                {ICON_MAP[expense.category?.icon || 'MoreHorizontal']}
                              </span>
                              {expense.category?.name || 'Sem categoria'}
                            </div>
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {RECURRENCE_LABELS[expense.recurrence || 'MENSAL']}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenExpenseDialog(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setExpenseToDelete(expense);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma despesa fixa cadastrada</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => handleOpenExpenseDialog(undefined, true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar primeira despesa fixa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Comparativo Mensal</h2>
            <p className="text-sm text-muted-foreground">
              Evolução das despesas nos últimos 6 meses
            </p>
          </div>

          {/* Monthly Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} className="text-xs" domain={[-100, 100]} />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'total') return [formatCurrency(value as number), 'Total'];
                        if (name === 'variation') return [`${value}%`, 'Variação'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="total" 
                      fill="hsl(var(--primary) / 0.2)" 
                      stroke="hsl(var(--primary))"
                      name="Total"
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="variation" 
                      name="Variação %"
                      radius={[4, 4, 0, 0]}
                    >
                      {monthlyComparisonData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.variation >= 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  Sem dados históricos suficientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detalhamento por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyComparisonData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead>Tendência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyComparisonData.map((month, idx) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium capitalize">{month.label}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.total)}</TableCell>
                        <TableCell className="text-right">
                          {idx > 0 && (
                            <span className={month.variation >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {month.variation >= 0 ? '+' : ''}{month.variation}%
                            </span>
                          )}
                          {idx === 0 && <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {idx > 0 && (
                            <div className="flex items-center gap-1">
                              {month.variation > VARIATION_THRESHOLD && (
                                <Badge variant="destructive" className="text-xs">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  Alta
                                </Badge>
                              )}
                              {month.variation < -VARIATION_THRESHOLD && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                  <ArrowDownRight className="h-3 w-3 mr-1" />
                                  Redução
                                </Badge>
                              )}
                              {Math.abs(month.variation) <= VARIATION_THRESHOLD && (
                                <Badge variant="outline" className="text-xs">Estável</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Adicione despesas para visualizar o comparativo
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Variation Alerts */}
          {variationAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Alertas de Variação por Categoria
                </CardTitle>
                <CardDescription>
                  Categorias com variação superior a {VARIATION_THRESHOLD}% em relação ao mês anterior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variationAlerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        alert.variation > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {alert.variation > 0 ? (
                          <ArrowUpRight className="h-5 w-5 text-red-500" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">{alert.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(alert.previous)} → {formatCurrency(alert.current)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={alert.variation > 0 ? 'destructive' : 'secondary'} className={alert.variation <= 0 ? 'bg-green-100 text-green-800' : ''}>
                        {alert.variation > 0 ? '+' : ''}{alert.variation}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendência de Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Receita por Equipe (Produtos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productsByTeamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productsByTeamData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                      <RechartsTooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Produtos do Operacional por Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productsByTeamData.length > 0 ? (
                <div className="space-y-2">
                  {productsByTeamData.map((team, index) => (
                    <div key={team.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold">{team.count}</p>
                          <p className="text-xs text-muted-foreground">vendas</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="font-bold text-green-600">{formatCurrency(team.value)}</p>
                          <p className="text-xs text-muted-foreground">receita</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg mt-4">
                    <span className="font-bold">Total</span>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold">{metrics?.productsSold?.total || 0}</p>
                        <p className="text-xs text-muted-foreground">vendas</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="font-bold text-green-600">{formatCurrency((metrics?.productsSold as any)?.totalValue || 0)}</p>
                        <p className="text-xs text-muted-foreground">receita</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto vendido no período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Margem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.commercial.revenue && totalExpenses
                    ? (((metrics.commercial.revenue - totalExpenses) / metrics.commercial.revenue) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  (Receita - Despesas) / Receita
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Custo por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.operational.activeClients && totalExpenses
                    ? formatCurrency(totalExpenses / metrics.operational.activeClients)
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.operational.activeClients || 0} clientes ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Receita por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.operational.activeClients && metrics?.commercial.revenue
                    ? formatCurrency(metrics.commercial.revenue / metrics.operational.activeClients)
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ticket médio mensal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Break-even</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.commercial.ticketAvg && totalExpenses
                    ? Math.ceil(totalExpenses / metrics.commercial.ticketAvg)
                    : 0} clientes
                </div>
                <p className="text-xs text-muted-foreground">
                  Para cobrir despesas
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Despesa' : (isFixedExpense ? 'Nova Despesa Fixa' : 'Nova Despesa')}
            </DialogTitle>
            <DialogDescription>
              {isFixedExpense ? 'Despesas fixas são recorrentes e podem ser geradas automaticamente.' : 'Adicione uma despesa pontual ou recorrente.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Fixed expense toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Despesa Fixa</Label>
                  <p className="text-xs text-muted-foreground">Marque se for uma despesa recorrente</p>
                </div>
              </div>
              <Switch 
                checked={isFixedExpense}
                onCheckedChange={(checked) => {
                  setIsFixedExpense(checked);
                  setExpenseForm(prev => ({ 
                    ...prev, 
                    recurrence: checked ? 'MENSAL' : 'UNICO' 
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Categoria</Label>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-primary"
                    onClick={() => setCategoryDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova
                  </Button>
                </div>
                <Select 
                  value={expenseForm.category_id} 
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <span 
                            className="p-1 rounded" 
                            style={{ backgroundColor: cat.color || '#6b7280', color: 'white' }}
                          >
                            {ICON_MAP[cat.icon || 'MoreHorizontal']}
                          </span>
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Conta de energia elétrica"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select 
                  value={expenseForm.recurrence} 
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, recurrence: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNICO">Único</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas adicionais..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveExpense} 
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {createExpense.isPending || updateExpense.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir a despesa "{expenseToDelete?.description}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteExpense}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Nova Categoria de Despesa
            </DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar suas despesas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria *</Label>
              <Input
                placeholder="Ex: Marketing, Infraestrutura, etc."
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select 
                  value={newCategory.icon} 
                  onValueChange={(v) => setNewCategory({ ...newCategory, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ICON_MAP).map(([key, icon]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {icon}
                          <span>{key}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <div 
                    className="flex-1 h-10 rounded-md flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: newCategory.color }}
                  >
                    Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCategory} 
              disabled={createCategory.isPending || !newCategory.name.trim()}
            >
              {createCategory.isPending ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
