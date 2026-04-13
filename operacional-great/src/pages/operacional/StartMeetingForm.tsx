import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FormData {
  nome_empresa: string;
  responsavel_projeto: string;
  endereco: string;
  instagram_login: string;
  facebook_login: string;
  numero_campanha: string;
  produtos_servicos: string;
  produto_resultado: string;
  ticket_medio: string;
  tabela_servicos: string;
  valor_meta_ads: string;
  valores_diretos_artes: string;
  publico_alvo: string;
  idade_media: string;
  classe_social: string;
  interesses_publico: string;
  concorrentes_instagram: string;
  possui_identidade_visual: string;
  arquivos_identidade: string;
  cores_marca: string;
  preferencia_tipografia: string;
  info_adicional: string;
  restricao_comunicacao: string;
}

const initialFormData: FormData = {
  nome_empresa: '',
  responsavel_projeto: '',
  endereco: '',
  instagram_login: '',
  facebook_login: '',
  numero_campanha: '',
  produtos_servicos: '',
  produto_resultado: '',
  ticket_medio: '',
  tabela_servicos: '',
  valor_meta_ads: '',
  valores_diretos_artes: '',
  publico_alvo: '',
  idade_media: '',
  classe_social: '',
  interesses_publico: '',
  concorrentes_instagram: '',
  possui_identidade_visual: '',
  arquivos_identidade: '',
  cores_marca: '',
  preferencia_tipografia: '',
  info_adicional: '',
  restricao_comunicacao: '',
};

function FormCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}

function FormQuestion({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <FormCard>
      <Label className="text-sm font-semibold text-foreground mb-3 block">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </FormCard>
  );
}

