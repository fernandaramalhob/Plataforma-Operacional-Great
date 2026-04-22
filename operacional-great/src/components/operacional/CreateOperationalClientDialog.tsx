import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';
import { useCreateOperationalClient } from '@/hooks/useCRMData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  client_name: z.string().min(2, 'Nome do cliente é obrigatório'),
  pacote: z.string().min(1, 'Pacote é obrigatório'),
  team_id: z.string().min(1, 'Equipe é obrigatória'),
  plan: z.string().min(1, 'Período é obrigatório'),
  activated_at: z.string().min(1, 'Data de entrada é obrigatória'),
  pagador_anuncio: z.string().min(1, 'Pagador de anúncio é obrigatório'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateOperationalClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PACOTE_OPTIONS = [
  { value: 'COMPLETO', label: 'Completo' },
  { value: 'COMPLETO_NOVA_ERA', label: 'Completo Nova Era' },
  { value: 'TRAFEGO_E_CRIATIVOS', label: 'Tráfego e Criativos' },
  { value: 'ATENDIMENTO', label: 'Atendimento' },
  { value: 'TRAFEGO', label: 'Tráfego' },
  { value: 'TREINAMENTO_TRAFEGO_DESIGN', label: 'Treinamento / Tráfego / Design' },
  { value: 'TROCOU_TRAFEGO_ARTES', label: 'Trocou Tráfego / Artes' },
  { value: 'TRAFEGO_E_TREINAMENTO', label: 'Tráfego e Treinamento' },
  { value: 'IA', label: 'IA' },
  { value: 'TRAFEGO_ROTEIROS', label: 'Tráfego + Roteiros' },
  { value: 'TRAFEGO_IA', label: 'Tráfego + IA' },
];

const PLAN_OPTIONS = [
  { value: '7_DIAS', label: '7 Dias' },
  { value: '15_DIAS', label: '15 Dias' },
  { value: '30_DIAS', label: '30 Dias' },
  { value: '90_DIAS', label: '90 Dias' },
  { value: '180_DIAS', label: '180 Dias' },
  { value: '90_MRR', label: '90 - MRR' },
];

const PAGADOR_OPTIONS = [
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'GREAT', label: 'Great' },
];

const DEFAULT_TEAMS = [
  { id: 'equipe-7', name: 'Equipe 7' },
  { id: 'tropa-de-elite', name: 'Tropa de Elite' },
];

export function CreateOperationalClientDialog({
  open,
  onOpenChange,
}: CreateOperationalClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createClient = useCreateOperationalClient();

  const { data: dbTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const teams = dbTeams.length > 0 ? dbTeams : DEFAULT_TEAMS;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: '',
      pacote: '',
      team_id: '',
      plan: '',
      activated_at: '',
      pagador_anuncio: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await createClient.mutateAsync({
        client_name: values.client_name,
        clinic_name: null,
        plan: values.plan || null,
        deal_value: null,
        team_id: values.team_id || null,
        pagador_anuncio: values.pagador_anuncio || null,
        activated_at: values.activated_at || null,
        pacote: values.pacote || null,
      });

      toast({
        title: 'Cliente cadastrado',
        description: 'O cliente foi adicionado com sucesso ao operacional.',
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E10600', '#ff4d4d', '#ffffff', '#ff9999'],
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: 'Não foi possível cadastrar o cliente. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente Operacional</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pacote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pacote *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pacote" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PACOTE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipe *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a equipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
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
              name="pagador_anuncio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pagador de Anúncio *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAGADOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLAN_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="activated_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrada *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
