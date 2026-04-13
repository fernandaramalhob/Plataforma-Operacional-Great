import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Calendar,
  Plus,
  Palette,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Edit2,
  Check,
  X,
  User,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useClientActivityTracking,
  useUpsertClientActivity,
  useOperationalClientsForTracking,
  useDesignersTotals,
  ClientActivityWithClient,
  DESIGNERS,
} from '@/hooks/useClientActivityTracking';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  clients: { id: string; client_name: string; clinic_name: string | null }[];
  selectedDesigner: string | null;
}

function AddActivityDialog({ open, onOpenChange, year, month, clients, selectedDesigner }: AddActivityDialogProps) {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [week, setWeek] = useState<number>(1);
  const [artesCount, setArtesCount] = useState<number>(0);
  const [designer, setDesigner] = useState<string>(selectedDesigner || DESIGNERS[0]);
  
  const upsertActivity = useUpsertClientActivity();

  const handleSubmit = () => {
    if (!selectedClient || !designer) return;
    
    upsertActivity.mutate(
      {
        client_id: selectedClient,
        year,
        month,
        week,
        artes_count: artesCount,
        designer_name: designer,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedClient('');
          setWeek(1);
          setArtesCount(0);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Adicionar Registro de Artes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_name}
                    {client.clinic_name && ` - ${client.clinic_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Designer</Label>
            <Select value={designer} onValueChange={setDesigner}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o designer" />
              </SelectTrigger>
              <SelectContent>
                {DESIGNERS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Semana</Label>
              <Select value={week.toString()} onValueChange={(v) => setWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª Semana</SelectItem>
                  <SelectItem value="2">2ª Semana</SelectItem>
                  <SelectItem value="3">3ª Semana</SelectItem>
                  <SelectItem value="4">4ª Semana</SelectItem>
                  <SelectItem value="5">5ª Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade de Artes</Label>
              <Input
                type="number"
                min={0}
                value={artesCount}
                onChange={(e) => setArtesCount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Período: <span className="font-medium text-foreground">{MONTHS.find(m => m.value === month)?.label} de {year}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedClient || upsertActivity.isPending}>
            {upsertActivity.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditableCellProps {
  value: number;
  onSave: (value: number) => void;
  isPending: boolean;
}

function EditableCell({ value, onSave, isPending }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          value={editValue}
          onChange={(e) => setEditValue(Number(e.target.value))}
          className="h-8 w-16 text-center"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={isPending}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center justify-center gap-1 w-full h-8 rounded hover:bg-muted/50 transition-colors group"
    >
      <span className={cn(
        "font-medium",
        value > 0 ? "text-foreground" : "text-muted-foreground"
      )}>
        {value}
      </span>
      <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function AcompanhamentoClientes() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: activities, isLoading: isLoadingActivities } = useClientActivityTracking(selectedYear, selectedMonth, selectedDesigner);
  const { data: clients, isLoading: isLoadingClients } = useOperationalClientsForTracking();
  const { data: designersTotals, isLoading: isLoadingDesignersTotals } = useDesignersTotals(selectedYear, selectedMonth);
  const upsertActivity = useUpsertClientActivity();

  // Designer colors
  const DESIGNER_COLORS: Record<string, string> = {
    'Taiwan': '#8B5CF6',
    'Thiago': '#F59E0B',
    'Hannah': '#EC4899',
  };

  // Prepare chart data for designers comparison
  const designersChartData = useMemo(() => {
    if (!designersTotals) return [];
    
    return DESIGNERS.map(designer => ({
      name: designer,
      total: designersTotals[designer]?.total || 0,
      semana1: designersTotals[designer]?.weeks[1] || 0,
      semana2: designersTotals[designer]?.weeks[2] || 0,
      semana3: designersTotals[designer]?.weeks[3] || 0,
      semana4: designersTotals[designer]?.weeks[4] || 0,
    }));
  }, [designersTotals]);

  // Weekly comparison data for stacked chart
  const weeklyComparisonData = useMemo(() => {
    if (!designersTotals) return [];
    
    return [1, 2, 3, 4].map(week => ({
      name: `${week}ª Semana`,
      Taiwan: designersTotals['Taiwan']?.weeks[week] || 0,
      Thiago: designersTotals['Thiago']?.weeks[week] || 0,
      Hannah: designersTotals['Hannah']?.weeks[week] || 0,
    }));
  }, [designersTotals]);

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Process data for table view - group by client
  const clientsWithWeeklyData = useMemo(() => {
    if (!clients) return [];

    const filteredClients = clients.filter(client =>
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredClients.map(client => {
      const clientActivities = activities?.filter(a => a.client_id === client.id) || [];
      
      const weeks = [1, 2, 3, 4].map(week => {
        const activity = clientActivities.find(a => a.week === week);
        return {
          week,
          count: activity?.artes_count || 0,
          id: activity?.id,
        };
      });

      const total = weeks.reduce((sum, w) => sum + w.count, 0);

      return {
        ...client,
        weeks,
        total,
      };
    });
  }, [clients, activities, searchTerm]);

  // Calculate totals per week
  const weeklyTotals = useMemo(() => {
    return [1, 2, 3, 4].map(week => {
      return clientsWithWeeklyData.reduce((sum, client) => {
        const weekData = client.weeks.find(w => w.week === week);
        return sum + (weekData?.count || 0);
      }, 0);
    });
  }, [clientsWithWeeklyData]);

  const grandTotal = weeklyTotals.reduce((sum, t) => sum + t, 0);

  const handleUpdateWeek = (clientId: string, week: number, count: number) => {
    upsertActivity.mutate({
      client_id: clientId,
      year: selectedYear,
      month: selectedMonth,
      week,
      artes_count: count,
      designer_name: selectedDesigner,
    });
  };

  const isLoading = isLoadingActivities || isLoadingClients;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Controle - Artes</h1>
              <p className="text-sm text-muted-foreground">
                Quantidade de artes por cliente por semana
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  toast.loading('Verificando artes insuficientes...', { id: 'check-arts' });
                  const { data, error } = await supabase.functions.invoke('check-insufficient-arts');
                  if (error) throw error;
                  toast.success(
                    data.clientsWithInsufficientArts > 0 
                      ? `${data.clientsWithInsufficientArts} cliente(s) com artes insuficientes. Notificações enviadas!`
                      : 'Todos os clientes estão com artes em dia!',
                    { id: 'check-arts' }
                  );
                } catch (error) {
                  console.error('Error checking arts:', error);
                  toast.error('Erro ao verificar artes', { id: 'check-arts' });
                }
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Verificar Artes Insuficientes
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Registro
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Designer Filter */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Select 
              value={selectedDesigner || 'all'} 
              onValueChange={(v) => setSelectedDesigner(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[160px] border-0 bg-transparent">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Designer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Designers</SelectItem>
                {DESIGNERS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 px-2">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[130px] border-0 bg-transparent">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px] border-0 bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 pb-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4].map((week, idx) => (
            <Card key={week} className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{week}ª Semana</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {isLoading ? '-' : weeklyTotals[idx]}
                </p>
                <p className="text-xs text-muted-foreground">artes</p>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary">Total Mês</span>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary mt-1">
                {isLoading ? '-' : grandTotal}
              </p>
              <p className="text-xs text-primary/80">artes</p>
            </CardContent>
          </Card>
        </div>

        {/* Designer Comparison Charts */}
        {!selectedDesigner && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Total per Designer */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Total de Artes por Designer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDesignersTotals ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={designersChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="total" name="Total de Artes" radius={[0, 4, 4, 0]}>
                        {designersChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DESIGNER_COLORS[entry.name] || '#8884d8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Weekly Comparison */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Comparativo Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDesignersTotals ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Taiwan" fill="#8B5CF6" name="Taiwan" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Thiago" fill="#F59E0B" name="Thiago" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Hannah" fill="#EC4899" name="Hannah" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="flex-1 p-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quantidade de Artes por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : clientsWithWeeklyData.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Tente ajustar a busca' : 'Adicione clientes para começar'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold min-w-[200px]">Cliente</TableHead>
                      <TableHead className="text-center font-semibold w-24">1ª Semana</TableHead>
                      <TableHead className="text-center font-semibold w-24">2ª Semana</TableHead>
                      <TableHead className="text-center font-semibold w-24">3ª Semana</TableHead>
                      <TableHead className="text-center font-semibold w-24">4ª Semana</TableHead>
                      <TableHead className="text-center font-semibold w-24 bg-primary/5">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsWithWeeklyData.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-foreground">{client.client_name}</p>
                            {client.clinic_name && (
                              <p className="text-xs text-muted-foreground">{client.clinic_name}</p>
                            )}
                          </div>
                        </TableCell>
                        {client.weeks.map((weekData) => (
                          <TableCell key={weekData.week} className="text-center p-2">
                            <EditableCell
                              value={weekData.count}
                              onSave={(count) => handleUpdateWeek(client.id, weekData.week, count)}
                              isPending={upsertActivity.isPending}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold bg-primary/5">
                          <Badge variant="secondary" className="font-bold">
                            {client.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell className="text-foreground font-bold">
                        TOTAL ({clientsWithWeeklyData.length} clientes)
                      </TableCell>
                      {weeklyTotals.map((total, idx) => (
                        <TableCell key={idx} className="text-center">
                          <span className="text-foreground font-bold">{total}</span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center bg-primary/10">
                        <Badge className="font-bold bg-primary text-primary-foreground">
                          {grandTotal}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollArea>

      {/* Add Dialog */}
      <AddActivityDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        year={selectedYear}
        month={selectedMonth}
        clients={clients || []}
        selectedDesigner={selectedDesigner}
      />
    </div>
  );
}
