import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  User, 
  Building2, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  TrendingDown,
  Crown,
  Star,
  Award,
  AlertTriangle,
  CheckCircle,
  Users,
  CalendarClock,
  Edit2,
  Check,
  X,
  Users2,
  Trash2,
  Paperclip,
  Download,
  Upload,
  Loader2,
  Image as ImageIcon,
  FileText as FileTextIcon,
  KeyRound,
} from 'lucide-react';
import { DeleteOperationalClientDialog } from './DeleteOperationalClientDialog';
import { AddCreativeDialog } from './AddCreativeDialog';
import { OperationalClient, useMarkClientAsLoss, useMarkClientAsRenewed } from '@/hooks/useCRMData';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OperationalClient | null;
}

type ClientClass = 'A' | 'B' | 'C';

interface ClassInfo {
  label: string;
  description: string;
  treatment: string[];
  progression?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const CLASS_INFO: Record<ClientClass, ClassInfo> = {
  A: {
    label: 'Classe A',
    description: 'Investe Bem • Paga Bem • Tráfego + Criativos • Renovou',
    treatment: [
      'Prioridade máxima de tempo, estratégia e suporte',
      'Relatórios estratégicos, não apenas operacionais',
      'Criativos personalizados e campanhas testadas com maior orçamento'
    ],
    icon: <Crown className="h-5 w-5" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20'
  },
  B: {
    label: 'Classe B',
    description: 'Investe Médio • Paga Pouco',
    treatment: [
      'Acompanhamento mais próximo para consolidar resultados',
      'Reuniões quinzenais ou mensais de performance',
      'Estratégia de crescimento para alcançar a Classe A'
    ],
    progression: 'Sobe para Classe A se: → Renovar ou aumentar significativamente o investimento',
    icon: <Star className="h-5 w-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20'
  },
  C: {
    label: 'Classe C',
    description: 'Cliente que nós pagamos os anúncios ou Investe Pouco',
    treatment: [
      'Execução básica e automatizada (sem personalização)',
      'Foco em provar resultado inicial',
      'Comunicação simples, sem excesso de acompanhamento'
    ],
    progression: 'Sobe para Classe B se: → Começar a ter resultado positivo real. Sobe para Classe A se: → Renovar ou começar a investir bem',
    icon: <Award className="h-5 w-5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/20'
  }
};

const PLAN_OPTIONS = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
];

const PLAN_LABELS: Record<string, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral'
};

const PACOTE_OPTIONS = [
  { value: 'COMPLETO', label: 'Completo' },
  { value: 'TRAFEGO_E_CRIATIVOS', label: 'Tráfego e Criativos' },
  { value: 'TRAFEGO_E_ARTES', label: 'Tráfego e Artes' },
  { value: 'ATENDIMENTO', label: 'Atendimento' },
  { value: 'TRAFEGO', label: 'Tráfego' },
  { value: 'CONSULTORIA_COMERCIAL', label: 'Consultoria Comercial' },
];

const PACOTE_LABELS: Record<string, string> = {
  COMPLETO: 'Completo',
  TRAFEGO_E_CRIATIVOS: 'Tráfego e Criativos',
  TRAFEGO_E_ARTES: 'Tráfego e Artes',
  ATENDIMENTO: 'Atendimento',
  TRAFEGO: 'Tráfego',
  CONSULTORIA_COMERCIAL: 'Consultoria Comercial',
};

// Roles that can edit client plan
const CAN_EDIT_PLAN_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED'];

const CHURN_REASONS = [
  'Resultado abaixo do esperado',
  'Problema financeiro do cliente',
  'Falta de comunicação',
  'Preferiu outra agência',
  'Encerrou atividades',
  'Mudança de estratégia interna',
  'Insatisfação com atendimento',
  'Outro motivo'
];

