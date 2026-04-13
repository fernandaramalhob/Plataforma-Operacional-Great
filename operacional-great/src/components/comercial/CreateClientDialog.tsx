import { useState } from 'react';
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
  useCommercial, 
  PipelineStage,
  FATURAMENTO_OPTIONS,
  INDICACAO_OPTIONS,
  AGENDADOR_OPTIONS,
  TEM_SOCIO_OPTIONS,
  TEM_MKT_OPTIONS,
  TEM_SECRETARIA_OPTIONS,
  SALAO_OU_CLINICA_OPTIONS,
  Faturamento,
  Agendador,
  TemSocio,
  TemMkt,
  TemSecretaria,
  SalaoOuClinica,
} from '@/contexts/CommercialContext';
import { toast } from 'sonner';
import { formatPhoneForWhatsApp } from '@/lib/phoneUtils';

const formSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  clinicName: z.string().optional(),
  telefone: z.string().min(8, 'Telefone deve ter pelo menos 8 dígitos'),
  criativo: z.string().min(1, 'Criativo é obrigatório'),
  faturamento: z.enum(['0_A_15K', '15K_A_30K', '30K_A_50K', '50K_A_100K', '100K_PLUS', 'NAO_INFORMADO', 'PERSONALIZADO'] as const),
  faturamentoPersonalizado: z.string().optional(),
  podeInvestir: z.enum(['SIM', 'NAO'] as const).optional(),
  indicacao: z.string().optional(),
  agendadoPor: z.enum(['MIGUEL', 'PEDRO', 'HEBERT', 'CLED', 'CAETANO'] as const).optional(),
  agendadoVia: z.enum(['LIGACAO', 'MENSAGEM'] as const, { required_error: 'Informe se foi por ligação ou mensagem' }),
  temSocio: z.enum(['SIM', 'NAO', 'NAO_PERGUNTADO'] as const),
  temMkt: z.enum(['SIM', 'NAO', 'NAO_PERGUNTADO'] as const),
  temSecretaria: z.enum(['SIM', 'NAO', 'NAO_PERGUNTADO'] as const),
  salaoOuClinica: z.enum(['SALAO', 'CLINICA', 'NAO_INFORMADO'] as const),
  meetingDate: z.string().min(1, 'Data da reunião é obrigatória'),
  meetingTime: z.string().min(1, 'Horário da reunião é obrigatório'),
});

type FormValues = z.input<typeof formSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const { addPipelineClient, criativos } = useCommercial();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get tomorrow's date as default
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clinicName: '',
      telefone: '',
      criativo: '',
      faturamento: 'NAO_INFORMADO',
      faturamentoPersonalizado: '',
      podeInvestir: undefined,
      indicacao: 'NAO',
      agendadoPor: undefined,
      agendadoVia: undefined,
      temSocio: 'NAO_PERGUNTADO',
      temMkt: 'NAO_PERGUNTADO',
      temSecretaria: 'NAO_PERGUNTADO',
      salaoOuClinica: 'NAO_INFORMADO',
      meetingDate: getTomorrowDate(),
      meetingTime: '10:00',
    },
  });

  const watchFaturamento = form.watch('faturamento');
  const show0_15KOptions = watchFaturamento === '0_A_15K';

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneForWhatsApp(data.telefone);
      
      addPipelineClient({
        ativo: true,
        clientName: data.clientName,
        clinicName: data.clinicName,
        telefone: formattedPhone,
        vendedor: undefined, // Vendedor será definido apenas ao mover para NEGOCIACAO ou posterior
        criativo: data.criativo,
        equipe: undefined, // Equipe será definida apenas ao fechar
        faturamento: data.faturamento as Faturamento,
        faturamentoPersonalizado: data.faturamento === 'PERSONALIZADO' ? data.faturamentoPersonalizado : undefined,
        podeInvestir: data.faturamento === '0_A_15K' ? data.podeInvestir : undefined,
        pacote: 'COMPLETO', // Default, will be set when moving to negotiation
        periodo: 'MENSAL', // Default, will be set when moving to negotiation
        indicacao: data.indicacao,
        agendadoPor: data.agendadoPor as Agendador | undefined,
        agendadoVia: data.agendadoVia,
        temSocio: data.temSocio as TemSocio,
        temMkt: data.temMkt as TemMkt,
        temSecretaria: data.temSecretaria as TemSecretaria,
        salaoOuClinica: data.salaoOuClinica as SalaoOuClinica,
        entrada: 0, // Default, will be set when moving to negotiation
        dataEntrada: new Date(),
        stage: 'NOVO' as PipelineStage,
        meetingDate: data.meetingDate,
        meetingTime: data.meetingTime,
      });
      toast.success('Cliente adicionado ao pipeline!');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead ao pipeline comercial.
          </DialogDescription>
        </DialogHeader>


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Cliente e Clínica */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Clínica</FormLabel>
                    <FormControl>
                      <Input placeholder="Clínica Exemplo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 1.5: Telefone */}
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (WhatsApp) *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(81) 99999-9999 ou 5581999999999" 
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 2: Criativo */}
            <FormField
              control={form.control}
              name="criativo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criativo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o criativo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-[9999]">
                      {criativos.length === 0 ? (
                        <SelectItem value="_loading" disabled>
                          Carregando criativos...
                        </SelectItem>
                      ) : (
                        criativos.map(criativo => (
                          <SelectItem key={criativo} value={criativo}>
                            {criativo}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 3: Faturamento */}
            <FormField
              control={form.control}
              name="faturamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faturamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {FATURAMENTO_OPTIONS.map(opt => (
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

            {/* Campo de valor personalizado - aparece quando selecionado PERSONALIZADO */}
            {watchFaturamento === 'PERSONALIZADO' && (
              <FormField
                control={form.control}
                name="faturamentoPersonalizado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informe o valor do faturamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 25K, 80K, 150K..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Campo "Pode investir?" - aparece quando faturamento é 0-15K */}
            {show0_15KOptions && (
              <FormField
                control={form.control}
                name="podeInvestir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pode investir?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        <SelectItem value="SIM">Sim</SelectItem>
                        <SelectItem value="NAO">Não</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Row 3.5: Tem Sócio, Tem MKT e Tem Secretária */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="temSocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem Sócio?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {TEM_SOCIO_OPTIONS.map(opt => (
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
                name="temMkt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem MKT?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {TEM_MKT_OPTIONS.map(opt => (
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
                name="temSecretaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem Secretária?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {TEM_SECRETARIA_OPTIONS.map(opt => (
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
            </div>

            {/* Row: Salão ou Clínica */}
            <FormField
              control={form.control}
              name="salaoOuClinica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salão ou Clínica?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      {SALAO_OU_CLINICA_OPTIONS.map(opt => (
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

            {/* Row 4: Indicação e Quem agendou */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="indicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {INDICACAO_OPTIONS.map(opt => (
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
                name="agendadoPor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quem agendou?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover">
                        {AGENDADOR_OPTIONS.map(opt => (
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
            </div>

            {/* Row 4.5: Agendado Por (Ligação/Mensagem) */}
            <FormField
              control={form.control}
              name="agendadoVia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendado Por</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      <SelectItem value="LIGACAO">Ligação</SelectItem>
                      <SelectItem value="MENSAGEM">Mensagem</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 5: Data e Horário da Reunião */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Reunião *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meetingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário da Reunião *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}