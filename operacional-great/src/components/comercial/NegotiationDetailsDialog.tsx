import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PACOTE_OPTIONS,
  PERIODO_OPTIONS,
  PAGADOR_ANUNCIO_OPTIONS,
  EQUIPE_OPTIONS,
  VENDEDOR_OPTIONS,
  Pacote,
  Periodo,
  PagadorAnuncio,
  Equipe,
  Vendedor,
  useCommercial,
} from '@/contexts/CommercialContext';

const formSchema = z.object({
  vendedor: z.enum(['HERBERT', 'CLED', 'PEDRO_H', 'BRENDA', 'HANNAH', 'PEDRO_JUAN', 'CAETANO'] as const, {
    required_error: 'Selecione o vendedor',
  }),
  pacote: z.enum(['COMPLETO', 'TRAFEGO_E_CRIATIVOS', 'ATENDIMENTO', 'TRAFEGO', 'COMPLETO_NOVA_ERA', 'TRAFEGO_ARTES_IA', 'TRAFEGO_CONSULTORIA', 'IA', 'TRAFEGO_ROTEIRO', 'TRAFEGO_IA'] as const),
  periodo: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'TAXA_INTERESSE'] as const),
  entrada: z.string().min(1, 'Valor é obrigatório').transform(val => {
    const num = parseFloat(val.replace(/[^\d,]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }),
  clinicName: z.string().optional(),
  equipe: z.string().optional(),
  pagadorAnuncio: z.enum(['CLIENTE', 'GREAT'] as const).optional(),
});

type FormValues = z.input<typeof formSchema>;

interface NegotiationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  currentClinicName?: string;
  targetStage: 'NEGOCIACAO' | 'FECHADO';
  onConfirm: (data: { vendedor: Vendedor; pacote: Pacote; periodo: Periodo; entrada: number; clinicName?: string; equipe?: Equipe; pagadorAnuncio?: PagadorAnuncio }) => void;
}

export function NegotiationDetailsDialog({ 
  open, 
  onOpenChange, 
  clientName,
  currentClinicName,
  targetStage,
  onConfirm 
}: NegotiationDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { nextTeamInQueue, getNextTeamLabel } = useCommercial();

  // Schema with conditional validation for FECHADO
  const conditionalSchema = targetStage === 'FECHADO' 
    ? formSchema
        .refine(data => data.clinicName && data.clinicName.trim().length >= 2, {
          message: 'Nome da clínica é obrigatório (mín. 2 caracteres)',
          path: ['clinicName'],
        })
        .refine(data => data.equipe !== undefined, {
          message: 'Selecione a equipe',
          path: ['equipe'],
        })
        .refine(data => data.pagadorAnuncio !== undefined, {
          message: 'Selecione quem paga o anúncio',
          path: ['pagadorAnuncio'],
        })
    : formSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(conditionalSchema),
    defaultValues: {
      vendedor: undefined,
      pacote: 'COMPLETO',
      periodo: 'MENSAL',
      entrada: '',
      clinicName: currentClinicName || '',
      equipe: nextTeamInQueue,
      pagadorAnuncio: undefined,
    },
  });

  // Update equipe default when nextTeamInQueue changes or dialog opens
  useEffect(() => {
    if (open && targetStage === 'FECHADO') {
      form.setValue('equipe', nextTeamInQueue);
      form.setValue('clinicName', currentClinicName || '');
    }
  }, [open, nextTeamInQueue, currentClinicName, form, targetStage]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      onConfirm({
        vendedor: data.vendedor as Vendedor,
        pacote: data.pacote as Pacote,
        periodo: data.periodo as Periodo,
        entrada: typeof data.entrada === 'string' ? parseFloat(data.entrada.replace(/[^\d,]/g, '').replace(',', '.')) : data.entrada,
        clinicName: data.clinicName || undefined,
        equipe: data.equipe as Equipe | undefined,
        pagadorAnuncio: data.pagadorAnuncio as PagadorAnuncio | undefined,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const stageLabel = targetStage === 'NEGOCIACAO' ? 'Negociação' : 'Fechado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Detalhes da Proposta</DialogTitle>
          <DialogDescription>
            Para mover <span className="font-medium text-foreground">{clientName}</span> para {stageLabel}, 
            informe os detalhes da proposta.
          </DialogDescription>
        </DialogHeader>

        {/* Team indicator banner - only for FECHADO */}
        {targetStage === 'FECHADO' && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Equipe da vez: <span className="text-primary font-semibold">{getNextTeamLabel()}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Distribuição igualitária entre equipes (round-robin)
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Vendedor Selection - always shown */}
            <FormField
              control={form.control}
              name="vendedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {VENDEDOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pacote</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pacote" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {PACOTE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {PERIODO_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de Entrada (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="5.000,00" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos adicionais para FECHADO */}
            {targetStage === 'FECHADO' && (
              <>
                <FormField
                  control={form.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Clínica *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da clínica" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Equipe
                        {field.value === nextTeamInQueue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            ✓ Da vez
                          </span>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={field.value === nextTeamInQueue ? 'border-primary ring-1 ring-primary/30' : ''}>
                            <SelectValue placeholder="Selecione a equipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {EQUIPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                {opt.label}
                                {opt.value === nextTeamInQueue && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                    Da vez
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pagadorAnuncio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem paga anúncio?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione quem paga" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {PAGADOR_ANUNCIO_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : `Mover para ${stageLabel}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}