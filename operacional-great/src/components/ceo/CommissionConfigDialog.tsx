import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Pencil, Save, X, Plus, Trash2, Briefcase, Users, Bot, Percent } from 'lucide-react';
import { 
  useCommissionConfigs, 
  useUpdateCommissionConfig,
  useCreateCommissionConfig,
  useDeleteCommissionConfig,
  CommissionConfig 
} from '@/hooks/useCommissionConfig';

const CATEGORY_CONFIG = {
  commercial: {
    label: 'Comercial',
    icon: Briefcase,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  operational: {
    label: 'Operacional',
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  ia: {
    label: 'IA',
    icon: Bot,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
};

interface EditingConfig {
  config_key: string;
  config_value: number;
  label: string;
  description: string;
}

export function CommissionConfigDialog() {
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditingConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newConfig, setNewConfig] = useState({
    config_key: '',
    config_value: 0,
    label: '',
    category: 'commercial' as 'commercial' | 'operational' | 'ia',
    description: '',
  });

  const { data: configs, isLoading } = useCommissionConfigs();
  const updateConfig = useUpdateCommissionConfig();
  const createConfig = useCreateCommissionConfig();
  const deleteConfig = useDeleteCommissionConfig();

  const groupedConfigs = configs?.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, CommissionConfig[]>) || {};

  const startEditing = (config: CommissionConfig) => {
    setEditingKey(config.config_key);
    setEditingValues({
      config_key: config.config_key,
      config_value: config.config_value,
      label: config.label,
      description: config.description || '',
    });
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValues(null);
  };

  const saveEditing = async () => {
    if (!editingValues) return;

    try {
      await updateConfig.mutateAsync({
        config_key: editingValues.config_key,
        config_value: editingValues.config_value,
        label: editingValues.label,
        description: editingValues.description,
      });
      toast.success('Configuração atualizada com sucesso');
      cancelEditing();
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleAddNew = async () => {
    if (!newConfig.config_key || !newConfig.label) {
      toast.error('Preencha a chave e o nome');
      return;
    }

    try {
      await createConfig.mutateAsync({
        config_key: newConfig.config_key.toUpperCase().replace(/\s+/g, '_'),
        config_value: newConfig.config_value,
        label: newConfig.label,
        category: newConfig.category,
        description: newConfig.description || null,
      });
      toast.success('Nova configuração criada');
      setIsAddingNew(false);
      setNewConfig({
        config_key: '',
        config_value: 0,
        label: '',
        category: 'commercial',
        description: '',
      });
    } catch (error) {
      toast.error('Erro ao criar configuração');
    }
  };

  const handleDelete = async (config_key: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) return;

    try {
      await deleteConfig.mutateAsync(config_key);
      toast.success('Configuração excluída');
    } catch (error) {
      toast.error('Erro ao excluir configuração');
    }
  };

  const formatValue = (key: string, value: number) => {
    if (key === 'GESTOR_COUNT') return value.toString();
    return `${(value * 100).toFixed(1)}%`;
  };

  const renderConfigTable = (category: 'commercial' | 'operational' | 'ia') => {
    const categoryConfigs = groupedConfigs[category] || [];
    const { icon: Icon, color, bgColor } = CATEGORY_CONFIG[category];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            {CATEGORY_CONFIG[category].label}
          </CardTitle>
          <CardDescription>
            Configure as taxas de comissão do setor {CATEGORY_CONFIG[category].label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma configuração cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryConfigs.map((config) => (
                  <TableRow key={config.id}>
                    {editingKey === config.config_key ? (
                      <>
                        <TableCell>
                          <Input
                            value={editingValues?.label || ''}
                            onChange={(e) => setEditingValues(prev => prev ? { ...prev, label: e.target.value } : null)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {config.config_key}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step={config.config_key === 'GESTOR_COUNT' ? '1' : '0.001'}
                              value={editingValues?.config_value || 0}
                              onChange={(e) => setEditingValues(prev => prev ? { ...prev, config_value: parseFloat(e.target.value) } : null)}
                              className="h-8 w-24 text-right"
                            />
                            {config.config_key !== 'GESTOR_COUNT' && (
                              <span className="text-xs text-muted-foreground">= {((editingValues?.config_value || 0) * 100).toFixed(1)}%</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={saveEditing}
                              disabled={updateConfig.isPending}
                            >
                              <Save className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={cancelEditing}
                            >
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div>
                            <p className="font-medium">{config.label}</p>
                            {config.description && (
                              <p className="text-xs text-muted-foreground">{config.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {config.config_key}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={`${bgColor} ${color} border-0`}>
                            {formatValue(config.config_key, config.config_value)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => startEditing(config)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(config.config_key)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurar Taxas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Configuração de Comissões
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="commercial" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="commercial" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Comercial
              </TabsTrigger>
              <TabsTrigger value="operational" className="gap-2">
                <Users className="h-4 w-4" />
                Operacional
              </TabsTrigger>
              <TabsTrigger value="ia" className="gap-2">
                <Bot className="h-4 w-4" />
                IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="commercial" className="space-y-4">
              {renderConfigTable('commercial')}
            </TabsContent>
            <TabsContent value="operational" className="space-y-4">
              {renderConfigTable('operational')}
            </TabsContent>
            <TabsContent value="ia" className="space-y-4">
              {renderConfigTable('ia')}
            </TabsContent>
          </Tabs>
        )}

        {/* Add New Config Section */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Nova Configuração
            </CardTitle>
          </CardHeader>
          {isAddingNew ? (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Ex: Nova Taxa"
                    value={newConfig.label}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chave (auto-gerada)</Label>
                  <Input
                    placeholder="Ex: NOVA_TAXA"
                    value={newConfig.config_key}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, config_key: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newConfig.category}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <option value="commercial">Comercial</option>
                    <option value="operational">Operacional</option>
                    <option value="ia">IA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (decimal)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.03 = 3%"
                    value={newConfig.config_value}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, config_value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição opcional"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddNew} disabled={createConfig.isPending}>
                  {createConfig.isPending ? 'Salvando...' : 'Adicionar'}
                </Button>
                <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setIsAddingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nova Taxa de Comissão
              </Button>
            </CardContent>
          )}
        </Card>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
