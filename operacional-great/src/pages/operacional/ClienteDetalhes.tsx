import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  User, Building2, Calendar, DollarSign, RefreshCw, TrendingDown,
  Crown, AlertTriangle, CheckCircle, Users, CalendarClock,
  Edit2, Check, X, Users2, Trash2, Paperclip, Download, Upload,
  Loader2, Image as ImageIcon, FileText as FileTextIcon, KeyRound,
  ArrowLeft, Rocket,
} from 'lucide-react';
import { DeleteOperationalClientDialog } from '@/components/operacional/DeleteOperationalClientDialog';
import { AddCreativeDialog } from '@/components/operacional/AddCreativeDialog';
import { useOperationalClients, useMarkClientAsLoss, useMarkClientAsRenewed } from '@/hooks/useCRMData';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLAN_OPTIONS = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
];
const PLAN_LABELS: Record<string, string> = { MENSAL: 'Mensal', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral' };

const PACOTE_OPTIONS = [
  { value: 'COMPLETO', label: 'Completo' },
  { value: 'COMPLETO_NOVA_ERA', label: 'Completo Nova Era' },
  { value: 'TRAFEGO_E_CRIATIVOS', label: 'Tráfego e Criativos' },
  { value: 'TRAFEGO_E_ARTES', label: 'Tráfego e Artes' },
  { value: 'TRAFEGO_E_TREINAMENTO', label: 'Tráfego e Treinamento' },
  { value: 'ATENDIMENTO', label: 'Atendimento' },
  { value: 'TRAFEGO', label: 'Tráfego' },
  { value: 'CONSULTORIA_COMERCIAL', label: 'Consultoria Comercial' },
];
const PACOTE_LABELS: Record<string, string> = Object.fromEntries(PACOTE_OPTIONS.map(o => [o.value, o.label]));

const CAN_EDIT_PLAN_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED'];
const CAN_DELETE_CLIENT_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED'];

const ONBOARDING_STATUS_OPTIONS = [
  { value: 'ACESSO_AO_BRIEFING', label: 'Acesso ao Briefing', color: 'bg-red-500' },
  { value: 'AINDA_NAO_PREENCHEU_BRIEFING', label: 'Ainda Não Preencheu o Briefing', color: 'bg-orange-400' },
  { value: 'PLANEJAMENTO_ONBOARDING', label: 'Planejamento Onboarding', color: 'bg-gray-400' },
  { value: 'REUNIAO_ONBOARDING_FEITA', label: 'Reunião Onboarding Feita', color: 'bg-blue-400' },
  { value: 'CONEXAO_INSTAGRAM_WHATSAPP', label: 'Conexão com o Instagram / WhatsApp', color: 'bg-gray-500' },
  { value: 'CONFIGURAR_PAGAMENTO', label: 'Configurar Forma de Pagamento', color: 'bg-amber-500' },
  { value: 'PROCESSO_START_CONCLUIDO', label: 'Processo de Start Concluído', color: 'bg-green-400' },
  { value: 'REUNIAO_DE_ONBOARDING', label: 'Reunião de Onboarding', color: 'bg-red-600' },
  { value: 'ESPERANDO_ACESSO_FACEBOOK', label: 'Esperando o Acesso do Facebook', color: 'bg-yellow-500' },
  { value: 'ESPERANDO_ACESSO_INSTAGRAM', label: 'Esperando o Acesso do Instagram', color: 'bg-yellow-600' },
  { value: 'ESPERANDO_ACESSOS', label: 'Esperando Acessos', color: 'bg-red-500' },
  { value: 'ACESSO_ENVIADO', label: 'Acesso Enviado', color: 'bg-emerald-500' },
  { value: 'CLIENTE_CANCELOU', label: 'Cliente Cancelou', color: 'bg-gray-300' },
  { value: 'AGUARDANDO_CODIGOS', label: 'Aguardando Códigos', color: 'bg-amber-600' },
  { value: 'AGUARDANDO_CLIENTE_INICIAR', label: 'Aguardando Cliente Iniciar', color: 'bg-gray-700' },
  { value: 'ATIVO', label: 'Ativo', color: 'bg-success' },
];

const CHURN_REASONS = [
  'Resultado abaixo do esperado', 'Problema financeiro do cliente', 'Falta de comunicação',
  'Preferiu outra agência', 'Encerrou atividades', 'Mudança de estratégia interna',
  'Insatisfação com atendimento', 'Outro motivo'
];

export default function ClienteDetalhes() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

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
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isEditingDealValue, setIsEditingDealValue] = useState(false);
  const [dealValueInput, setDealValueInput] = useState('');
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isEditingPagadorAnuncio, setIsEditingPagadorAnuncio] = useState(false);
  const [selectedPagadorAnuncio, setSelectedPagadorAnuncio] = useState('');
  const [isEditingPacote, setIsEditingPacote] = useState(false);
  const [selectedPacote, setSelectedPacote] = useState('');
  const [isEditingClientName, setIsEditingClientName] = useState(false);
  const [clientNameInput, setClientNameInput] = useState('');
  const [isEditingAdAccount, setIsEditingAdAccount] = useState(false);
  const [adAccountName, setAdAccountName] = useState('');
  const [hasRecharge, setHasRecharge] = useState(false);
  const [rechargeValue, setRechargeValue] = useState('');
  const [isEditingStartMeeting, setIsEditingStartMeeting] = useState(false);
  const [startMeetingDate, setStartMeetingDate] = useState<Date | undefined>(undefined);

  const [showNpsPopup, setShowNpsPopup] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditPlan = isAdmin || (user?.role && CAN_EDIT_PLAN_ROLES.includes(user.role as UserRole));
  const canDeleteClient = isAdmin || (user?.role && CAN_DELETE_CLIENT_ROLES.includes(user.role as UserRole));

  const markAsLoss = useMarkClientAsLoss();
  const markAsRenewed = useMarkClientAsRenewed();
  const { data: clients = [] } = useOperationalClients();
  const client = clients.find(c => c.id === clientId);

  // Fetch form responses for access info
  const { data: formResponse } = useQuery({
    queryKey: ['client-form-response', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_start_form_responses')
        .select('instagram_login, facebook_login')
        .eq('client_id', clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: formResponseBackup } = useQuery({
    queryKey: ['client-form-response-backup', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_start_form_response_backups')
        .select('snapshot')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.snapshot as Record<string, string | null> | null;
    },
    enabled: !!clientId,
  });

  const accessResponse = formResponse || formResponseBackup;

  // --- Mutations ---
  const updateField = (field: string, successMsg: string, onDone: () => void) =>
    useMutation({
      mutationFn: async ({ clientId, value }: { clientId: string; value: any }) => {
        const { error } = await supabase.from('operational_clients').update({ [field]: value } as any).eq('id', clientId);
        if (error) throw error;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success(successMsg); onDone(); },
      onError: () => { toast.error('Erro ao atualizar'); }
    });

  const updateRenewalDueDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: Date | null }) => {
      const { error } = await supabase.from('operational_clients').update({ renewal_due_date: date?.toISOString() || null }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success('Data de renovação atualizada'); setIsEditingRenewalDate(false); },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const updatePlanMutation = updateField('plan', 'Plano atualizado', () => setIsEditingPlan(false));
  const updateDealValueMutation = updateField('deal_value', 'Valor atualizado', () => setIsEditingDealValue(false));
  const updateStartDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: Date }) => {
      const { error } = await supabase.from('operational_clients').update({ created_at: date.toISOString() }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success('Data atualizada'); setIsEditingStartDate(false); },
    onError: () => { toast.error('Erro ao atualizar'); }
  });
  const updateTeamMutation = updateField('team_id', 'Equipe atualizada', () => setIsEditingTeam(false));
  const updatePagadorAnuncioMutation = updateField('pagador_anuncio', 'Atualizado', () => setIsEditingPagadorAnuncio(false));
  const updatePacoteMutation = updateField('pacote', 'Pacote atualizado', () => setIsEditingPacote(false));
  const updateClientNameMutation = updateField('client_name', 'Nome atualizado', () => setIsEditingClientName(false));

  const updateAdAccountMutation = useMutation({
    mutationFn: async ({ clientId, ad_account_name, has_recharge, recharge_value }: { clientId: string; ad_account_name: string | null; has_recharge: boolean; recharge_value: number | null }) => {
      const { error } = await supabase.from('operational_clients').update({ ad_account_name, has_recharge, recharge_value } as any).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success('Dados atualizados'); setIsEditingAdAccount(false); },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const updateStartMeetingDateMutation = useMutation({
    mutationFn: async ({ clientId, date }: { clientId: string; date: string | null }) => {
      const { error } = await supabase.from('operational_clients').update({ start_meeting_date: date } as any).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Data atualizada');
      setIsEditingStartMeeting(false);
      setShowNpsPopup(true);
    },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const updateOnboardingStageMutation = useMutation({
    mutationFn: async ({ clientId, value }: { clientId: string; value: string }) => {
      const { error } = await supabase.from('operational_clients').update({
        onboarding_stage: value,
        status_updated_at: new Date().toISOString(),
      } as any).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success('Status atualizado'); },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const updateNpsMutation = useMutation({
    mutationFn: async ({ clientId, field, value }: { clientId: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('operational_clients').update({ [field]: value } as any).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-clients'] }); toast.success('Atualizado'); },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !clientId || !user) return;
    setIsUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${clientId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('client-files').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('client-files').getPublicUrl(filePath);
        await supabase.from('client_files').insert({
          client_id: clientId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by_user_id: user.id,
        });

        const { data: existingCreative } = await supabase
          .from('ad_creatives')
          .select('id')
          .eq('client_id', clientId)
          .eq('image_url', urlData.publicUrl)
          .maybeSingle();

        if (!existingCreative) {
          const { error: creativeError } = await supabase.from('ad_creatives').insert({
            client_name: client.client_name,
            client_id: clientId,
            image_url: urlData.publicUrl,
            image_urls: [urlData.publicUrl],
            created_by_user_id: user.id,
            created_by_name: user.name,
            status: 'PARA_SUBIR',
          });

          if (creativeError) throw creativeError;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['client-files', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-ad-creatives', clientId] });
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      queryClient.invalidateQueries({ queryKey: ['pending-creatives-list'] });
      toast.success('Arquivo(s) enviado(s)');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => { const { data, error } = await supabase.from('teams').select('*'); if (error) throw error; return data || []; }
  });

  interface Attachment { id: string; name: string; url: string; type: string; size?: number; }

  const { data: clientAttachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ['client-attachments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('exec_cards').select('id, title, attachments, board_id').eq('client_id', clientId).not('attachments', 'is', null);
      if (error) return [];
      const all: (Attachment & { cardTitle: string })[] = [];
      for (const card of (data || [])) {
        const atts = (card.attachments as unknown as Attachment[]) || [];
        if (!Array.isArray(atts)) continue;
        for (const att of atts) { if (att?.url) all.push({ ...att, cardTitle: card.title }); }
      }
      return all;
    },
    enabled: !!clientId,
  });

  const { data: clientFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['client-files', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('client_files').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: clientCreatives = [] } = useQuery({
    queryKey: ['client-ad-creatives', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('ad_creatives').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
    refetchInterval: 15000,
  });

  const toggleCreativeStatusMutation = useMutation({
    mutationFn: async ({ creativeId, newStatus }: { creativeId: string; newStatus: string }) => {
      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === 'ATIVO' && user) {
        updateData.completed_by_user_id = user.id;
        updateData.completed_by_name = user.name;
        updateData.completed_at = new Date().toISOString();
      }
      if (newStatus === 'PENDENTE') {
        updateData.completed_by_user_id = null;
        updateData.completed_by_name = null;
        updateData.completed_at = null;
      }
      const { error } = await supabase.from('ad_creatives').update(updateData).eq('id', creativeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ad-creatives', clientId] });
      queryClient.invalidateQueries({ queryKey: ['pending-creatives-list'] });
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      toast.success('Status atualizado');
    },
    onError: () => { toast.error('Erro ao atualizar'); }
  });

  const deleteCreativeMutation = useMutation({
    mutationFn: async (creativeId: string) => {
      const creative = clientCreatives.find(c => c.id === creativeId);
      if (creative) {
        const urls = creative.image_urls ? (creative.image_urls as string[]) : [creative.image_url];
        for (const url of urls) {
          if (typeof url === 'string') {
            const parts = url.split('/ad-creatives/');
            if (parts[1]) await supabase.storage.from('ad-creatives').remove([decodeURIComponent(parts[1])]);
          }
        }
      }
      const { error } = await supabase.from('ad_creatives').delete().eq('id', creativeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ad-creatives', clientId] });
      queryClient.invalidateQueries({ queryKey: ['pending-creatives-list'] });
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      toast.success('Criativo removido');
    },
    onError: () => { toast.error('Erro ao remover criativo'); }
  });

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/client-files/');
      if (urlParts[1]) await supabase.storage.from('client-files').remove([decodeURIComponent(urlParts[1])]);
      await supabase.from('client_files').delete().eq('id', fileId);
      queryClient.invalidateQueries({ queryKey: ['client-files', clientId] });
      toast.success('Arquivo removido');
    } catch { toast.error('Erro ao remover'); }
  };

  const getSuggestedRenewalDate = () => {
    if (!client) return undefined;
    const baseDate = client.activated_at ? new Date(client.activated_at) : new Date(client.created_at);
    const planMonths: Record<string, number> = { MENSAL: 1, TRIMESTRAL: 3, SEMESTRAL: 6 };
    return addMonths(baseDate, planMonths[client.plan || 'MENSAL'] || 1);
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMarkAsLoss = async () => {
    if (!churnReason) { toast.error('Selecione o motivo'); return; }
    if (!responsibleTeamId) { toast.error('Selecione a equipe'); return; }
    const finalReason = churnReason === 'Outro motivo' ? customReason : churnReason;
    try {
      await markAsLoss.mutateAsync({ clientId: client.id, reason: finalReason, responsibleTeamId });
      toast.success('Perda registrada');
      setShowLossForm(false); setChurnReason(''); setCustomReason(''); setResponsibleTeamId('');
    } catch { toast.error('Erro'); }
  };

  const handleMarkAsRenewed = async () => {
    if (!responsibleTeamId) { toast.error('Selecione a equipe'); return; }
    const rv = renewalValueInput ? parseFloat(renewalValueInput.replace(/[^\d.,]/g, '').replace(',', '.')) : undefined;
    try {
      await markAsRenewed.mutateAsync({ clientId: client.id, responsibleTeamId, renewalValue: rv && !isNaN(rv) ? rv : undefined });
      toast.success('Renovação registrada');
      setShowRenewalForm(false); setResponsibleTeamId(''); setRenewalValueInput('');
    } catch { toast.error('Erro'); }
  };

  // Helper for editable inline field
  const EditableField = ({ label, value, isEditing, onStartEdit, editContent }: {
    label: string; value: React.ReactNode; isEditing: boolean; onStartEdit: () => void; editContent: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {canEditPlan && !isEditing && <Button variant="ghost" size="sm" onClick={onStartEdit} className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"><Edit2 className="h-3 w-3" /></Button>}
      </div>
      {isEditing ? editContent : <p className="font-medium text-foreground text-sm">{value}</p>}
    </div>
  );

  const SelectEdit = ({ value, onChange, options, onSave, onCancel, isPending }: any) => (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={onSave} disabled={isPending} className="h-7 w-7 p-0 text-success"><Check className="h-3 w-3" /></Button>
      <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0 text-destructive"><X className="h-3 w-3" /></Button>
    </div>
  );

  const cardClass = "bg-card rounded-xl border border-border p-5";

  return (
    <div className="min-h-screen bg-background -m-6 p-6">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operacional/crm')} className="gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao CRM
        </Button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Client Header */}
        <div className={cardClass}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-5 w-5 text-primary" />
                {isEditingClientName ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)} className="h-9 text-xl font-bold" autoFocus />
                    <Button variant="ghost" size="sm" onClick={() => { if (clientNameInput.trim() && clientNameInput.trim() !== client.client_name) updateClientNameMutation.mutate({ clientId: client.id, value: clientNameInput.trim() }); else setIsEditingClientName(false); }} disabled={updateClientNameMutation.isPending} className="h-7 w-7 p-0 text-success"><Check className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingClientName(false)} className="h-7 w-7 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-foreground">{client.client_name}</h1>
                    {canEditPlan && <Button variant="ghost" size="sm" onClick={() => { setClientNameInput(client.client_name); setIsEditingClientName(true); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></Button>}
                    {client.client_tier && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", client.client_tier === 'PREMIUM' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                        {client.client_tier === 'PREMIUM' ? <Crown className="h-3 w-3" /> : <Users2 className="h-3 w-3" />}
                        {client.client_tier}
                      </span>
                    )}
                  </>
                )}
              </div>
              {client.clinic_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 ml-7"><Building2 className="h-3.5 w-3.5" />{client.clinic_name}</p>
              )}
            </div>
            <Badge variant={client.status_operacional === 'ATIVO' ? 'default' : client.status_operacional === 'CHURNED' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
              {client.status_operacional}
            </Badge>
          </div>
        </div>

        {/* Main Grid: 2 columns, 3 rows each */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COL — Card 1: Informações */}
          <div className={cardClass}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Informações</p>
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Equipe" isEditing={isEditingTeam}
                value={teams.find(t => t.id === client.team_id)?.name || 'Não definido'}
                onStartEdit={() => { setSelectedTeamId(client.team_id || '__none__'); setIsEditingTeam(true); }}
                editContent={<SelectEdit value={selectedTeamId} onChange={setSelectedTeamId} options={[{ value: '__none__', label: 'Sem equipe' }, ...teams.map(t => ({ value: t.id, label: t.name }))]} onSave={() => updateTeamMutation.mutate({ clientId: client.id, value: selectedTeamId === '__none__' ? null : selectedTeamId })} onCancel={() => setIsEditingTeam(false)} isPending={updateTeamMutation.isPending} />}
              />
              <EditableField
                label="Pacote" isEditing={isEditingPacote}
                value={client.pacote ? PACOTE_LABELS[client.pacote] || client.pacote : 'Não definido'}
                onStartEdit={() => { setSelectedPacote(client.pacote || '__none__'); setIsEditingPacote(true); }}
                editContent={<SelectEdit value={selectedPacote} onChange={setSelectedPacote} options={[{ value: '__none__', label: 'Não definido' }, ...PACOTE_OPTIONS]} onSave={() => updatePacoteMutation.mutate({ clientId: client.id, value: selectedPacote === '__none__' ? null : selectedPacote })} onCancel={() => setIsEditingPacote(false)} isPending={updatePacoteMutation.isPending} />}
              />
              <EditableField
                label="Plano" isEditing={isEditingPlan}
                value={client.plan ? PLAN_LABELS[client.plan] || client.plan : 'Não definido'}
                onStartEdit={() => { setSelectedPlan(client.plan || ''); setIsEditingPlan(true); }}
                editContent={<SelectEdit value={selectedPlan} onChange={setSelectedPlan} options={PLAN_OPTIONS} onSave={() => { if (selectedPlan) updatePlanMutation.mutate({ clientId: client.id, value: selectedPlan }); }} onCancel={() => setIsEditingPlan(false)} isPending={updatePlanMutation.isPending} />}
              />
              <EditableField
                label="Quem investe" isEditing={isEditingPagadorAnuncio}
                value={client.pagador_anuncio === 'GREAT' ? 'Great' : client.pagador_anuncio === 'CLIENTE' ? 'Cliente' : 'Não definido'}
                onStartEdit={() => { setSelectedPagadorAnuncio(client.pagador_anuncio || '__none__'); setIsEditingPagadorAnuncio(true); }}
                editContent={<SelectEdit value={selectedPagadorAnuncio} onChange={setSelectedPagadorAnuncio} options={[{ value: '__none__', label: 'Não definido' }, { value: 'GREAT', label: 'Great' }, { value: 'CLIENTE', label: 'Cliente' }]} onSave={() => updatePagadorAnuncioMutation.mutate({ clientId: client.id, value: selectedPagadorAnuncio === '__none__' ? null : selectedPagadorAnuncio })} onCancel={() => setIsEditingPagadorAnuncio(false)} isPending={updatePagadorAnuncioMutation.isPending} />}
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Data de entrada</p>
                  {canEditPlan && !isEditingStartDate && <Button variant="ghost" size="sm" onClick={() => { setStartDate(new Date(client.created_at)); setIsEditingStartDate(true); }} className="h-5 w-5 p-0 text-muted-foreground"><Edit2 className="h-3 w-3" /></Button>}
                </div>
                {isEditingStartDate ? (
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-sm", !startDate && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-3 w-3" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={ptBR} /></PopoverContent>
                    </Popover>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { if (startDate) updateStartDateMutation.mutate({ clientId: client.id, date: startDate }); }} disabled={!startDate || updateStartDateMutation.isPending} className="h-6 px-2 text-success"><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setIsEditingStartDate(false); setStartDate(undefined); }} className="h-6 px-2 text-destructive"><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-foreground text-sm">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COL — Card 1: Envio de Acesso */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Envio de Acesso (Dra.)</h4>
              </div>
              {!isEditingAdAccount ? (
                <Button variant="ghost" size="sm" onClick={() => { setAdAccountName((client as any)?.ad_account_name || ''); setHasRecharge((client as any)?.has_recharge || false); setRechargeValue((client as any)?.recharge_value?.toString() || ''); setIsEditingAdAccount(true); }} className="h-7 text-xs gap-1"><Edit2 className="h-3 w-3" />Editar</Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => updateAdAccountMutation.mutate({ clientId: client.id, ad_account_name: adAccountName || null, has_recharge: hasRecharge, recharge_value: hasRecharge && rechargeValue ? parseFloat(rechargeValue) : null })} disabled={updateAdAccountMutation.isPending} className="h-7 w-7 p-0 text-success"><Check className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingAdAccount(false)} className="h-7 w-7 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {isEditingAdAccount ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome da Conta</label>
                  <Input value={adAccountName} onChange={(e) => setAdAccountName(e.target.value)} placeholder="Ex: Dra. Fulana - Meta Ads" className="h-8 text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Recarga</label>
                  <div className="flex gap-2">
                    <Button variant={hasRecharge ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setHasRecharge(true)}>Sim</Button>
                    <Button variant={!hasRecharge ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setHasRecharge(false)}>Não</Button>
                  </div>
                </div>
                {hasRecharge && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                    <Input type="number" value={rechargeValue} onChange={(e) => setRechargeValue(e.target.value)} placeholder="0,00" className="h-8 text-sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Conta:</span>
                  <span className="text-foreground text-sm font-medium">{(client as any)?.ad_account_name || <span className="text-muted-foreground italic">Não informado</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Recarga:</span>
                  <Badge variant={(client as any)?.has_recharge ? 'default' : 'secondary'} className="text-[10px]">{(client as any)?.has_recharge ? 'Sim' : 'Não'}</Badge>
                  {(client as any)?.has_recharge && (client as any)?.recharge_value > 0 && <span className="text-sm font-medium text-foreground">R$ {Number((client as any)?.recharge_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                </div>
                {accessResponse?.instagram_login && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">Instagram:</span>
                    <span className="text-foreground text-sm font-medium break-all">{accessResponse.instagram_login}</span>
                  </div>
                )}
                {accessResponse?.facebook_login && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground text-xs whitespace-nowrap">Facebook / Meta Ads:</span>
                    <span className="text-foreground text-sm font-medium break-all">{accessResponse.facebook_login}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LEFT COL — Card 2: Status */}
          <div className={cardClass}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</p>
            <div className="space-y-3">
              <Select
                value={client.onboarding_stage || 'ACESSO_AO_BRIEFING'}
                onValueChange={(val) => {
                  updateOnboardingStageMutation.mutate({ clientId: client.id, value: val });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50 max-h-[400px]">
                  {ONBOARDING_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", opt.color)} />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {client.status_updated_at && (
                <p className="text-[10px] text-muted-foreground">
                  Última atualização: {format(new Date(client.status_updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COL — Card 2: Data da Reunião de Start */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data da Reunião de Start</h4>
              </div>
              {!isEditingStartMeeting ? (
                <Button variant="ghost" size="sm" onClick={() => { const c = (client as any)?.start_meeting_date; setStartMeetingDate(c ? new Date(c + 'T00:00:00') : undefined); setIsEditingStartMeeting(true); }} className="h-7 text-xs gap-1"><Edit2 className="h-3 w-3" />Editar</Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { if (startMeetingDate) updateStartMeetingDateMutation.mutate({ clientId: client.id, date: format(startMeetingDate, 'yyyy-MM-dd') }); }} disabled={updateStartMeetingDateMutation.isPending} className="h-7 w-7 p-0 text-success"><Check className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingStartMeeting(false)} className="h-7 w-7 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {isEditingStartMeeting ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !startMeetingDate && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {startMeetingDate ? format(startMeetingDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={startMeetingDate} onSelect={setStartMeetingDate} locale={ptBR} initialFocus /></PopoverContent>
              </Popover>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Data:</span>
                  <span className="text-foreground text-sm font-medium">
                    {(client as any)?.start_meeting_date ? format(new Date((client as any).start_meeting_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : <span className="text-muted-foreground italic">Não definida</span>}
                  </span>
                </div>
                {(client as any)?.start_meeting_date && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground">Cliente respondeu o formulário?</p>
                    <div className="flex gap-2">
                      <Button
                        variant={(client as any)?.nps_answered === true ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => updateNpsMutation.mutate({ clientId: client.id, field: 'nps_answered', value: true })}
                      >Sim</Button>
                      <Button
                        variant={(client as any)?.nps_answered === false ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => updateNpsMutation.mutate({ clientId: client.id, field: 'nps_answered', value: false })}
                      >Não</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LEFT COL — Card 3: Data de Renovação */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Renovação</h4>
              </div>
              {!isEditingRenewalDate && (
                <Button variant="ghost" size="sm" onClick={() => {
                  const cd = (client as any).renewal_due_date ? new Date((client as any).renewal_due_date) : getSuggestedRenewalDate();
                  setRenewalDueDate(cd);
                  setIsEditingRenewalDate(true);
                }} className="h-7 text-xs gap-1"><Edit2 className="h-3 w-3" />Editar</Button>
              )}
            </div>
            {isEditingRenewalDate ? (
              <div className="space-y-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !renewalDueDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {renewalDueDate ? format(renewalDueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={renewalDueDate} onSelect={setRenewalDueDate} initialFocus locale={ptBR} /></PopoverContent>
                </Popover>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsEditingRenewalDate(false); setRenewalDueDate(undefined); }}>Cancelar</Button>
                  <Button size="sm" className="flex-1" onClick={() => { if (renewalDueDate) updateRenewalDueDateMutation.mutate({ clientId: client.id, date: renewalDueDate }); }} disabled={!renewalDueDate || updateRenewalDueDateMutation.isPending}>{updateRenewalDueDateMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </div>
            ) : (
              <div>
                {(client as any).renewal_due_date ? (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">{format(new Date((client as any).renewal_due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    {new Date((client as any).renewal_due_date) < new Date() && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencida</Badge>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Nenhuma data definida</p>
                    {getSuggestedRenewalDate() && <p className="text-xs text-muted-foreground">Sugestão baseada no plano: {format(getSuggestedRenewalDate()!, "dd/MM/yyyy")}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COL — Card 3: Arquivos do Cliente / Exec */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Arquivos {(clientFiles.length + clientAttachments.length) > 0 && `(${clientFiles.length + clientAttachments.length})`}
                </h4>
              </div>
              <div>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile}>
                  {isUploadingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Enviar Arquivo
                </Button>
              </div>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {clientFiles.length > 0 && (
                <div className="space-y-2">
                  {clientFiles.map((file) => {
                    const isImage = file.file_type?.startsWith('image/');
                    return (
                      <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group">
                        {isImage ? <img src={file.file_url} alt={file.file_name} className="h-10 w-10 rounded object-cover shrink-0" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0"><FileTextIcon className="h-5 w-5 text-muted-foreground" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{file.file_name}</p>
                          {file.file_size && <p className="text-[10px] text-muted-foreground">{(file.file_size / 1024).toFixed(0)} KB</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted"><Download className="h-4 w-4 text-muted-foreground" /></a>
                          <button onClick={() => handleDeleteFile(file.id, file.file_url)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4 text-destructive" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {clientAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Via Cards de Execução</p>
                  {clientAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group">
                      {att.type?.startsWith('image/') ? <img src={att.url} alt={att.name} className="h-10 w-10 rounded object-cover shrink-0" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0"><FileTextIcon className="h-5 w-5 text-muted-foreground" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">via {att.cardTitle}</p>
                      </div>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"><Download className="h-4 w-4 text-muted-foreground" /></a>
                    </div>
                  ))}
                </div>
              )}
              {clientFiles.length === 0 && clientAttachments.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhum arquivo anexado.</p>
              )}
            </div>
          </div>
        </div>

        {/* CRIATIVOS — Full width two-column layout */}
        <ClientCreativesSection
          clientCreatives={clientCreatives}
          clientId={clientId!}
          clientName={client.client_name}
          showCreativeDialog={showCreativeDialog}
          setShowCreativeDialog={setShowCreativeDialog}
          toggleCreativeStatusMutation={toggleCreativeStatusMutation}
          deleteCreativeMutation={deleteCreativeMutation}
        />

        {/* Start Meeting Form Button */}
        <div className={cardClass}>
          <Button variant="outline" className="w-full h-11 border-primary text-primary hover:bg-primary/10 text-sm font-medium" onClick={() => navigate(`/operacional/crm/cliente/${clientId}/formulario-start`)}>
            <Rocket className="h-4 w-4 mr-2" />Formulário — Reunião de Start
          </Button>
        </div>

        {/* Actions Card - Full Width */}
        {!showLossForm && !showRenewalForm && client.churn_status !== 'PERDIDO' && (
          <div className={cn(cardClass, "flex flex-col items-center gap-3")}>
            <div className="flex gap-3 w-full max-w-md">
              <Button variant="outline" className="flex-1 h-11 border-success text-success hover:bg-success/10 text-sm font-medium" onClick={() => setShowRenewalForm(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />Renovar
              </Button>
              <Button variant="outline" className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive/10 text-sm font-medium" onClick={() => setShowLossForm(true)}>
                <TrendingDown className="h-4 w-4 mr-2" />Perda
              </Button>
            </div>
            {canDeleteClient && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive text-sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />Excluir Cliente
              </Button>
            )}
          </div>
        )}

        {/* Loss Form */}
        {showLossForm && (
          <div className={cardClass}>
            <div className="space-y-4 bg-destructive/5 border border-destructive/20 rounded-lg p-5">
              <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /><h4 className="font-semibold">Registrar Perda</h4></div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Motivo *</label>
                  <Select value={churnReason} onValueChange={setChurnReason}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{CHURN_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                </div>
                {churnReason === 'Outro motivo' && <Textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Descreva..." rows={3} />}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Equipe Responsável *</label>
                  <Select value={responsibleTeamId} onValueChange={setResponsibleTeamId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowLossForm(false)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" onClick={handleMarkAsLoss} disabled={markAsLoss.isPending}>{markAsLoss.isPending ? 'Salvando...' : 'Confirmar'}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Renewal Form */}
        {showRenewalForm && (
          <div className={cardClass}>
            <div className="space-y-4 bg-success/5 border border-success/20 rounded-lg p-5">
              <div className="flex items-center gap-2 text-success"><RefreshCw className="h-5 w-5" /><h4 className="font-semibold">Registrar Renovação</h4></div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Equipe Responsável *</label>
                <Select value={responsibleTeamId} onValueChange={setResponsibleTeamId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Valor (R$)</label>
                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="2.500,00" value={renewalValueInput} onChange={(e) => setRenewalValueInput(e.target.value)} className="pl-9" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRenewalForm(false)}>Cancelar</Button>
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={handleMarkAsRenewed} disabled={markAsRenewed.isPending}>{markAsRenewed.isPending ? 'Salvando...' : 'Confirmar'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <DeleteOperationalClientDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} client={client} onSuccess={() => navigate('/operacional/crm')} />
      {client && <AddCreativeDialog open={showCreativeDialog} onOpenChange={setShowCreativeDialog} clientId={client.id} clientName={client.client_name} />}

      {/* NPS Popup */}
      <AlertDialog open={showNpsPopup} onOpenChange={setShowNpsPopup}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Formulário de NPS</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Você enviou o formulário de NPS para o cliente <strong>{client.client_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { updateNpsMutation.mutate({ clientId: client.id, field: 'nps_sent', value: false }); setShowNpsPopup(false); }}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { updateNpsMutation.mutate({ clientId: client.id, field: 'nps_sent', value: true }); setShowNpsPopup(false); }}>Sim, enviei</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Period filter types
type PeriodFilterType = 'all' | 'month' | 'week' | 'day' | 'custom';

function ClientCreativesSection({
  clientCreatives,
  clientId,
  clientName,
  showCreativeDialog,
  setShowCreativeDialog,
  toggleCreativeStatusMutation,
  deleteCreativeMutation,
}: {
  clientCreatives: any[];
  clientId: string;
  clientName: string;
  showCreativeDialog: boolean;
  setShowCreativeDialog: (v: boolean) => void;
  toggleCreativeStatusMutation: any;
  deleteCreativeMutation: any;
}) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('all');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [customStartOpen, setCustomStartOpen] = useState(false);
  const [customEndOpen, setCustomEndOpen] = useState(false);

  const filteredCreatives = useMemo(() => {
    if (periodFilter === 'all') return clientCreatives;
    const now = new Date();
    return clientCreatives.filter((c) => {
      const d = new Date(c.created_at);
      switch (periodFilter) {
        case 'month': {
          const s = startOfMonth(now), e = endOfMonth(now);
          return isWithinInterval(d, { start: s, end: e });
        }
        case 'week': {
          const s = startOfWeek(now, { weekStartsOn: 1 }), e = endOfWeek(now, { weekStartsOn: 1 });
          return isWithinInterval(d, { start: s, end: e });
        }
        case 'day':
          return isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) });
        case 'custom':
          if (!customStart || !customEnd) return true;
          return isWithinInterval(d, { start: startOfDay(customStart), end: endOfDay(customEnd) });
        default:
          return true;
      }
    });
  }, [clientCreatives, periodFilter, customStart, customEnd]);

  const paraSubir = filteredCreatives.filter((c) => c.status === 'PARA_SUBIR');
  const ativos = filteredCreatives.filter((c) => c.status === 'ATIVO');

  const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url);

  const cardClass = "bg-card rounded-xl border border-border p-5";

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Criativos
          </h4>
          <Badge variant="secondary" className="text-[10px]">
            {filteredCreatives.length} total
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter buttons */}
          {(['all', 'month', 'week', 'day', 'custom'] as PeriodFilterType[]).map((p) => {
            const labels: Record<PeriodFilterType, string> = { all: 'Todos', month: 'Mês', week: 'Semana', day: 'Hoje', custom: 'Personalizado' };
            return (
              <Button
                key={p}
                variant={periodFilter === p ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodFilter(p)}
              >
                {labels[p]}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setShowCreativeDialog(true)} className="h-7 text-xs gap-1">
            <Upload className="h-3 w-3" />Adicionar Criativo
          </Button>
        </div>
      </div>

      {/* Custom date range */}
      {periodFilter === 'custom' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Popover open={customStartOpen} onOpenChange={setCustomStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", !customStart && "text-muted-foreground")}>
                <Calendar className="h-3 w-3" />
                {customStart ? format(customStart, 'dd/MM/yyyy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={customStart} onSelect={(d) => { setCustomStart(d); setCustomStartOpen(false); }} locale={ptBR} initialFocus />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">até</span>
          <Popover open={customEndOpen} onOpenChange={setCustomEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", !customEnd && "text-muted-foreground")}>
                <Calendar className="h-3 w-3" />
                {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={customEnd} onSelect={(d) => { setCustomEnd(d); setCustomEndOpen(false); }} locale={ptBR} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Para Subir */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-orange-500/10 border-b border-border flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold text-xs text-orange-600">Anúncios para Subir</span>
            <span className="ml-auto bg-orange-500/20 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{paraSubir.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto p-2 space-y-2">
            {paraSubir.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum anúncio para subir</p>
            ) : paraSubir.map((creative) => {
              const imageUrls = creative.image_urls ? (creative.image_urls as any[]) : [creative.image_url];
              return (
                <div key={creative.id} className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden group">
                  <div className="relative">
                    {imageUrls.length > 0 && typeof imageUrls[0] === 'string' ? (
                      <div className={cn("grid gap-0.5", imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                        {imageUrls.map((url: string, idx: number) => isVideo(url) ? (
                          <video key={idx} className={cn("w-full object-cover", imageUrls.length === 1 ? "h-32" : "h-20")} muted playsInline preload="metadata"><source src={url} /></video>
                        ) : (
                          <img key={idx} src={url} alt="" className={cn("w-full object-cover", imageUrls.length === 1 ? "h-32" : "h-20")} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-20 flex items-center justify-center bg-muted/50"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
                    )}
                    {imageUrls.length > 1 && <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">{imageUrls.length} arquivos</span>}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">{creative.client_name}</p>
                    <p className="text-[10px] text-muted-foreground">Arte: {creative.created_by_name}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(creative.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    <div className="flex items-center gap-1 pt-1">
                      <Button variant="default" size="sm" className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none" onClick={() => toggleCreativeStatusMutation.mutate({ creativeId: creative.id, newStatus: 'ATIVO' })}>
                        <CheckCircle className="h-3 w-3 mr-1" />Subir
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteCreativeMutation.mutate(creative.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ativos */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-emerald-500/10 border-b border-border flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-xs text-emerald-600">Anúncios Ativos</span>
            <span className="ml-auto bg-emerald-500/20 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{ativos.length}</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto p-2 space-y-2">
            {ativos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum anúncio ativo</p>
            ) : ativos.map((creative) => {
              const imageUrls = creative.image_urls ? (creative.image_urls as any[]) : [creative.image_url];
              return (
                <div key={creative.id} className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden group">
                  <div className="relative">
                    {imageUrls.length > 0 && typeof imageUrls[0] === 'string' ? (
                      <div className={cn("grid gap-0.5", imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                        {imageUrls.map((url: string, idx: number) => isVideo(url) ? (
                          <video key={idx} className={cn("w-full object-cover", imageUrls.length === 1 ? "h-32" : "h-20")} muted playsInline preload="metadata"><source src={url} /></video>
                        ) : (
                          <img key={idx} src={url} alt="" className={cn("w-full object-cover", imageUrls.length === 1 ? "h-32" : "h-20")} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-20 flex items-center justify-center bg-muted/50"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
                    )}
                    {imageUrls.length > 1 && <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">{imageUrls.length} arquivos</span>}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">{creative.client_name}</p>
                    <p className="text-[10px] text-muted-foreground">Arte: {creative.created_by_name}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(creative.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    {creative.completed_at && (
                      <div className="pt-1 border-t border-border mt-1 space-y-0.5">
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Ativado por: <strong>{creative.completed_by_name}</strong></p>
                        <p className="text-[10px] text-emerald-600">{format(new Date(creative.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteCreativeMutation.mutate(creative.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
