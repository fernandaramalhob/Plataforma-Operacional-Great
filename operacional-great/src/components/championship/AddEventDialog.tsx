import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChampionshipTeam, SCORING_RULES, SELLABLE_ITEMS, useCreateChampionshipEvent } from '@/hooks/useChampionshipData';
import { Plus, RefreshCw, UserMinus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface AddEventDialogProps {
  teams: ChampionshipTeam[];
}

export function AddEventDialog({ teams }: AddEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<'RENEWAL' | 'LOSS' | 'ITEM_SOLD'>('ITEM_SOLD');
  const [teamId, setTeamId] = useState('');
  const [clientName, setClientName] = useState('');
  const [itemLabel, setItemLabel] = useState('');
  const [description, setDescription] = useState('');
  
  const createEventMutation = useCreateChampionshipEvent();

  const handleSubmit = async () => {
    if (!teamId) {
      toast.error('Selecione uma equipe');
      return;
    }

    if (eventType === 'ITEM_SOLD' && !itemLabel) {
      toast.error('Selecione um item');
      return;
    }

    const points = eventType === 'ITEM_SOLD' 
      ? SCORING_RULES.ITEM_SOLD.points 
      : eventType === 'RENEWAL'
        ? SCORING_RULES.RENEWAL.points
        : SCORING_RULES.LOSS.points;

    try {
      await createEventMutation.mutateAsync({
        team_id: teamId,
        event_type: eventType,
        points,
        client_name: clientName || undefined,
        item_label: itemLabel || undefined,
        description: description || undefined,
      });
      
      toast.success('Evento registrado com sucesso!');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao registrar evento');
    }
  };

  const resetForm = () => {
    setTeamId('');
    setClientName('');
    setItemLabel('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Evento do Campeonato</DialogTitle>
        </DialogHeader>

        <Tabs value={eventType} onValueChange={(v) => setEventType(v as any)} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ITEM_SOLD" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Item
            </TabsTrigger>
            <TabsTrigger value="RENEWAL" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Renovação
            </TabsTrigger>
            <TabsTrigger value="LOSS" className="gap-2">
              <UserMinus className="h-4 w-4" />
              Perda
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Equipe *</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: team.badge_color }}
                        />
                        {team.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="ITEM_SOLD" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Item Vendido *</Label>
                <Select value={itemLabel} onValueChange={setItemLabel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o item" />
                  </SelectTrigger>
                  <SelectContent>
                    {SELLABLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.label}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 text-center">
                <span className="text-sm text-muted-foreground">Pontos: </span>
                <span className="font-bold text-primary">+{SCORING_RULES.ITEM_SOLD.points}</span>
              </div>
            </TabsContent>

            <TabsContent value="RENEWAL" className="mt-0 space-y-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                <span className="text-sm text-muted-foreground">Pontos: </span>
                <span className="font-bold text-green-600">+{SCORING_RULES.RENEWAL.points}</span>
              </div>
            </TabsContent>

            <TabsContent value="LOSS" className="mt-0 space-y-4">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
                <span className="text-sm text-muted-foreground">Pontos: </span>
                <span className="font-bold text-red-600">{SCORING_RULES.LOSS.points}</span>
              </div>
            </TabsContent>

            {/* Common Fields */}
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Input 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicionar observação"
              />
            </div>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