function calculateClientClass(client: OperationalClient): ClientClass {
  // Logic based on: investment, payment, creative source, renewal status
  const dealValue = client.deal_value || 0;
  const hasRenewed = client.renewal_status === 'RENOVADO';
  const creativeSource = client.creative_source?.toLowerCase() || '';
  
  // Class A: High investment + Has renewed + Has creatives
  if (dealValue >= 3000 && hasRenewed && creativeSource.includes('criativo')) {
    return 'A';
  }
  
  // Class A: Very high investment
  if (dealValue >= 5000) {
    return 'A';
  }
  
  // Class B: Medium investment
  if (dealValue >= 1000 && dealValue < 3000) {
    return 'B';
  }
  
  // Class C: Low investment or we pay for ads
  return 'C';
}

// Roles that can delete clients
const CAN_DELETE_CLIENT_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED'];

export function ClientDetailsDialog({ open, onOpenChange, client }: ClientDetailsDialogProps) {
  const { user, isAdmin } = useAuth();
  const [showLossForm, setShowLossForm] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreativeDialog, setShowCreativeDialog] = useState(false);
  const [churnReason, setChurnReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [responsibleTeamId, setResponsibleTeamId] = useState('');
  const [renewalValueInput, setRenewalValueInput] = useState('');
  const [isEditingRenewalDate, setIsEditingRenewalDate] = useState(false);
  const [renewalDueDate, setRenewalDueDate] = useState<Date | undefined>(undefined);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isEditingDealValue, setIsEditingDealValue] = useState(false);
  const [dealValueInput, setDealValueInput] = useState<string>('');
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isEditingPagadorAnuncio, setIsEditingPagadorAnuncio] = useState(false);
  const [selectedPagadorAnuncio, setSelectedPagadorAnuncio] = useState<string>('');
  const [isEditingPacote, setIsEditingPacote] = useState(false);
  const [selectedPacote, setSelectedPacote] = useState<string>('');
  const [isEditingClientName, setIsEditingClientName] = useState(false);
  const [clientNameInput, setClientNameInput] = useState<string>('');
  const [isEditingAdAccount, setIsEditingAdAccount] = useState(false);
  const [adAccountName, setAdAccountName] = useState('');
  const [hasRecharge, setHasRecharge] = useState(false);
  const [rechargeValue, setRechargeValue] = useState('');
  const [isEditingStartMeeting, setIsEditingStartMeeting] = useState(false);
  const [startMeetingDate, setStartMeetingDate] = useState<Date | undefined>(undefined);
  
  // Check if user can edit plan and deal value
  const canEditPlan = isAdmin || (user?.role && CAN_EDIT_PLAN_ROLES.includes(user.role as UserRole));
  const canEditDealValue = isAdmin || (user?.role && CAN_EDIT_PLAN_ROLES.includes(user.role as UserRole));
  // Check if user can delete clients
  const canDeleteClient = isAdmin || (user?.role && CAN_DELETE_CLIENT_ROLES.includes(user.role as UserRole));
  
  const queryClient = useQueryClient();
  const markAsLoss = useMarkClientAsLoss();
  const markAsRenewed = useMarkClientAsRenewed();
  
  const updateRenewalDueDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: Date | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ renewal_due_date: date?.toISOString() || null })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Data de renovação atualizada');
      setIsEditingRenewalDate(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar data de renovação');
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ clientId, plan }: { clientId: string; plan: string }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ plan })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Plano atualizado com sucesso');
      setIsEditingPlan(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar plano');
    }
  });

  const updateDealValueMutation = useMutation({
    mutationFn: async ({ clientId, dealValue }: { clientId: string; dealValue: number }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ deal_value: dealValue })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Valor do contrato atualizado com sucesso');
      setIsEditingDealValue(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar valor do contrato');
    }
  });

  const updateStartDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: Date }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ created_at: date.toISOString() })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Data de entrada atualizada com sucesso');
      setIsEditingStartDate(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar data de entrada');
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ clientId, teamId }: { clientId: string; teamId: string | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ team_id: teamId })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Equipe atualizada com sucesso');
      setIsEditingTeam(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar equipe');
    }
  });

  const updatePagadorAnuncioMutation = useMutation({
    mutationFn: async ({ clientId, pagadorAnuncio }: { clientId: string; pagadorAnuncio: string | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ pagador_anuncio: pagadorAnuncio })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Pagador de anúncio atualizado com sucesso');
      setIsEditingPagadorAnuncio(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar pagador de anúncio');
    }
  });

  const updatePacoteMutation = useMutation({
    mutationFn: async ({ clientId, pacote }: { clientId: string; pacote: string | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ pacote })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Pacote atualizado com sucesso');
      setIsEditingPacote(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar pacote');
    }
  });

  const updateClientNameMutation = useMutation({
    mutationFn: async ({ clientId, clientName }: { clientId: string; clientName: string }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ client_name: clientName })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Nome do cliente atualizado com sucesso');
      setIsEditingClientName(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar nome do cliente');
    }
  });

  const updateAdAccountMutation = useMutation({
    mutationFn: async ({ clientId, ad_account_name, has_recharge, recharge_value }: { clientId: string; ad_account_name: string | null; has_recharge: boolean; recharge_value: number | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ ad_account_name, has_recharge, recharge_value } as any)
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Dados de acesso atualizados');
      setIsEditingAdAccount(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar dados de acesso');
    }
  });

  const updateStartMeetingDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: string | null }) => {
      const { error } = await supabase
        .from('operational_clients')
        .update({ start_meeting_date: date } as any)
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Data da reunião de start atualizada');
      setIsEditingStartMeeting(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar data da reunião');
    }
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      return data || [];
    }
  });
  
  // Fetch attachments from exec_cards linked to this client
  interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: number;
  }
  
  const { data: clientAttachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ['client-attachments', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('exec_cards')
        .select('id, title, attachments, board_id')
        .eq('client_id', client.id)
        .not('attachments', 'is', null);
      if (error) {
        console.error('Error fetching client attachments:', error);
        return [];
      }
      
      const allAttachments: (Attachment & { cardTitle: string })[] = [];
      for (const card of (data || [])) {
        const cardAttachments = (card.attachments as unknown as Attachment[]) || [];
        if (!Array.isArray(cardAttachments)) continue;
        for (const att of cardAttachments) {
          if (att && att.url) {
            allAttachments.push({ ...att, cardTitle: card.title });
          }
        }
      }
      return allAttachments;
    },
    enabled: !!client?.id && open,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Direct client files
  const { data: clientFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['client-files', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id && open,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !client?.id) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${client.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-files')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('client-files')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('client_files')
          .insert({
            client_id: client.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by_user_id: user?.id,
          });
        if (dbError) throw dbError;
      }
      queryClient.invalidateQueries({ queryKey: ['client-files', client.id] });
      toast.success(`${files.length} arquivo(s) enviado(s) com sucesso`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = fileUrl.split('/client-files/');
      if (urlParts[1]) {
        await supabase.storage.from('client-files').remove([decodeURIComponent(urlParts[1])]);
      }
      const { error } = await supabase.from('client_files').delete().eq('id', fileId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['client-files', client?.id] });
      toast.success('Arquivo removido');
    } catch (error) {
      toast.error('Erro ao remover arquivo');
    }
  };
  
  // Calculate suggested renewal date based on plan
  const getSuggestedRenewalDate = () => {
    if (!client) return undefined;
    const baseDate = client.activated_at ? new Date(client.activated_at) : new Date(client.created_at);
    const planMonths: Record<string, number> = {
      MENSAL: 1,
      TRIMESTRAL: 3,
      SEMESTRAL: 6
    };
    const months = planMonths[client.plan || 'MENSAL'] || 1;
    return addMonths(baseDate, months);
  };
  
  if (!client) return null;
  
  const clientClass = calculateClientClass(client);
  const classInfo = CLASS_INFO[clientClass];
  
  const handleMarkAsLoss = async () => {
    if (!churnReason) {
      toast.error('Selecione o motivo da perda');
      return;
    }
    if (!responsibleTeamId) {
      toast.error('Selecione a equipe responsável');
      return;
    }
    
    const finalReason = churnReason === 'Outro motivo' ? customReason : churnReason;
    
    try {
      await markAsLoss.mutateAsync({
        clientId: client.id,
        reason: finalReason,
        responsibleTeamId
      });
      toast.success('Cliente marcado como perda');
      setShowLossForm(false);
      setChurnReason('');
      setCustomReason('');
      setResponsibleTeamId('');
    } catch (error) {
      toast.error('Erro ao marcar cliente como perda');
    }
  };
  
  const handleMarkAsRenewed = async () => {
    if (!responsibleTeamId) {
      toast.error('Selecione a equipe responsável pela renovação');
      return;
    }
    
    // Parse renewal value if provided
    const renewalValue = renewalValueInput 
      ? parseFloat(renewalValueInput.replace(/[^\d.,]/g, '').replace(',', '.'))
      : undefined;
    
    try {
      await markAsRenewed.mutateAsync({
        clientId: client.id,
        responsibleTeamId,
        renewalValue: renewalValue && !isNaN(renewalValue) ? renewalValue : undefined
      });
      toast.success('Cliente marcado como renovado');
      setShowRenewalForm(false);
      setResponsibleTeamId('');
      setRenewalValueInput('');
    } catch (error) {
      toast.error('Erro ao marcar cliente como renovado');
    }
  };
  
  const resetForms = () => {
    setShowLossForm(false);
    setShowRenewalForm(false);
    setShowDeleteDialog(false);
    setChurnReason('');
    setCustomReason('');
    setResponsibleTeamId('');
    setRenewalValueInput('');
    setIsEditingRenewalDate(false);
    setRenewalDueDate(undefined);
    setIsEditingPlan(false);
    setSelectedPlan('');
    setIsEditingDealValue(false);
    setDealValueInput('');
    setIsEditingStartDate(false);
    setStartDate(undefined);
    setIsEditingTeam(false);
    setSelectedTeamId('');
    setIsEditingPagadorAnuncio(false);
    setSelectedPagadorAnuncio('');
    setIsEditingPacote(false);
    setSelectedPacote('');
    setIsEditingStartMeeting(false);
    setStartMeetingDate(undefined);
  };

  const handleStartEditTeam = () => {
    setSelectedTeamId(client?.team_id || '__none__');
    setIsEditingTeam(true);
  };

  const handleSaveTeam = () => {
    if (!client) return;
    updateTeamMutation.mutate({ clientId: client.id, teamId: selectedTeamId === '__none__' ? null : selectedTeamId || null });
  };

  const handleCancelEditTeam = () => {
    setIsEditingTeam(false);
    setSelectedTeamId('');
  };

  const handleStartEditPagadorAnuncio = () => {
    setSelectedPagadorAnuncio(client?.pagador_anuncio || '__none__');
    setIsEditingPagadorAnuncio(true);
  };

  const handleSavePagadorAnuncio = () => {
    if (!client) return;
    updatePagadorAnuncioMutation.mutate({ clientId: client.id, pagadorAnuncio: selectedPagadorAnuncio === '__none__' ? null : selectedPagadorAnuncio || null });
  };

  const handleCancelEditPagadorAnuncio = () => {
    setIsEditingPagadorAnuncio(false);
    setSelectedPagadorAnuncio('');
  };

  const handleStartEditPacote = () => {
    setSelectedPacote(client?.pacote || '__none__');
    setIsEditingPacote(true);
  };

  const handleSavePacote = () => {
    if (!client) return;
    updatePacoteMutation.mutate({ clientId: client.id, pacote: selectedPacote === '__none__' ? null : selectedPacote || null });
  };

  const handleCancelEditPacote = () => {
    setIsEditingPacote(false);
    setSelectedPacote('');
  };

  const handleStartEditPlan = () => {
    setSelectedPlan(client?.plan || '');
    setIsEditingPlan(true);
  };

  const handleSavePlan = () => {
    if (!client || !selectedPlan) return;
    updatePlanMutation.mutate({ clientId: client.id, plan: selectedPlan });
  };

  const handleCancelEditPlan = () => {
    setIsEditingPlan(false);
    setSelectedPlan('');
  };

  const handleStartEditDealValue = () => {
    setDealValueInput(client?.deal_value?.toString() || '');
    setIsEditingDealValue(true);
  };

  const handleSaveDealValue = () => {
    if (!client) return;
    const numericValue = parseFloat(dealValueInput.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error('Valor inválido');
      return;
    }
    updateDealValueMutation.mutate({ clientId: client.id, dealValue: numericValue });
  };

  const handleCancelEditDealValue = () => {
    setIsEditingDealValue(false);
    setDealValueInput('');
  };
  
  const handleSaveRenewalDueDate = () => {
    if (!client || !renewalDueDate) return;
    updateRenewalDueDateMutation.mutate({ clientId: client.id, date: renewalDueDate });
  };
  
  const handleStartEditRenewalDate = () => {
    const currentDate = (client as any).renewal_due_date 
      ? new Date((client as any).renewal_due_date) 
      : getSuggestedRenewalDate();
    setRenewalDueDate(currentDate);
    setIsEditingRenewalDate(true);
  };
  
  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForms();
    }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Detalhes do Cliente
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Client Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isEditingClientName ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={clientNameInput}
                        onChange={(e) => setClientNameInput(e.target.value)}
                        className="h-8 text-lg font-semibold"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (clientNameInput.trim() && clientNameInput.trim() !== client.client_name) {
                            updateClientNameMutation.mutate({ clientId: client.id, clientName: clientNameInput.trim() });
                          } else {
                            setIsEditingClientName(false);
                          }
                        }}
                        disabled={updateClientNameMutation.isPending}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingClientName(false)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-foreground">{client.client_name}</h3>
                      {canEditPlan && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setClientNameInput(client.client_name);
                            setIsEditingClientName(true);
                          }}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                  {/* Client Tier Badge */}
                  {!isEditingClientName && client.client_tier && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        client.client_tier === 'PREMIUM' 
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}
                    >
                      {client.client_tier === 'PREMIUM' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <Users2 className="h-3 w-3" />
                      )}
                      {client.client_tier}
                    </span>
                  )}
                </div>
                {client.clinic_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {client.clinic_name}
                  </p>
                )}
              </div>
              <Badge variant={
                client.status_operacional === 'ATIVO' ? 'default' :
                client.status_operacional === 'CHURNED' ? 'destructive' :
                'secondary'
              }>
                {client.status_operacional}
              </Badge>
            </div>
            
            {/* Dados Comerciais Section */}
            <div className="bg-surface-2 rounded-lg p-4 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Dados Comerciais</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Pacote */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Pacote</p>
                    {canEditPlan && !isEditingPacote && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditPacote}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingPacote ? (
                    <div className="flex items-center gap-1">
                      <Select value={selectedPacote} onValueChange={setSelectedPacote}>
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="__none__">Não definido</SelectItem>
                          {PACOTE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSavePacote}
                        disabled={updatePacoteMutation.isPending}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditPacote}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-foreground text-sm">
                      {client.pacote ? PACOTE_LABELS[client.pacote] || client.pacote : 'Não definido'}
                    </p>
                  )}
                </div>

                {/* Pagador de Anúncio */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Pagador de Anúncio</p>
                    {canEditPlan && !isEditingPagadorAnuncio && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditPagadorAnuncio}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingPagadorAnuncio ? (
                    <div className="flex items-center gap-1">
                      <Select value={selectedPagadorAnuncio} onValueChange={setSelectedPagadorAnuncio}>
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="__none__">Não definido</SelectItem>
                          <SelectItem value="GREAT">Great paga anúncio</SelectItem>
                          <SelectItem value="CLIENTE">Cliente paga anúncio</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSavePagadorAnuncio}
                        disabled={updatePagadorAnuncioMutation.isPending}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditPagadorAnuncio}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-foreground text-sm">
                      {client.pagador_anuncio === 'GREAT' ? 'Great paga anúncio' : 
                       client.pagador_anuncio === 'CLIENTE' ? 'Cliente paga anúncio' : 'Não definido'}
                    </p>
                  )}
                </div>

                {/* Equipe */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Equipe</p>
                    {canEditPlan && !isEditingTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditTeam}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingTeam ? (
                    <div className="flex items-center gap-1">
                      <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          <SelectItem value="__none__">Sem equipe</SelectItem>
                          {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveTeam}
                        disabled={updateTeamMutation.isPending}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditTeam}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-foreground text-sm flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {teams.find(t => t.id === client.team_id)?.name || 'Não definido'}
                    </p>
                  )}
                </div>

                {/* Período (Plano) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Período</p>
                    {canEditPlan && !isEditingPlan && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditPlan}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingPlan ? (
                    <div className="flex items-center gap-1">
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {PLAN_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSavePlan}
                        disabled={!selectedPlan || updatePlanMutation.isPending}
                        className="h-7 w-7 p-0 text-success hover:text-success"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditPlan}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-foreground text-sm">
                      {client.plan ? PLAN_LABELS[client.plan] || client.plan : 'Não definido'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Valor e Data de Entrada */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  {canEditDealValue && !isEditingDealValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditDealValue}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingDealValue ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={dealValueInput}
                      onChange={(e) => setDealValueInput(e.target.value)}
                      placeholder="0,00"
                      className="h-7 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveDealValue}
                      disabled={!dealValueInput || updateDealValueMutation.isPending}
                      className="h-7 w-7 p-0 text-success hover:text-success"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditDealValue}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {client.deal_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}
                  </p>
                )}
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Desde</p>
                  {canEditPlan && !isEditingStartDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStartDate(new Date(client.created_at));
                        setIsEditingStartDate(true);
                      }}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingStartDate ? (
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-8 text-sm",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-3 w-3" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (startDate && client) {
                            updateStartDateMutation.mutate({ clientId: client.id, date: startDate });
                          }
                        }}
                        disabled={!startDate || updateStartDateMutation.isPending}
                        className="h-6 px-2 text-success hover:text-success"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingStartDate(false);
                          setStartDate(undefined);
                        }}
                        className="h-6 px-2 text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(client.created_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Renewal Due Date Section */}
          <div className="bg-surface-2 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Data de Renovação</span>
              </div>
              {!isEditingRenewalDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditRenewalDate}
                  className="h-8 px-2"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              )}
            </div>
            
            {isEditingRenewalDate ? (
              <div className="space-y-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !renewalDueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {renewalDueDate ? format(renewalDueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={renewalDueDate}
                      onSelect={setRenewalDueDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setIsEditingRenewalDate(false);
                      setRenewalDueDate(undefined);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSaveRenewalDueDate}
                    disabled={!renewalDueDate || updateRenewalDueDateMutation.isPending}
                  >
                    {updateRenewalDueDateMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {(client as any).renewal_due_date ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      {format(new Date((client as any).renewal_due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {new Date((client as any).renewal_due_date) < new Date() && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Vencida
                      </Badge>
                    )}
                    {new Date((client as any).renewal_due_date) >= new Date() && 
                     new Date((client as any).renewal_due_date) <= addMonths(new Date(), 1) && (
                      <Badge variant="outline" className="text-xs border-warning text-warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Próxima do vencimento
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma data definida
                    </p>
                    {getSuggestedRenewalDate() && (
                      <p className="text-xs text-muted-foreground">
                        Sugestão baseada no plano: {format(getSuggestedRenewalDate()!, "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Client Class */}
          <div className={cn(
            "rounded-xl border-2 p-4",
            classInfo.bgColor
          )}>
            <div className="flex items-center gap-2 mb-3">
              <div className={classInfo.color}>{classInfo.icon}</div>
              <h4 className={cn("font-bold text-lg", classInfo.color)}>{classInfo.label}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{classInfo.description}</p>
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Tratamento</p>
              <ul className="space-y-1">
                {classInfo.treatment.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-1 text-success shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {classInfo.progression && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground italic">{classInfo.progression}</p>
              </div>
            )}
          </div>
          
          <Separator />

          {/* Envio de Acesso Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Envio de Acesso (Dra.)</h4>
              </div>
              {!isEditingAdAccount ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdAccountName((client as any)?.ad_account_name || '');
                    setHasRecharge((client as any)?.has_recharge || false);
                    setRechargeValue((client as any)?.recharge_value?.toString() || '');
                    setIsEditingAdAccount(true);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!client) return;
                      updateAdAccountMutation.mutate({
                        clientId: client.id,
                        ad_account_name: adAccountName || null,
                        has_recharge: hasRecharge,
                        recharge_value: hasRecharge && rechargeValue ? parseFloat(rechargeValue) : null,
                      });
                    }}
                    disabled={updateAdAccountMutation.isPending}
                    className="h-7 w-7 p-0 text-success hover:text-success"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingAdAccount(false)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {isEditingAdAccount ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome da Conta de Anúncio</label>
                  <Input
                    value={adAccountName}
                    onChange={(e) => setAdAccountName(e.target.value)}
                    placeholder="Ex: Dra. Fulana - Meta Ads"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Status de Recarga</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={hasRecharge ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setHasRecharge(true)}
                    >
                      Sim
                    </Button>
                    <Button
                      variant={!hasRecharge ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setHasRecharge(false)}
                    >
                      Não
                    </Button>
                  </div>
                </div>
                {hasRecharge && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Valor da Recarga (R$)</label>
                    <Input
                      type="number"
                      value={rechargeValue}
                      onChange={(e) => setRechargeValue(e.target.value)}
                      placeholder="0,00"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Conta:</span>
                  <span className="text-foreground text-xs font-medium">
                    {(client as any)?.ad_account_name || <span className="text-muted-foreground italic">Não informado</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Recarga:</span>
                  <Badge variant={(client as any)?.has_recharge ? 'default' : 'secondary'} className="text-[10px]">
                    {(client as any)?.has_recharge ? 'Sim' : 'Não'}
                  </Badge>
                  {(client as any)?.has_recharge && (client as any)?.recharge_value > 0 && (
                    <span className="text-xs font-medium text-foreground">
                      R$ {Number((client as any)?.recharge_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Data da Reunião de Start */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Data da Reunião de Start</h4>
              </div>
              {!isEditingStartMeeting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const current = (client as any)?.start_meeting_date;
                    setStartMeetingDate(current ? new Date(current + 'T00:00:00') : undefined);
                    setIsEditingStartMeeting(true);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!client || !startMeetingDate) return;
                      const dateStr = format(startMeetingDate, 'yyyy-MM-dd');
                      updateStartMeetingDateMutation.mutate({ clientId: client.id, date: dateStr });
                    }}
                    disabled={updateStartMeetingDateMutation.isPending}
                    className="h-7 w-7 p-0 text-success hover:text-success"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingStartMeeting(false)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {isEditingStartMeeting ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-sm", !startMeetingDate && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {startMeetingDate ? format(startMeetingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startMeetingDate}
                    onSelect={setStartMeetingDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs">Data:</span>
                <span className="text-foreground text-xs font-medium">
                  {(client as any)?.start_meeting_date 
                    ? format(new Date((client as any).start_meeting_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                    : <span className="text-muted-foreground italic">Não definida</span>
                  }
                </span>
              </div>
            )}
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">
                  Arquivos {(clientFiles.length + clientAttachments.length) > 0 && `(${clientFiles.length + clientAttachments.length})`}
                </h4>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreativeDialog(true)}
                  className="h-7 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Adicionar Criativo
                </Button>
              </div>
            </div>

            {/* Direct client files */}
            {filesLoading ? (
              <p className="text-xs text-muted-foreground">Carregando arquivos...</p>
            ) : clientFiles.length > 0 ? (
              <div className="space-y-2">
                {clientFiles.map((file) => {
                  const isImage = file.file_type?.startsWith('image/');
                  return (
                    <div key={file.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
                      {isImage ? (
                        <img src={file.file_url} alt={file.file_name} className="h-10 w-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.file_name}</p>
                        {file.file_size && (
                          <p className="text-[10px] text-muted-foreground">
                            {(file.file_size / 1024).toFixed(0)} KB
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted">
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                        <button onClick={() => handleDeleteFile(file.id, file.file_url)} className="p-1 rounded hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Exec card attachments */}
            {attachmentsLoading ? (
              <p className="text-xs text-muted-foreground">Carregando arquivos de execução...</p>
            ) : clientAttachments.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Via Cards de Execução</p>
                {clientAttachments.map((att) => {
                  const isImage = att.type?.startsWith('image/');
                  return (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
                      {isImage ? (
                        <img src={att.url} alt={att.name} className="h-10 w-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">via {att.cardTitle}</p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {clientFiles.length === 0 && clientAttachments.length === 0 && !filesLoading && !attachmentsLoading && (
              <p className="text-xs text-muted-foreground">Nenhum arquivo anexado.</p>
            )}
          </div>
          <Separator />
          
          
          {/* Current Status */}
          {(client.churn_status || client.renewal_status) && (
            <>
              <div className="space-y-3">
                {client.renewal_status === 'RENOVADO' && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-success mb-1">
                      <RefreshCw className="h-4 w-4" />
                      <span className="font-medium">Cliente Renovado</span>
                    </div>
                    {client.renewal_date && (
                      <p className="text-sm text-muted-foreground">
                        Em {new Date(client.renewal_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
                
                {client.churn_status === 'PERDIDO' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-destructive mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">Cliente Perdido</span>
                    </div>
                    {client.churn_reason && (
                      <p className="text-sm text-muted-foreground">
                        Motivo: {client.churn_reason}
                      </p>
                    )}
                    {client.churn_date && (
                      <p className="text-sm text-muted-foreground">
                        Em {new Date(client.churn_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}
          
          {/* Actions */}
          {!showLossForm && !showRenewalForm && client.churn_status !== 'PERDIDO' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-success text-success hover:bg-success/10"
                  onClick={() => setShowRenewalForm(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renovar
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setShowLossForm(true)}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Perda
                </Button>
              </div>
              
              {/* Delete button - only for Coordinators and Admins */}
              {canDeleteClient && (
                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Cliente
                </Button>
              )}
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <DeleteOperationalClientDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            client={client}
            onSuccess={() => onOpenChange(false)}
          />

          {/* Add Creative Dialog */}
          {client && (
            <AddCreativeDialog
              open={showCreativeDialog}
              onOpenChange={setShowCreativeDialog}
              clientId={client.id}
              clientName={client.client_name}
            />
          )}
          
          {/* Loss Form */}
          {showLossForm && (
            <div className="space-y-4 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-semibold">Registrar Perda de Cliente</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    O cliente cancelou alegando o quê? *
                  </label>
                  <Select value={churnReason} onValueChange={setChurnReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHURN_REASONS.map(reason => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {churnReason === 'Outro motivo' && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Descreva o motivo *
                    </label>
                    <Textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Descreva o motivo do cancelamento..."
                      rows={3}
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Equipe Responsável *
                  </label>
                  <Select value={responsibleTeamId} onValueChange={setResponsibleTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowLossForm(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleMarkAsLoss}
                  disabled={markAsLoss.isPending}
                >
                  {markAsLoss.isPending ? 'Salvando...' : 'Confirmar Perda'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Renewal Form */}
          {showRenewalForm && (
            <div className="space-y-4 bg-success/5 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success">
                <RefreshCw className="h-5 w-5" />
                <h4 className="font-semibold">Registrar Renovação</h4>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Equipe Responsável pela Renovação *
                </label>
                <Select value={responsibleTeamId} onValueChange={setResponsibleTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Valor da Renovação (R$)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Ex: 2.500,00"
                    value={renewalValueInput}
                    onChange={(e) => setRenewalValueInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional: informe o valor pago pela renovação
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRenewalForm(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="success" 
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleMarkAsRenewed}
                  disabled={markAsRenewed.isPending}
                >
                  {markAsRenewed.isPending ? 'Salvando...' : 'Confirmar Renovação'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
