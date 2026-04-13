import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Plus, 
  Pencil, 
  Trash2,
  Crown,
  Target,
  Video,
  Palette,
  FileText,
  TrendingUp,
  PieChart,
  Save,
  RefreshCw,
  Wifi,
  HelpCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useTeamMemberCosts, 
  useRoleCostDefaults,
  useCreateTeamMemberCost,
  useUpdateTeamMemberCost,
  useDeleteTeamMemberCost,
  useUpdateRoleCostDefault,
  useTeamTotalCosts,
  useCEOTeams,
  useCEOProfiles,
  TeamMemberCost,
  RoleCostDefault,
} from '@/hooks/useCEOData';
import { useCEORealtime } from '@/hooks/useCEORealtime';
import { TeamMemberRole, TEAM_MEMBER_ROLE_LABELS } from '@/types';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const ROLE_ICONS: Record<TeamMemberRole, React.ElementType> = {
  'COORDENADOR': Crown,
  'GESTOR_TRAFEGO': Target,
  'DESIGN': Palette,
  'EDITOR_VIDEO': Video,
  'ROTEIRISTA': FileText,
};

const ROLE_COLORS: Record<TeamMemberRole, string> = {
  'COORDENADOR': '#F59E0B',
  'GESTOR_TRAFEGO': '#3B82F6',
  'DESIGN': '#EC4899',
  'EDITOR_VIDEO': '#8B5CF6',
  'ROTEIRISTA': '#10B981',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function CEOCustos() {
  // Enable real-time updates
  useCEORealtime();
  
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberCost | null>(null);
  const [editingDefault, setEditingDefault] = useState<RoleCostDefault | null>(null);

  // Data fetching
  const { data: memberCosts, isLoading: loadingMembers } = useTeamMemberCosts(
    selectedTeam !== 'all' ? selectedTeam : undefined
  );
  const { data: roleDefaults, isLoading: loadingDefaults } = useRoleCostDefaults();
  const { data: teamTotalCosts, isLoading: loadingTotals } = useTeamTotalCosts();
  const { data: teams } = useCEOTeams();
  const { data: profiles } = useCEOProfiles();

  // Mutations
  const createMember = useCreateTeamMemberCost();
  const updateMember = useUpdateTeamMemberCost();
  const deleteMember = useDeleteTeamMemberCost();
  const updateDefault = useUpdateRoleCostDefault();

  // Form state for new member
  const [newMember, setNewMember] = useState({
    team_id: '',
    role_type: '' as TeamMemberRole,
    member_name: '',
    profile_id: '',
    monthly_salary: 0,
    benefits_cost: 0,
    other_costs: 0,
    notes: '',
  });

  // Calculate totals
  const totalMonthlyCost = memberCosts?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
  const totalMembers = memberCosts?.length || 0;
  const avgCostPerMember = totalMembers > 0 ? totalMonthlyCost / totalMembers : 0;

  // Prepare chart data
  const roleDistributionData = Object.entries(TEAM_MEMBER_ROLE_LABELS).map(([key, label]) => {
    const members = memberCosts?.filter(m => m.role_type === key) || [];
    const totalCost = members.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    return {
      name: label,
      value: totalCost,
      count: members.length,
      color: ROLE_COLORS[key as TeamMemberRole],
    };
  }).filter(d => d.count > 0);

  const teamCostData = teamTotalCosts?.map(t => ({
    name: t.teamName,
    custo: t.totalCost,
    membros: t.memberCount,
  })) || [];

  // Handle form submit for new member
  const handleCreateMember = async () => {
    if (!newMember.team_id || !newMember.role_type) {
      toast.error('Preencha a equipe e o cargo');
      return;
    }

    try {
      await createMember.mutateAsync({
        team_id: newMember.team_id,
        role_type: newMember.role_type,
        member_name: newMember.member_name || undefined,
        profile_id: newMember.profile_id || undefined,
        monthly_salary: newMember.monthly_salary,
        benefits_cost: newMember.benefits_cost,
        other_costs: newMember.other_costs,
        notes: newMember.notes || undefined,
      });
      toast.success('Membro adicionado com sucesso');
      setIsAddMemberOpen(false);
      setNewMember({
        team_id: '',
        role_type: '' as TeamMemberRole,
        member_name: '',
        profile_id: '',
        monthly_salary: 0,
        benefits_cost: 0,
        other_costs: 0,
        notes: '',
      });
    } catch (error) {
      toast.error('Erro ao adicionar membro');
    }
  };

  // Handle update member
  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      await updateMember.mutateAsync({
        id: editingMember.id,
        member_name: editingMember.member_name,
        monthly_salary: editingMember.monthly_salary,
        benefits_cost: editingMember.benefits_cost,
        other_costs: editingMember.other_costs,
        notes: editingMember.notes,
      });
      toast.success('Membro atualizado com sucesso');
      setEditingMember(null);
    } catch (error) {
      toast.error('Erro ao atualizar membro');
    }
  };

  // Handle delete member
  const handleDeleteMember = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      await deleteMember.mutateAsync(id);
      toast.success('Membro removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  // Handle update role default
  const handleUpdateDefault = async () => {
    if (!editingDefault) return;

    try {
      await updateDefault.mutateAsync({
        role_type: editingDefault.role_type,
        default_salary: editingDefault.default_salary,
        default_benefits: editingDefault.default_benefits,
        default_other: editingDefault.default_other,
      });
      toast.success('Valores padrão atualizados');
      setEditingDefault(null);
    } catch (error) {
      toast.error('Erro ao atualizar valores padrão');
    }
  };

  // Apply defaults when selecting a role
  const applyDefaults = (roleType: TeamMemberRole) => {
    const defaults = roleDefaults?.find(d => d.role_type === roleType);
    if (defaults) {
      setNewMember(prev => ({
        ...prev,
        role_type: roleType,
        monthly_salary: defaults.default_salary,
        benefits_cost: defaults.default_benefits,
        other_costs: defaults.default_other,
      }));
    } else {
      setNewMember(prev => ({ ...prev, role_type: roleType }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Custos por Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os custos detalhados de cada integrante das equipes
          </p>
        </div>
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Equipe *</Label>
                <Select 
                  value={newMember.team_id} 
                  onValueChange={(v) => setNewMember(prev => ({ ...prev, team_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select 
                  value={newMember.role_type} 
                  onValueChange={(v) => applyDefaults(v as TeamMemberRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_MEMBER_ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome do Membro</Label>
                <Input 
                  placeholder="Nome do colaborador"
                  value={newMember.member_name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, member_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Vincular Perfil (opcional)</Label>
                <Select 
                  value={newMember.profile_id} 
                  onValueChange={(v) => setNewMember(prev => ({ ...prev, profile_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Salário</Label>
                  <Input 
                    type="number"
                    value={newMember.monthly_salary}
                    onChange={(e) => setNewMember(prev => ({ ...prev, monthly_salary: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Benefícios</Label>
                  <Input 
                    type="number"
                    value={newMember.benefits_cost}
                    onChange={(e) => setNewMember(prev => ({ ...prev, benefits_cost: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outros</Label>
                  <Input 
                    type="number"
                    value={newMember.other_costs}
                    onChange={(e) => setNewMember(prev => ({ ...prev, other_costs: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Custo Total:</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(newMember.monthly_salary + newMember.benefits_cost + newMember.other_costs)}
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateMember} disabled={createMember.isPending}>
                {createMember.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="group relative">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Custo Mensal Total</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Custo Mensal Total</p>
                        <p className="text-xs text-muted-foreground">Soma de salários, benefícios e outros custos de todos os membros das equipes operacionais.</p>
                        <div className="pt-1 border-t">
                          <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                          <p className="text-xs text-muted-foreground">Tabela team_member_costs (custos por membro)</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Total de Membros</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Total de Membros</p>
                        <p className="text-xs text-muted-foreground">Quantidade total de colaboradores cadastrados com custos nas equipes operacionais.</p>
                        <div className="pt-1 border-t">
                          <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                          <p className="text-xs text-muted-foreground">Tabela team_member_costs (membros ativos)</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Custo Médio/Membro</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Custo Médio por Membro</p>
                        <p className="text-xs text-muted-foreground">Custo mensal total dividido pelo número de membros. Indica o custo médio por colaborador.</p>
                        <div className="pt-1 border-t">
                          <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                          <p className="text-xs text-muted-foreground">Custo Total ÷ Total de Membros</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(avgCostPerMember)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Equipes</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Quantidade de Equipes</p>
                        <p className="text-xs text-muted-foreground">Número total de equipes operacionais com membros e custos cadastrados.</p>
                        <div className="pt-1 border-t">
                          <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                          <p className="text-xs text-muted-foreground">Tabela teams (equipes ativas com custos)</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold">{teamTotalCosts?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Membros por Equipe</TabsTrigger>
          <TabsTrigger value="analytics">Análise de Custos</TabsTrigger>
          <TabsTrigger value="defaults">Valores Padrão</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {teams?.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingMembers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : memberCosts && memberCosts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                      <TableHead className="text-right">Benefícios</TableHead>
                      <TableHead className="text-right">Outros</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberCosts.map((member) => {
                      const RoleIcon = ROLE_ICONS[member.role_type];
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-8 w-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${ROLE_COLORS[member.role_type]}20` }}
                              >
                                <RoleIcon 
                                  className="h-4 w-4" 
                                  style={{ color: ROLE_COLORS[member.role_type] }}
                                />
                              </div>
                              <span className="font-medium">
                                {member.member_name || (member.profile as any)?.full_name || 'Não definido'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: `${ROLE_COLORS[member.role_type]}20`,
                                color: ROLE_COLORS[member.role_type]
                              }}
                            >
                              {TEAM_MEMBER_ROLE_LABELS[member.role_type]}
                            </Badge>
                          </TableCell>
                          <TableCell>{(member.team as any)?.name || 'Sem equipe'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.monthly_salary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.benefits_cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(member.other_costs)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(member.total_cost)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMember(member)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum membro cadastrado</p>
                  <p className="text-sm">Clique em "Adicionar Membro" para começar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution by Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Cargo
                </CardTitle>
                <CardDescription>Custo total por tipo de cargo</CardDescription>
              </CardHeader>
              <CardContent>
                {roleDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={roleDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {roleDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost by Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Custo por Equipe
                </CardTitle>
                <CardDescription>Comparativo de custos entre equipes</CardDescription>
              </CardHeader>
              <CardContent>
                {teamCostData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teamCostData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => [
                          name === 'custo' ? formatCurrency(value) : value,
                          name === 'custo' ? 'Custo' : 'Membros'
                        ]}
                      />
                      <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamTotalCosts?.map(team => (
              <Card key={team.teamId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{team.teamName}</CardTitle>
                  <CardDescription>{team.memberCount} membros</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary mb-4">
                    {formatCurrency(team.totalCost)}
                  </p>
                  <div className="space-y-2">
                    {Object.entries(team.byRole).map(([role, data]) => {
                      const RoleIcon = ROLE_ICONS[role as TeamMemberRole];
                      return (
                        <div key={role} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <RoleIcon 
                              className="h-4 w-4" 
                              style={{ color: ROLE_COLORS[role as TeamMemberRole] }}
                            />
                            <span>{TEAM_MEMBER_ROLE_LABELS[role as TeamMemberRole]}</span>
                            <Badge variant="secondary" className="text-xs">{data.count}</Badge>
                          </div>
                          <span className="font-medium">{formatCurrency(data.cost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valores Padrão por Cargo</CardTitle>
              <CardDescription>
                Configure os valores padrão de salário, benefícios e outros custos para cada cargo.
                Estes valores serão sugeridos automaticamente ao adicionar novos membros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDefaults ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {roleDefaults?.map(defaultItem => {
                    const RoleIcon = ROLE_ICONS[defaultItem.role_type];
                    const totalDefault = defaultItem.default_salary + defaultItem.default_benefits + defaultItem.default_other;
                    
                    return (
                      <div 
                        key={defaultItem.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="h-12 w-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${ROLE_COLORS[defaultItem.role_type]}20` }}
                          >
                            <RoleIcon 
                              className="h-6 w-6" 
                              style={{ color: ROLE_COLORS[defaultItem.role_type] }}
                            />
                          </div>
                          <div>
                            <p className="font-semibold">{TEAM_MEMBER_ROLE_LABELS[defaultItem.role_type]}</p>
                            <p className="text-sm text-muted-foreground">
                              Salário: {formatCurrency(defaultItem.default_salary)} | 
                              Benefícios: {formatCurrency(defaultItem.default_benefits)} | 
                              Outros: {formatCurrency(defaultItem.default_other)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-lg font-bold">{formatCurrency(totalDefault)}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingDefault(defaultItem)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Membro</Label>
                <Input 
                  value={editingMember.member_name || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, member_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Salário</Label>
                  <Input 
                    type="number"
                    value={editingMember.monthly_salary}
                    onChange={(e) => setEditingMember({ ...editingMember, monthly_salary: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Benefícios</Label>
                  <Input 
                    type="number"
                    value={editingMember.benefits_cost}
                    onChange={(e) => setEditingMember({ ...editingMember, benefits_cost: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outros</Label>
                  <Input 
                    type="number"
                    value={editingMember.other_costs}
                    onChange={(e) => setEditingMember({ ...editingMember, other_costs: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Custo Total:</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(editingMember.monthly_salary + editingMember.benefits_cost + editingMember.other_costs)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
            <Button onClick={handleUpdateMember} disabled={updateMember.isPending}>
              {updateMember.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Default Dialog */}
      <Dialog open={!!editingDefault} onOpenChange={() => setEditingDefault(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar Valores Padrão - {editingDefault && TEAM_MEMBER_ROLE_LABELS[editingDefault.role_type]}
            </DialogTitle>
          </DialogHeader>
          {editingDefault && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Salário Padrão</Label>
                <Input 
                  type="number"
                  value={editingDefault.default_salary}
                  onChange={(e) => setEditingDefault({ ...editingDefault, default_salary: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Benefícios Padrão</Label>
                <Input 
                  type="number"
                  value={editingDefault.default_benefits}
                  onChange={(e) => setEditingDefault({ ...editingDefault, default_benefits: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Outros Custos Padrão</Label>
                <Input 
                  type="number"
                  value={editingDefault.default_other}
                  onChange={(e) => setEditingDefault({ ...editingDefault, default_other: Number(e.target.value) })}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Padrão:</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(editingDefault.default_salary + editingDefault.default_benefits + editingDefault.default_other)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDefault(null)}>Cancelar</Button>
            <Button onClick={handleUpdateDefault} disabled={updateDefault.isPending}>
              {updateDefault.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}