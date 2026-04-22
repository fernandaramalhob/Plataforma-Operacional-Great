import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Megaphone, Clock, Trash2, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

type TargetTeam = 'all' | 'equipe-7' | 'tropa-de-elite';

const TEAM_LABELS: Record<TargetTeam, string> = {
  'all': 'Todas as equipes',
  'equipe-7': 'Equipe 7',
  'tropa-de-elite': 'Tropa de Elite',
};

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by_user_id: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  target_team?: TargetTeam | null;
  creator?: { full_name: string };
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground', icon: Info },
  normal: { label: 'Normal', color: 'bg-primary/10 text-primary', icon: Bell },
  high: { label: 'Alta', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
  urgent: { label: 'Urgente', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
};

export default function MuralAvisos() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    expires_at: '',
    target_team: 'all' as TargetTeam,
  });

  // Check if user can create announcements (coordinator or admin)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-announcement', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('operational_role, team_id, teams(name)')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const canManageAnnouncements = isAdmin || userProfile?.operational_role === 'COORDENADOR_RED';

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          creator:profiles!announcements_created_by_user_id_fkey(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Announcement[];
    },
  });

  // Filter announcements by team for non-admins
  const userTeamId = (userProfile as any)?.team_id as string | null | undefined;
  const visibleAnnouncements = isAdmin
    ? announcements
    : (announcements || []).filter((a) => {
        if (!a.target_team || a.target_team === 'all') return true;
        if (!userTeamId) return false;
        // Match by team slug: e.g. 'equipe-7' matches team_id 'equipe-7'
        return a.target_team === userTeamId;
      });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newAnnouncement) => {
      const { error } = await supabase.from('announcements').insert({
        title: data.title,
        content: data.content,
        priority: data.priority,
        expires_at: data.expires_at || null,
        created_by_user_id: user?.id,
        target_team: data.target_team || 'all',
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aviso publicado com sucesso! Todos os usuários foram notificados.');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E10600', '#ff4d4d', '#ffffff', '#ff9999'],
      });
      setIsDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', priority: 'normal', expires_at: '', target_team: 'all' });
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
      toast.error('Erro ao publicar aviso');
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Aviso removido');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => {
      toast.error('Erro ao remover aviso');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(newAnnouncement);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Megaphone className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mural de Avisos</h1>
            <p className="text-sm text-muted-foreground">
              Comunicados importantes para toda a equipe
            </p>
          </div>
        </div>

        {canManageAnnouncements && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Publicar Novo Aviso</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título do aviso"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo *</Label>
                  <Textarea
                    id="content"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Descreva o aviso em detalhes..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={newAnnouncement.priority}
                      onValueChange={(value: typeof newAnnouncement.priority) =>
                        setNewAnnouncement(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires">Expira em (opcional)</Label>
                    <Input
                      id="expires"
                      type="datetime-local"
                      value={newAnnouncement.expires_at}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quem pode ver este aviso?</Label>
                  {userProfile && (userProfile as any).teams?.name && (
                    <p className="text-xs text-muted-foreground">
                      Sua equipe: <span className="font-medium text-foreground">{(userProfile as any).teams.name}</span>
                    </p>
                  )}
                  <Select
                    value={newAnnouncement.target_team}
                    onValueChange={(value: TargetTeam) =>
                      setNewAnnouncement(prev => ({ ...prev, target_team: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as equipes</SelectItem>
                      <SelectItem value="equipe-7">Equipe 7</SelectItem>
                      <SelectItem value="tropa-de-elite">Tropa de Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Publicando...' : 'Publicar Aviso'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visibleAnnouncements && visibleAnnouncements.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4">
            {visibleAnnouncements.map((announcement, index) => {
              const config = priorityConfig[announcement.priority];
              const PriorityIcon = config.icon;
              
              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`relative overflow-hidden border-l-4 ${
                    announcement.priority === 'urgent' ? 'border-l-destructive' :
                    announcement.priority === 'high' ? 'border-l-amber-500' :
                    announcement.priority === 'normal' ? 'border-l-primary' :
                    'border-l-muted-foreground'
                  }`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <PriorityIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(announcement.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                              {announcement.creator && (
                                <>
                                  <span>•</span>
                                  <span>por {announcement.creator.full_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          {/* Team badge — always visible for admins, visible for all when target_team is set */}
                          {(isAdmin || announcement.target_team) && (
                            <Badge variant="secondary" className="text-xs">
                              {announcement.target_team && announcement.target_team !== 'all'
                                ? TEAM_LABELS[announcement.target_team]
                                : 'Todas as equipes'}
                            </Badge>
                          )}
                          {canManageAnnouncements && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(announcement.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      {announcement.expires_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Expira em: {format(new Date(announcement.expires_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      ) : (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum aviso publicado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {canManageAnnouncements 
                ? 'Clique em "Novo Aviso" para publicar um comunicado para toda a equipe.'
                : 'Quando houver comunicados importantes, eles aparecerão aqui.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
