import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Sun,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Video,
  Trash2,
  Target,
  Pencil,
  Loader2,
  RefreshCw,
  AlarmClock,
  Users,
  Eye,
  BarChart3,
  CheckCheck,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { DeadlineAlarmAlert } from '@/components/notifications/DeadlineAlarmAlert';
interface MyDayItem {
  id: string;
  title: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  source: 'WORKITEM' | 'WORK_ITEM' | 'MEETING' | 'MANUAL' | 'PERMANENT';
  source_id?: string;
  deadline_time?: string | null;
  deadline_date?: string | null;
  completed_at?: string | null;
  date?: string;
}

type TaskSource = 'MANUAL' | 'PERMANENT';

interface PermanentActivity {
  id: string;
  title: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  deadline?: string;
  onlyMonday?: boolean;
  days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

const priorityColors: Record<string, string> = {
  'BAIXA': 'bg-surface-2 text-muted-foreground border-border',
  'MEDIA': 'bg-info/10 text-info border-info/20',
  'ALTA': 'bg-warning/10 text-warning border-warning/20',
  'URGENTE': 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusIcons = {
  'PENDENTE': Circle,
  'EM_ANDAMENTO': Clock,
  'CONCLUIDO': CheckCircle2,
};

// Permanent daily activities for traffic managers (GESTOR)
const GESTOR_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ativar-grupos', title: 'Ativar grupos – Ver e responder mensagens', priority: 'ALTA', deadline: '12:00' },
  { id: 'perm-conferir-grupo-clientes', title: 'Conferir grupo de clientes – Ver status geral / Identificar problemas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-otimizar-campanhas', title: 'Otimizar campanhas – Ajustar anúncios / Pausar o que não performa', priority: 'ALTA', deadline: '15:00' },
  { id: 'perm-atualizar-sistema', title: 'Atualizar sistema/planilha – Atualizar status / Registrar ações', priority: 'ALTA', deadline: '17:00' },
];

// Permanent daily activities for Cleriston (Gestor de Onboarding)
const CLERISTON_USER_ID = '44c3f442-d2bd-4419-ae9c-cc92241c1ac3';
const GESTOR_ONBOARDING_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-novos-clientes', title: 'Ver novos clientes', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-agendar-reunioes', title: 'Agendar reuniões', priority: 'ALTA', deadline: '10:00' },
  { id: 'perm-atualizar-sistema-onb', title: 'Atualizar sistema – Marcar status e progresso', priority: 'ALTA', deadline: '17:00' },
];

// Permanent daily activities for Matheus (Equipe Design)
const MATHEUS_USER_ID = '6c17a6a3-bc92-4c0f-9781-efd559a20833';
const DESIGN_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-demandas', title: 'Ver demandas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-produzir-criativos', title: 'Produzir criativos', priority: 'ALTA', deadline: '18:00' },
  { id: 'perm-ajustar-criativos', title: 'Ajustar criativos', priority: 'ALTA', deadline: '18:00' },
];

// Permanent daily activities for Amanda (Editora de Vídeo)
const AMANDA_USER_ID = '1ed2aadb-992d-4198-bb5d-39fa9cabd41d';
const AMANDA_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  { id: 'perm-ver-demandas', title: 'Ver demandas', priority: 'ALTA', deadline: '09:00' },
  { id: 'perm-criar-roteiros', title: 'Criar roteiros', priority: 'ALTA', deadline: '18:00', onlyMonday: true },
  { id: 'perm-editar-videos', title: 'Editar vídeos', priority: 'ALTA', deadline: '18:00' },
];