export default function StartMeetingForm() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load client name
  const { data: client } = useQuery({
    queryKey: ['operational-client', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('operational_clients')
        .select('client_name')
        .eq('id', clientId!)
        .single();
      return data;
    },
    enabled: !!clientId,
  });

  // Load existing response
  const { data: existingResponse } = useQuery({
    queryKey: ['start-form-response', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_start_form_responses')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (existingResponse) {
      const mapped: FormData = { ...initialFormData };
      (Object.keys(initialFormData) as (keyof FormData)[]).forEach((key) => {
        if ((existingResponse as any)[key]) {
          mapped[key] = (existingResponse as any)[key];
        }
      });
      setFormData(mapped);
    }
  }, [existingResponse]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!clientId || !user) return;
    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId,
        submitted_by_user_id: user.id,
        ...formData,
      };

      if (existingResponse) {
        const { error } = await supabase
          .from('client_start_form_responses')
          .update(payload)
          .eq('id', existingResponse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_start_form_responses')
          .insert(payload);
        if (error) throw error;
      }

      setSubmitted(true);
      toast.success('Formulário salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Formulário Enviado!</h2>
          <p className="text-muted-foreground text-sm">As respostas do formulário de Reunião de Start foram salvas com sucesso.</p>
          <Button onClick={() => navigate(`/operacional/crm/cliente/${clientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao Cliente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4" onClick={() => navigate(`/operacional/crm/cliente/${clientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Voltar
          </Button>
          <h1 className="text-2xl font-bold">Formulário — Reunião de Start</h1>
          {client && <p className="text-primary-foreground/70 mt-1">Cliente: {client.client_name}</p>}
          <p className="text-primary-foreground/60 text-sm mt-2">Preencha as informações abaixo para iniciar o projeto.</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Section: Informações da Empresa */}
        <FormCard className="border-l-4 border-l-primary">
          <h2 className="text-base font-bold text-foreground">Informações da Empresa</h2>
          <p className="text-xs text-muted-foreground mt-1">Dados básicos sobre o negócio</p>
        </FormCard>

        <FormQuestion label="Nome da empresa:">
          <Input value={formData.nome_empresa} onChange={e => updateField('nome_empresa', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Responsável pelo projeto:">
          <Input value={formData.responsavel_projeto} onChange={e => updateField('responsavel_projeto', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Endereço completo (Rua, Cidade, Estado, CEP):">
          <Input value={formData.endereco} onChange={e => updateField('endereco', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        {/* Section: Acessos */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Acessos</h2>
          <p className="text-xs text-muted-foreground mt-1">Logins e informações de contato</p>
        </FormCard>

        <FormQuestion label="Instagram (login e senha):">
          <Input value={formData.instagram_login} onChange={e => updateField('instagram_login', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Facebook / Meta Ads (login e senha):">
          <Input value={formData.facebook_login} onChange={e => updateField('facebook_login', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Número que você deseja que chegue as mensagens da campanha:">
          <Input value={formData.numero_campanha} onChange={e => updateField('numero_campanha', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        {/* Section: Produtos e Serviços */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Produtos e Serviços</h2>
          <p className="text-xs text-muted-foreground mt-1">Detalhes sobre o que o cliente oferece</p>
        </FormCard>

        <FormQuestion label="Principais produtos/serviços oferecidos:">
          <Textarea value={formData.produtos_servicos} onChange={e => updateField('produtos_servicos', e.target.value)} placeholder="Sua resposta" rows={3} />
        </FormQuestion>

        <FormQuestion label="Produto/serviço que mais gera resultado hoje:">
          <Input value={formData.produto_resultado} onChange={e => updateField('produto_resultado', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Ticket médio das vendas:">
          <Input value={formData.ticket_medio} onChange={e => updateField('ticket_medio', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Tabela de serviços com valores e parcelamento:">
          <Textarea value={formData.tabela_servicos} onChange={e => updateField('tabela_servicos', e.target.value)} placeholder="Sua resposta" rows={3} />
        </FormQuestion>

        {/* Section: Investimento */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Investimento e Estratégia</h2>
        </FormCard>

        <FormQuestion label="Qual vai ser o valor investindo dentro da plataforma do META ADS?">
          <Input value={formData.valor_meta_ads} onChange={e => updateField('valor_meta_ads', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Deseja utilizar valores diretos nas artes para atrair mais clientes?">
          <RadioGroup value={formData.valores_diretos_artes} onValueChange={v => updateField('valores_diretos_artes', v)} className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Sim" id="valores-sim" />
              <Label htmlFor="valores-sim" className="text-sm cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Não" id="valores-nao" />
              <Label htmlFor="valores-nao" className="text-sm cursor-pointer">Não</Label>
            </div>
          </RadioGroup>
        </FormQuestion>

        {/* Section: Público-Alvo */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Público-Alvo</h2>
          <p className="text-xs text-muted-foreground mt-1">Informações sobre o público do cliente</p>
        </FormCard>

        <FormQuestion label="PÚBLICO-ALVO">
          <RadioGroup value={formData.publico_alvo} onValueChange={v => updateField('publico_alvo', v)} className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Masculino" id="pub-masc" />
              <Label htmlFor="pub-masc" className="text-sm cursor-pointer">Masculino</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Feminino" id="pub-fem" />
              <Label htmlFor="pub-fem" className="text-sm cursor-pointer">Feminino</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Ambos" id="pub-ambos" />
              <Label htmlFor="pub-ambos" className="text-sm cursor-pointer">Ambos</Label>
            </div>
          </RadioGroup>
        </FormQuestion>

        <FormQuestion label="Idade média do público:">
          <Input value={formData.idade_media} onChange={e => updateField('idade_media', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Classe social:">
          <Input value={formData.classe_social} onChange={e => updateField('classe_social', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Interesses do público:">
          <Textarea value={formData.interesses_publico} onChange={e => updateField('interesses_publico', e.target.value)} placeholder="Sua resposta" rows={3} />
        </FormQuestion>

        <FormQuestion label="Instagram dos principais concorrentes diretos:">
          <Textarea value={formData.concorrentes_instagram} onChange={e => updateField('concorrentes_instagram', e.target.value)} placeholder="Sua resposta" rows={2} />
        </FormQuestion>

        {/* Section: Identidade Visual */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Identidade Visual</h2>
          <p className="text-xs text-muted-foreground mt-1">Marca e design</p>
        </FormCard>

        <FormQuestion label="Você possui identidade visual da marca?">
          <RadioGroup value={formData.possui_identidade_visual} onValueChange={v => updateField('possui_identidade_visual', v)} className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Sim" id="id-visual-sim" />
              <Label htmlFor="id-visual-sim" className="text-sm cursor-pointer">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Não" id="id-visual-nao" />
              <Label htmlFor="id-visual-nao" className="text-sm cursor-pointer">Não</Label>
            </div>
          </RadioGroup>
        </FormQuestion>

        <FormQuestion label="Arquivos de identidade visual (logo, manual, etc.):">
          <RadioGroup value={formData.arquivos_identidade} onValueChange={v => updateField('arquivos_identidade', v)} className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Enviei no grupo" id="arq-enviei" />
              <Label htmlFor="arq-enviei" className="text-sm cursor-pointer">Enviei no grupo</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Não tenho" id="arq-nao" />
              <Label htmlFor="arq-nao" className="text-sm cursor-pointer">Não tenho</Label>
            </div>
          </RadioGroup>
        </FormQuestion>

        <FormQuestion label="Cores que representam a marca (mínimo 3):">
          <Input value={formData.cores_marca} onChange={e => updateField('cores_marca', e.target.value)} placeholder="Sua resposta" />
        </FormQuestion>

        <FormQuestion label="Preferência de tipografia:">
          <RadioGroup value={formData.preferencia_tipografia} onValueChange={v => updateField('preferencia_tipografia', v)} className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Fonte sem serifa (moderna, simples, prática)" id="tip-sem" />
              <Label htmlFor="tip-sem" className="text-sm cursor-pointer">Fonte sem serifa (moderna, simples, prática)</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Fonte com serifa (tradicional, formal, confiável)" id="tip-com" />
              <Label htmlFor="tip-com" className="text-sm cursor-pointer">Fonte com serifa (tradicional, formal, confiável)</Label>
            </div>
          </RadioGroup>
        </FormQuestion>

        {/* Section: Observações */}
        <FormCard className="border-l-4 border-l-primary mt-8">
          <h2 className="text-base font-bold text-foreground">Observações Finais</h2>
        </FormCard>

        <FormQuestion label="Alguma informação adicional relevante para anúncios ou criação visual?">
          <Textarea value={formData.info_adicional} onChange={e => updateField('info_adicional', e.target.value)} placeholder="Sua resposta" rows={3} />
        </FormQuestion>

        <FormQuestion label="Existe alguma restrição de comunicação ou promessa?">
          <Textarea value={formData.restricao_comunicacao} onChange={e => updateField('restricao_comunicacao', e.target.value)} placeholder="Sua resposta" rows={3} />
        </FormQuestion>

        {/* Submit */}
        <div className="flex justify-between items-center pt-4 pb-8">
          <Button variant="outline" onClick={() => navigate(`/operacional/crm/cliente/${clientId}`)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[140px]">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : existingResponse ? 'Atualizar Respostas' : 'Enviar Respostas'}
          </Button>
        </div>
      </div>
    </div>
  );
}
