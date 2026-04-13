import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddCRMEvent, EVENT_TYPES } from '@/hooks/useCRMData';
import { toast } from 'sonner';
import { Loader2, DollarSign } from 'lucide-react';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

const SOLD_ITEMS = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'recorrencia', label: 'Recorrência (Agenda)' },
  { value: 'crm', label: 'CRM' },
  { value: 'atriz', label: 'Atriz' },
  { value: 'social_selling', label: 'Social Selling' },
  { value: 'ia', label: 'IA' },
  { value: 'id_visual', label: 'ID Visual' },
  { value: 'story_vendedor', label: 'Story Vendedor' },
  { value: 'linktree', label: 'Linktree' },
] as const;

export function AddEventDialog({ open, onOpenChange, clientId, clientName }: AddEventDialogProps) {
  const [eventType, setEventType] = useState('RENOVACAO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [soldItem, setSoldItem] = useState('');
  const [saleValue, setSaleValue] = useState('');

  const addEvent = useAddCRMEvent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    // Validate sale value for sale events
    const isSaleEvent = ['VENDA_OPERACIONAL', 'VENDA_AGENDA', 'RECORRENCIA_AGENDA'].includes(eventType);
    
    if (eventType === 'VENDA_OPERACIONAL' && !soldItem) {
      toast.error('Selecione o item vendido');
      return;
    }

    if (isSaleEvent && (!saleValue || parseFloat(saleValue) <= 0)) {
      toast.error('Informe o valor da venda');
      return;
    }

    // Include sold item and value in description for VENDA_OPERACIONAL
    const parsedValue = parseFloat(saleValue) || 0;
    let finalDescription = description.trim() || undefined;
    
    if (eventType === 'VENDA_OPERACIONAL') {
      finalDescription = `Item vendido: ${SOLD_ITEMS.find(i => i.value === soldItem)?.label || soldItem} | Valor: R$ ${parsedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${description.trim() ? `\n${description.trim()}` : ''}`;
    } else if (eventType === 'VENDA_AGENDA') {
      finalDescription = `Venda de Agenda | Valor: R$ ${parsedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${description.trim() ? `\n${description.trim()}` : ''}`;
    } else if (eventType === 'RECORRENCIA_AGENDA') {
      finalDescription = `Recorrência de Agenda | Valor: R$ ${parsedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${description.trim() ? `\n${description.trim()}` : ''}`;
    }

    try {
      await addEvent.mutateAsync({
        client_id: clientId,
        event_type: eventType,
        title: title.trim(),
        description: finalDescription,
        sale_value: isSaleEvent ? parsedValue : undefined,
      });
      
      toast.success('Evento adicionado com sucesso!');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setEventType('RENOVACAO');
      setSoldItem('');
      setSaleValue('');
    } catch (error) {
      toast.error('Erro ao adicionar evento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-border">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Adicionar Evento</DialogTitle>
          <p className="text-sm text-text-secondary">
            Cliente: <span className="font-medium">{clientName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text-primary">Tipo de Evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-white border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-border">
                {Object.entries(EVENT_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show item selection only for VENDA_OPERACIONAL */}
          {eventType === 'VENDA_OPERACIONAL' && (
            <div className="space-y-2">
              <Label className="text-text-primary">Item Vendido *</Label>
              <Select value={soldItem} onValueChange={setSoldItem}>
                <SelectTrigger className="bg-white border-border">
                  <SelectValue placeholder="Selecione o item vendido" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
                  {SOLD_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show value field for all sale events */}
          {['VENDA_OPERACIONAL', 'VENDA_AGENDA', 'RECORRENCIA_AGENDA'].includes(eventType) && (
            <div className="space-y-2">
              <Label className="text-text-primary">Valor da Venda *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  placeholder="0,00"
                  className="bg-white border-border pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {soldItem === 'agenda'
                  ? 'Este valor será contabilizado nas comissões de IA (20%) e Operacional (25%)'
                  : soldItem === 'recorrencia'
                  ? 'Este valor será contabilizado apenas nas comissões de IA (20% recorrência)'
                  : 'Este valor será contabilizado nas métricas da equipe (25% dividido entre gestores)'
                }
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-text-primary">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva o evento brevemente..."
              className="bg-white border-border"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-primary">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="bg-white border-border min-h-[100px]"
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={addEvent.isPending || !title.trim()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {addEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