// Permanent weekly activities for Gerson (Atendente)
const GERSON_USER_ID = '615ce33b-79f6-4aed-8be1-588bc7a6d878';
const GERSON_PERMANENT_ACTIVITIES: PermanentActivity[] = [
  // Segunda (1)
  { id: 'perm-gerson-seg-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [1] },
  { id: 'perm-gerson-seg-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [1] },
  { id: 'perm-gerson-seg-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [1] },
  { id: 'perm-gerson-seg-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [1] },
  // Terça (2)
  { id: 'perm-gerson-ter-responder', title: 'RESPONDER TODOS ATÉ AS 11H', priority: 'ALTA', deadline: '11:00', days: [2] },
  { id: 'perm-gerson-ter-leads', title: 'SOLICITAR LEADS', priority: 'ALTA', deadline: '12:00', days: [2] },
  { id: 'perm-gerson-ter-relatorio', title: 'ENVIAR RELATORIO', priority: 'ALTA', deadline: '14:00', days: [2] },
  { id: 'perm-gerson-ter-recontato', title: 'RECONTATO COM CLIENTES SEM LEADS', priority: 'ALTA', deadline: '15:00', days: [2] },
  { id: 'perm-gerson-ter-planilha', title: 'PLANILHA', priority: 'ALTA', deadline: '16:00', days: [2] },
  { id: 'perm-gerson-ter-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [2] },
  // Quarta (3)
  { id: 'perm-gerson-qua-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [3] },
  { id: 'perm-gerson-qua-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [3] },
  { id: 'perm-gerson-qua-ligacao', title: 'LIGAÇÃO', priority: 'ALTA', deadline: '15:00', days: [3] },
  { id: 'perm-gerson-qua-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [3] },
  { id: 'perm-gerson-qua-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [3] },
  // Quinta (4)
  { id: 'perm-gerson-qui-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [4] },
  { id: 'perm-gerson-qui-organizar', title: 'ORGANIZAR TODAS AS PLANILHAS E AGENDA DURANTE O DIA', priority: 'ALTA', deadline: '17:00', days: [4] },
  { id: 'perm-gerson-qui-feedback', title: 'MANDAR FEEDBACK DE CADA CLIENTE', priority: 'ALTA', deadline: '14:00', days: [4] },
  { id: 'perm-gerson-qui-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [4] },
  { id: 'perm-gerson-qui-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [4] },
  // Sexta (5)
  { id: 'perm-gerson-sex-responder', title: 'RESPONDER TODOS ATÉ ÁS 11:00', priority: 'ALTA', deadline: '11:00', days: [5] },
  { id: 'perm-gerson-sex-recontato', title: 'RECONTATO ATÉ AS 15H', priority: 'ALTA', deadline: '15:00', days: [5] },
  { id: 'perm-gerson-sex-consultor', title: 'VERIFICAR TUDO DO CONSULTOR COMERCIAL', priority: 'ALTA', deadline: '15:00', days: [5] },
  { id: 'perm-gerson-sex-planilha', title: 'PLANILHA ÀS 16H', priority: 'ALTA', deadline: '16:00', days: [5] },
  { id: 'perm-gerson-sex-grupos', title: 'CONFERIR GRUPOS', priority: 'ALTA', deadline: '17:00', days: [5] },
];

// Map of user-specific routines (overrides role-based defaults)
const USER_SPECIFIC_ACTIVITIES: Record<string, PermanentActivity[]> = {
  [CLERISTON_USER_ID]: GESTOR_ONBOARDING_PERMANENT_ACTIVITIES,
  [MATHEUS_USER_ID]: DESIGN_PERMANENT_ACTIVITIES,
  [AMANDA_USER_ID]: AMANDA_PERMANENT_ACTIVITIES,
  [GERSON_USER_ID]: GERSON_PERMANENT_ACTIVITIES,
};

export default function MeuDia() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<MyDayItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [newItemSource, setNewItemSource] = useState<TaskSource>('MANUAL');
  const [newItemDeadline, setNewItemDeadline] = useState<string>('');
  const [newItemDeadlineDate, setNewItemDeadlineDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<{ operational_role: string | null; team_id?: string | null } | null | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // User filter state (for admins/coordinators)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Edit dialog state
  const [editingItem, setEditingItem] = useState<MyDayItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA');
  const [editStatus, setEditStatus] = useState<'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('PENDENTE');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editDeadlineDate, setEditDeadlineDate] = useState<string>('');
  
  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<MyDayItem | null>(null);

  // Admin view toggle
  const [adminView, setAdminView] = useState<'dia' | 'panorama'>('dia');

  // Admin panorama state
  interface TeamPanorama {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    activeClients: number;
    members: string[];
  }
  const [panorama, setPanorama] = useState<TeamPanorama[]>([]);
  const [panoramaLoading, setPanoramaLoading] = useState(false);

  const {
    activeAlarms,
    isAlarmPlaying,
    stopAlarm,
    setCustomAlarmSound,
    clearCustomAlarmSound,
  } = useDeadlineNotifications();

  // Check if user is a traffic manager (GESTOR) or Coordinator
  const isGestor = userProfile?.operational_role === 'GESTOR';
  const isCoordinator = userProfile?.operational_role === 'COORDENADOR_RED';
  const canViewOtherUsers = isAdmin || isCoordinator;
  
  // The user whose "Meu Dia" we're viewing
  const viewingUserId = selectedUserId || user?.id;
  const isViewingOwnDay = !selectedUserId || selectedUserId === user?.id;

  // Fetch user profile to check role
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('operational_role, team_id')
        .eq('id', user.id)
        .single();
      setUserProfile(data);
    };
    fetchProfile();
  }, [user]);
  
  // Fetch all users for filter (only for admins/coordinators)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!canViewOtherUsers) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (data) setAllUsers(data);
    };
    fetchUsers();
  }, [canViewOtherUsers]);

  // Fetch panorama data (admin sees all teams, regular user sees only own team)
  useEffect(() => {
    if (userProfile === undefined) return;
    const fetchPanorama = async () => {
      setPanoramaLoading(true);
      try {
        const DEFAULT_TEAMS = [
          { id: 'equipe-7', name: 'Equipe 7' },
          { id: 'tropa-de-elite', name: 'Tropa de Elite' },
        ];

        const { data: dbTeams } = await supabase.from('teams').select('id, name');
        let teams = (dbTeams && dbTeams.length > 0 ? dbTeams : DEFAULT_TEAMS) as { id: string; name: string }[];

        // Non-admins only see their own team
        if (!isAdmin && userProfile?.team_id) {
          teams = teams.filter((t) => t.id === userProfile.team_id);
        }

        if (teams.length === 0) {
          setPanorama([]);
          return;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const { data: allItems } = await supabase
          .from('my_day_items')
          .select('user_id, status')
          .eq('date', today);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, team_id');

        const { data: clients } = await supabase
          .from('operational_clients')
          .select('team_id, status_operacional');

        const result: TeamPanorama[] = teams.map((team) => {
          const teamProfiles = (profiles || []).filter((p: any) => p.team_id === team.id);
          const memberIds = new Set(teamProfiles.map((p: any) => p.id));
          const teamItems = (allItems || []).filter((i: any) => memberIds.has(i.user_id));
          const activeClients = (clients || []).filter(
            (c: any) => c.team_id === team.id && c.status_operacional === 'ATIVO'
          ).length;

          return {
            id: team.id,
            name: team.name,
            totalTasks: teamItems.length,
            completedTasks: teamItems.filter((i: any) => i.status === 'CONCLUIDO').length,
            activeClients,
            members: teamProfiles.map((p: any) => p.full_name),
          };
        });

        setPanorama(result);
      } finally {
        setPanoramaLoading(false);
      }
    };
    fetchPanorama();
  }, [isAdmin, userProfile]);

  // Guard to prevent concurrent ensurePermanentActivities calls (use ref for reliable closure)
  const permanentEnsuredRef = useRef<Set<string>>(new Set());

  // Ensure permanent activities exist for today (GESTOR defaults only)
  const ensurePermanentActivities = async (targetUserId: string) => {
    if (!targetUserId) return;
    
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cacheKey = `${targetUserId}_${today}`;
    
    // Skip if already ensured for this user+date combo
    if (permanentEnsuredRef.current.has(cacheKey)) return;
    
    // Check if the TARGET user is a GESTOR
    let targetIsGestor = false;
    if (targetUserId === user?.id) {
      targetIsGestor = isGestor;
    } else {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('operational_role')
        .eq('id', targetUserId)
        .single();
      targetIsGestor = targetProfile?.operational_role === 'GESTOR';
    }
    
    // Determine which activities to use:
    // 1. User-specific override (Cleriston, Matheus, etc.)
    // 2. Role-based default (GESTOR)
    // 3. None
    let activitiesToUse: typeof GESTOR_PERMANENT_ACTIVITIES | null = null;
    
    if (USER_SPECIFIC_ACTIVITIES[targetUserId]) {
      activitiesToUse = USER_SPECIFIC_ACTIVITIES[targetUserId];
    } else if (targetIsGestor) {
      activitiesToUse = GESTOR_PERMANENT_ACTIVITIES;
    }
    
    if (activitiesToUse) {
      // Check which PERMANENT tasks already exist for today
      const { data: existingToday } = await supabase
        .from('my_day_items')
        .select('title')
        .eq('user_id', targetUserId)
        .eq('date', today)
        .eq('source', 'PERMANENT');
      
      const existingTitles = new Set((existingToday || []).map(t => t.title));
      
      const dayOfWeek = new Date(today + 'T12:00:00').getDay(); // 0=Sun, 1=Mon
      
      for (const activity of activitiesToUse) {
        // Skip Monday-only tasks on other days (legacy support)
        if (activity.onlyMonday && dayOfWeek !== 1) continue;
        // Skip day-specific tasks on wrong days
        if (activity.days && !activity.days.includes(dayOfWeek)) continue;
        
        if (!existingTitles.has(activity.title)) {
          await supabase
            .from('my_day_items')
            .upsert({
              title: activity.title,
              user_id: targetUserId,
              date: today,
              status: 'PENDENTE',
              priority: activity.priority,
              source: 'PERMANENT',
              deadline_time: activity.deadline,
              deadline_notified: false,
            }, { onConflict: 'user_id,title,date', ignoreDuplicates: true });
        }
      }
    }
    
    permanentEnsuredRef.current.add(cacheKey);
  };

  // Fetch items from database
  const fetchItems = async () => {
    if (!user) return;
    
    const targetUserId = viewingUserId || user.id;
    
    try {
      // Ensure permanent activities for the user being viewed
      const targetId = viewingUserId || user.id;
      await ensurePermanentActivities(targetId);
      
      // Use local date to avoid timezone issues
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Carry over: move uncompleted non-permanent tasks from previous days to today
      const { data: pendingOld } = await supabase
        .from('my_day_items')
        .select('id')
        .eq('user_id', targetUserId)
        .lt('date', today)
        .neq('status', 'CONCLUIDO')
        .neq('source', 'PERMANENT');

      if (pendingOld && pendingOld.length > 0) {
        const ids = pendingOld.map(i => i.id);
        await supabase
          .from('my_day_items')
          .update({ date: today })
          .in('id', ids);
        console.log(`Carried over ${ids.length} pending tasks to today`);
      }

      // Clean up old PERMANENT tasks that were never completed
      // (they regenerate daily, so old copies are just bloat)
      await supabase
        .from('my_day_items')
        .delete()
        .eq('user_id', targetUserId)
        .lt('date', today)
        .eq('source', 'PERMANENT')
        .neq('status', 'CONCLUIDO');
      
      console.log('Fetching my_day_items for user:', targetUserId, 'date:', today);
      
      // Fetch today's tasks
      const { data, error } = await supabase
        .from('my_day_items')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const todayItems = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        status: item.status as MyDayItem['status'],
        priority: item.priority as MyDayItem['priority'],
        source: item.source as MyDayItem['source'],
        source_id: item.source_id || undefined,
        deadline_time: item.deadline_time || null,
        deadline_date: (item as any).deadline_date || null,
        completed_at: (item as any).completed_at || null,
        date: item.date,
      }));

      setItems(todayItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset permanent ensured flag when switching users (not needed with Set, but clear for new user)
  useEffect(() => {
    // No-op: ref-based Set handles multiple users naturally
  }, [viewingUserId]);

  useEffect(() => {
    if (userProfile !== undefined) {
      setIsLoading(true);
      fetchItems();
    }
  }, [user, userProfile, isGestor, viewingUserId]);

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const insertData: any = {
        title: newItemTitle.trim(),
        user_id: viewingUserId || user.id,
        date: today,
        status: 'PENDENTE',
        priority: newItemPriority,
        source: newItemSource,
      };

      // Add deadline if specified
      if (newItemDeadline) {
        insertData.deadline_time = newItemDeadline;
        insertData.deadline_notified = false;
      }
      if (newItemDeadlineDate) {
        insertData.deadline_date = newItemDeadlineDate;
      }

      const { data, error } = await supabase
        .from('my_day_items')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setItems([...items, {
        id: data.id,
        title: data.title,
        status: data.status as MyDayItem['status'],
        priority: data.priority as MyDayItem['priority'],
        source: data.source as MyDayItem['source'],
        deadline_time: data.deadline_time || null,
      }]);
      setNewItemTitle('');
      setNewItemPriority('MEDIA');
      setNewItemSource('MANUAL');
      setNewItemDeadline('');
      setNewItemDeadlineDate('');
      setIsAddDialogOpen(false);
      toast.success(newItemSource === 'PERMANENT' ? 'Tarefa fixa adicionada!' : 'Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!newItemTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('my_day_items')
        .insert({
          title: newItemTitle.trim(),
          user_id: viewingUserId || user.id,
          date: today,
          status: 'PENDENTE',
          priority: 'MEDIA',
          source: 'MANUAL',
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, {
        id: data.id,
        title: data.title,
        status: data.status as MyDayItem['status'],
        priority: data.priority as MyDayItem['priority'],
        source: data.source as MyDayItem['source'],
      }]);
      setNewItemTitle('');
      toast.success('Item adicionado ao seu dia!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const nextStatus = item.status === 'PENDENTE' ? 'CONCLUIDO' : 'PENDENTE';

    const completedAt = nextStatus === 'CONCLUIDO' ? new Date().toISOString() : null;

    // Optimistic update
    setItems(items.map(i => 
      i.id === id ? { ...i, status: nextStatus, completed_at: completedAt } : i
    ));

    try {
      const { error } = await supabase
        .from('my_day_items')
        .update({ status: nextStatus, completed_at: completedAt } as any)
        .eq('id', id);

      if (error) throw error;

      if (nextStatus === 'CONCLUIDO') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#E10600', '#ff4d4d', '#ffffff', '#ff9999'],
        });
      }

      // Log completion to activity_logs
      if (nextStatus === 'CONCLUIDO' && user) {
        const targetUserName = isViewingOwnDay 
          ? user.email 
          : allUsers.find(u => u.id === viewingUserId)?.full_name || 'Usuário';
        
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          user_name: user.name || user.email || 'Usuário',
          user_email: user.email || '',
          action: 'UPDATE',
          entity: 'my_day_item',
          entity_id: id,
          details: `Tarefa concluída: "${item.title}"${!isViewingOwnDay ? ` (dia de ${targetUserName})` : ''}`,
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
      // Revert on error
      setItems(items.map(i => 
        i.id === id ? { ...i, status: item.status } : i
      ));
    }
  };

  const handleRemoveItem = async (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    
    // If it's a permanent task, show confirmation dialog
    if (itemToRemove?.source === 'PERMANENT') {
      setItemToDelete(itemToRemove);
      return;
    }
    
    await executeRemoveItem(id);
  };

  const executeRemoveItem = async (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    
    // Optimistic update
    setItems(items.filter(item => item.id !== id));
    setItemToDelete(null);

    try {
      const { error } = await supabase
        .from('my_day_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item removido!');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Erro ao remover item');
      // Revert on error
      if (itemToRemove) {
        setItems(prev => [...prev, itemToRemove]);
      }
    }
  };

  const handleEditItem = (item: MyDayItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPriority(item.priority);
    setEditStatus(item.status);
    setEditDeadline(item.deadline_time || '');
    setEditDeadlineDate(item.deadline_date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const updateData: any = {
        title: editTitle.trim(),
        priority: editPriority,
        status: editStatus,
      };

      // Handle deadline update
      if (editDeadline) {
        updateData.deadline_time = editDeadline;
        if (editDeadline !== editingItem.deadline_time) {
          updateData.deadline_notified = false;
        }
      } else {
        updateData.deadline_time = null;
      }
      updateData.deadline_date = editDeadlineDate || null;

      const { error } = await supabase
        .from('my_day_items')
        .update(updateData)
        .eq('id', editingItem.id);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...item, title: editTitle.trim(), priority: editPriority, status: editStatus, deadline_time: editDeadline || null, deadline_date: editDeadlineDate || null }
          : item
      ));
      setEditDeadlineDate('');
      setEditingItem(null);
      setEditDeadline('');
      toast.success('Item atualizado!');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingItems = items
    .filter(i => i.status !== 'CONCLUIDO')
    .sort((a, b) => {
      // PERMANENT tasks pinned to top
      const aIsPerm = a.source === 'PERMANENT' ? 0 : 1;
      const bIsPerm = b.source === 'PERMANENT' ? 0 : 1;
      return aIsPerm - bIsPerm;
    });
  const completedItems = items.filter(i => i.status === 'CONCLUIDO');

  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin panorama panel
  const PanoramaPanel = () => {
    const [period, setPeriod] = useState<'semanal' | 'mensal' | 'anual'>('mensal');

    const periodLabel = {
      semanal: 'esta semana',
      mensal: 'este mês',
      anual: 'este ano',
    }[period];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h1 text-foreground">{isAdmin ? 'Panorama das Equipes' : 'Panorama da Minha Equipe'}</h1>
              <p className="text-sm text-muted-foreground capitalize">Resultado {periodLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
              {(['semanal', 'mensal', 'anual'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Back to Meu Dia */}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAdminView('dia')}>
              <Sun className="h-4 w-4" />
              Meu Dia
            </Button>
          </div>
        </div>

        {/* Cards */}
        {panoramaLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {panorama.map((team) => {
              const rate = team.totalTasks > 0
                ? Math.round((team.completedTasks / team.totalTasks) * 100)
                : 0;
              return (
                <div key={team.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">{team.name}</h3>
                    <span className="text-2xl font-extrabold text-primary">{rate}%</span>
                  </div>

                  <Progress value={rate} className="h-2" />

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-foreground">{team.completedTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-foreground">{team.totalTasks - team.completedTasks}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pendentes</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <p className="text-xl font-bold text-success">{team.activeClients}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Clientes Ativos</p>
                    </div>
                  </div>

                  {team.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {team.members.map((m) => (
                        <span key={m} className="flex items-center gap-1 text-xs bg-surface-3 text-muted-foreground rounded-full px-2.5 py-1">
                          <UserCircle className="h-3 w-3" />
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {team.members.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum membro cadastrado ainda</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Panorama early return (all users)
  if (adminView === 'panorama') {
    return (
      <div className="space-y-6 animate-in">
        <PanoramaPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Deadline Alarm Alert */}
      <DeadlineAlarmAlert
        alarms={activeAlarms}
        isPlaying={isAlarmPlaying}
        onStopAlarm={stopAlarm}
        onSetCustomSound={setCustomAlarmSound}
        onClearCustomSound={clearCustomAlarmSound}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h1 text-foreground">
                {isViewingOwnDay ? 'Meu Dia' : `Dia de ${allUsers.find(u => u.id === selectedUserId)?.full_name || 'Usuário'}`}
              </h1>
              <p className="text-body text-muted-foreground capitalize">{today}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Panorama toggle */}
          <div className="flex gap-1 bg-surface-2 rounded-lg p-1">
            <Button
              size="sm"
              variant={adminView === 'dia' ? 'default' : 'ghost'}
              className="gap-1.5 h-8"
              onClick={() => setAdminView('dia')}
            >
              <Sun className="h-3.5 w-3.5" />
              Meu Dia
            </Button>
            <Button
              size="sm"
              variant={adminView === 'panorama' ? 'default' : 'ghost'}
              className="gap-1.5 h-8"
              onClick={() => setAdminView('panorama')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Panorama
            </Button>
          </div>

          {/* User Filter for Admins/Coordinators */}
          {canViewOtherUsers && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={selectedUserId || 'own'} 
                onValueChange={(v) => setSelectedUserId(v === 'own' ? null : v)}
              >
                <SelectTrigger className="w-[200px] bg-surface-2">
                  <SelectValue placeholder="Ver dia de..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Meu Dia
                    </span>
                  </SelectItem>
                  {allUsers.filter(u => u.id !== user?.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{completedItems.length}/{items.length} concluídas</span>
          </div>
        </div>
      </div>

      {/* Quick Add - Show when viewing own day OR when admin/coordinator viewing another user */}
      {(isViewingOwnDay || canViewOtherUsers) && (
        <div className="rounded-lg border border-border bg-card shadow-card p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Adicionar item rápido..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              className="flex-1 bg-surface-2 border-border text-foreground placeholder:text-muted-foreground"
              disabled={isSaving}
            />
            <Button onClick={handleQuickAdd} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} disabled={isSaving}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tarefa Fixa
            </Button>
          </div>
        </div>
      )}
      
      {/* View-only banner when viewing another user */}
      {!isViewingOwnDay && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-info" />
          <p className="text-body text-info">
            Visualizando o dia de <strong>{allUsers.find(u => u.id === selectedUserId)?.full_name}</strong>
            {canViewOtherUsers ? ' — você pode adicionar e alterar tarefas' : ' (somente leitura)'}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid">
        <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-kpi-sm text-foreground">{pendingItems.length}</p>
            <p className="text-caption text-muted-foreground">Pendentes</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-kpi-sm text-foreground">{completedItems.length}</p>
            <p className="text-caption text-muted-foreground">Concluídas</p>
          </div>
        </div>
      </div>

      {/* Items List - Single Column */}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="p-card space-y-2">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-caption">Nenhuma tarefa para hoje</p>
          ) : (
            [...pendingItems, ...completedItems].map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onToggle={handleToggleStatus} 
                onRemove={handleRemoveItem}
                onEdit={handleEditItem}
                readOnly={!isViewingOwnDay && !canViewOtherUsers}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa. Tarefas fixas aparecem automaticamente todos os dias.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Título</Label>
              <Input
                id="new-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Título da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-priority">Prioridade</Label>
              <Select value={newItemPriority} onValueChange={(v) => setNewItemPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-source">Tipo</Label>
              <Select value={newItemSource} onValueChange={(v) => setNewItemSource(v as TaskSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Normal (apenas hoje)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PERMANENT">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Fixa (repete diariamente)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {newItemSource === 'PERMANENT' && (
                <p className="text-xs text-muted-foreground">
                  Esta tarefa aparecerá automaticamente todos os dias.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-deadline" className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4" />
                Prazo (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="new-deadline-date" className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    id="new-deadline-date"
                    type="date"
                    value={newItemDeadlineDate}
                    onChange={(e) => setNewItemDeadlineDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="new-deadline" className="text-xs text-muted-foreground">Horário</Label>
                  <Input
                    id="new-deadline"
                    type="time"
                    value={newItemDeadline}
                    onChange={(e) => setNewItemDeadline(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você será notificado 1 hora antes do prazo com um alarme sonoro.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>
              Faça alterações na atividade selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título da atividade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Prioridade</Label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline" className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4" />
                Prazo
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="edit-deadline-date" className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    id="edit-deadline-date"
                    type="date"
                    value={editDeadlineDate}
                    onChange={(e) => setEditDeadlineDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deadline" className="text-xs text-muted-foreground">Horário</Label>
                  <Input
                    id="edit-deadline"
                    type="time"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Notificação 1 hora antes do prazo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permanent Task Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa diária?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma tarefa diária que se repete todos os dias. Ao excluí-la, ela não será mais recriada automaticamente.
              {itemToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  "{itemToDelete.title}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && executeRemoveItem(itemToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ItemCardProps {
  item: MyDayItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (item: MyDayItem) => void;
  readOnly?: boolean;
}

function ItemCard({ item, onToggle, onRemove, onEdit, readOnly = false }: ItemCardProps) {
  const StatusIcon = statusIcons[item.status];
  const sourceIcons: Record<string, typeof Target> = {
    'WORKITEM': Target,
    'WORK_ITEM': Target,
    'MEETING': Video,
    'MANUAL': Calendar,
    'PERMANENT': RefreshCw,
  };
  const SourceIcon = sourceIcons[item.source] || Calendar;
  const isPermanent = item.source === 'PERMANENT';
  const hasDeadline = !!item.deadline_time || !!item.deadline_date;

  // Check if this is an overdue task from a previous day
  const isOverdueFromPreviousDay = (() => {
    if (!item.date || item.status === 'CONCLUIDO') return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return item.date < today;
  })();
  // Format deadline for display
  const formatDeadline = () => {
    const parts: string[] = [];
    if (item.deadline_date) {
      const [y, m, d] = item.deadline_date.split('-');
      parts.push(`${d}/${m}`);
    }
    if (item.deadline_time) {
      const [hours, minutes] = item.deadline_time.split(':');
      parts.push(`${hours}:${minutes}`);
    }
    return parts.join(' ');
  };

  // Check if deadline is approaching (within 1 hour)
  const isDeadlineApproaching = () => {
    if (item.status === 'CONCLUIDO') return false;
    if (!item.deadline_time && !item.deadline_date) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // If deadline_date is set and it's not today, check date only
    if (item.deadline_date && item.deadline_date !== today) return false;
    if (!item.deadline_time) return false;
    const [hours, minutes] = item.deadline_time.split(':').map(Number);
    const deadlineInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const diff = deadlineInMinutes - currentTimeInMinutes;
    return diff > 0 && diff <= 60;
  };

  // Check if deadline is past
  const isDeadlinePast = () => {
    if (item.status === 'CONCLUIDO') return false;
    if (!item.deadline_time && !item.deadline_date) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // If deadline_date is in the past, it's overdue
    if (item.deadline_date && item.deadline_date < today) return true;
    // If deadline_date is in the future, not overdue
    if (item.deadline_date && item.deadline_date > today) return false;
    // Same day or no date — check time
    if (!item.deadline_time) return false;
    const [hours, minutes] = item.deadline_time.split(':').map(Number);
    const deadlineInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    return currentTimeInMinutes > deadlineInMinutes;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  const deadlineApproaching = isDeadlineApproaching();
  const deadlinePast = isDeadlinePast();

  return (
    <div 
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all group',
        item.status === 'CONCLUIDO' 
          ? 'bg-surface-2/50 border-border/50' 
          : isOverdueFromPreviousDay
            ? 'bg-destructive/5 border-destructive/30'
            : deadlinePast
              ? 'bg-destructive/5 border-destructive/30'
              : deadlineApproaching
                ? 'bg-warning/5 border-warning/30'
                : 'bg-surface-2 border-border hover:border-primary/30',
        readOnly && 'cursor-default'
      )}
      onClick={() => !readOnly && onToggle(item.id)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center mt-0.5',
          item.status === 'CONCLUIDO' ? 'bg-success/10' : 
          item.status === 'EM_ANDAMENTO' ? 'bg-warning/10' : 'bg-surface-3'
        )}>
          <StatusIcon className={cn(
            'h-4 w-4',
            item.status === 'CONCLUIDO' ? 'text-success' : 
            item.status === 'EM_ANDAMENTO' ? 'text-warning' : 'text-muted-foreground'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-body font-medium',
            item.status === 'CONCLUIDO' ? 'text-muted-foreground line-through' : 'text-foreground'
          )}>
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SourceIcon className={cn("h-3 w-3", isPermanent ? "text-primary" : "text-muted-foreground")} />
            {isPermanent && (
              <Badge variant="outline" className="text-caption bg-primary/10 text-primary border-primary/20">
                Diária
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-caption', priorityColors[item.priority])}>
              {item.priority}
            </Badge>
            {hasDeadline && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-caption flex items-center gap-1',
                  deadlinePast 
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : deadlineApproaching
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-info/10 text-info border-info/20'
                )}
              >
                <AlarmClock className="h-3 w-3" />
                {formatDeadline()}
                {deadlinePast && ' (atrasado)'}
              </Badge>
            )}
            {isOverdueFromPreviousDay && (
              <Badge variant="outline" className="text-caption bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Tarefa atrasada do dia anterior
              </Badge>
            )}
            {item.status === 'CONCLUIDO' && item.completed_at && (
              <Badge variant="outline" className="text-caption bg-success/10 text-success border-success/20 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {new Date(item.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
              title="Editar item"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleRemove}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
