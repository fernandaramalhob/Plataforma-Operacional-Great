import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, 
  Trophy, 
  Flame, 
  Target,
  Zap,
  Star,
  Loader2,
  Pencil,
  Trash2,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  bonus: string;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
  sector: string;
}

interface ChallengesBoardProps {
  sector?: 'operacional' | 'tech';
}

const DIFFICULTY_CONFIG = {
  FACIL: { label: 'Fácil', color: 'bg-green-500/10 text-green-500 border-green-500/30', icon: Star },
  MEDIA: { label: 'Médio', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Target },
  DIFICIL: { label: 'Difícil', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30', icon: Flame },
  EXTREMO: { label: 'Extremo', color: 'bg-red-500/10 text-red-500 border-red-500/30', icon: Zap },
};

export default function ChallengesBoard({ sector = 'operacional' }: ChallengesBoardProps) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    difficulty: 'MEDIA',
    bonus: '',
  });

  // Check if user can manage challenges (admin or coordinator for operacional, or tech team for tech)
  const canManage = isAdmin || 
    (sector === 'operacional' && (user as any)?.operational_role === 'COORDENADOR_RED') ||
    (sector === 'tech' && (user as any)?.operational_role === 'EQUIPE_TECH');

  // Fetch challenges filtered by sector
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges', sector],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('sector', sector)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Challenge[];
    },
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challenge: typeof newChallenge) => {
      const { error } = await supabase.from('challenges').insert({
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        bonus: challenge.bonus,
        created_by_user_id: user?.id,
        sector: sector,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', sector] });
      toast.success('Desafio criado com sucesso!');
      setIsAddDialogOpen(false);
      setNewChallenge({ title: '', description: '', difficulty: 'MEDIA', bonus: '' });
    },
    onError: () => toast.error('Erro ao criar desafio'),
  });

  // Update challenge mutation
  const updateChallengeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Challenge> }) => {
      const { error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', sector] });
      toast.success('Desafio atualizado!');
      setIsEditDialogOpen(false);
      setEditingChallenge(null);
    },
    onError: () => toast.error('Erro ao atualizar desafio'),
  });

  // Delete challenge mutation
  const deleteChallengeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', sector] });
      toast.success('Desafio removido!');
    },
    onError: () => toast.error('Erro ao remover desafio'),
  });

  // Toggle active status
  const toggleActive = (challenge: Challenge) => {
    updateChallengeMutation.mutate({
      id: challenge.id,
      updates: { is_active: !challenge.is_active },
    });
  };

  const activeChallenges = challenges.filter(c => c.is_active);
  const inactiveChallenges = challenges.filter(c => !c.is_active);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-7 w-7 text-primary" />
              Mural dos Desafios
            </h1>
            <p className="text-muted-foreground">Desafios disponíveis para a equipe</p>
          </div>
          {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Desafio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar Novo Desafio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Título do Desafio *</Label>
                    <Input
                      value={newChallenge.title}
                      onChange={e => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Meta de 100 artes na semana"
                    />
                  </div>
                  <div>
                    <Label>Descrição *</Label>
                    <Textarea
                      value={newChallenge.description}
                      onChange={e => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o desafio em detalhes..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Dificuldade *</Label>
                    <Select
                      value={newChallenge.difficulty}
                      onValueChange={v => setNewChallenge(prev => ({ ...prev, difficulty: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FACIL">⭐ Fácil</SelectItem>
                        <SelectItem value="MEDIA">🎯 Médio</SelectItem>
                        <SelectItem value="DIFICIL">🔥 Difícil</SelectItem>
                        <SelectItem value="EXTREMO">⚡ Extremo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bonificação *</Label>
                    <Input
                      value={newChallenge.bonus}
                      onChange={e => setNewChallenge(prev => ({ ...prev, bonus: e.target.value }))}
                      placeholder="Ex: +50 pontos no campeonato, day off, vale presente..."
                    />
                  </div>
                  <Button 
                    onClick={() => createChallengeMutation.mutate(newChallenge)} 
                    disabled={
                      !newChallenge.title || 
                      !newChallenge.description || 
                      !newChallenge.bonus || 
                      createChallengeMutation.isPending
                    }
                    className="w-full"
                  >
                    {createChallengeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Desafio'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum desafio disponível</h3>
            <p className="text-muted-foreground">
              {canManage ? 'Crie um novo desafio para começar!' : 'Aguarde novos desafios serem adicionados'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Challenges */}
            {activeChallenges.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Desafios Ativos ({activeChallenges.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeChallenges.map(challenge => {
                    const difficultyConfig = DIFFICULTY_CONFIG[challenge.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.MEDIA;
                    const DifficultyIcon = difficultyConfig.icon;

                    return (
                      <Card key={challenge.id} className="group hover:border-primary/50 transition-all hover:shadow-lg">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge className={cn('border', difficultyConfig.color)}>
                              <DifficultyIcon className="h-3 w-3 mr-1" />
                              {difficultyConfig.label}
                            </Badge>
                            {canManage && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingChallenge(challenge);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja remover este desafio?')) {
                                      deleteChallengeMutation.mutate(challenge.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-base mt-2">{challenge.title}</CardTitle>
                          <CardDescription className="line-clamp-3">{challenge.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                            <Gift className="h-5 w-5 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Bonificação</p>
                              <p className="text-sm font-medium text-foreground">{challenge.bonus}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            Criado em {format(new Date(challenge.created_at), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          {canManage && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                              <Label htmlFor={`active-${challenge.id}`} className="text-xs text-muted-foreground">
                                Ativo
                              </Label>
                              <Switch
                                id={`active-${challenge.id}`}
                                checked={challenge.is_active}
                                onCheckedChange={() => toggleActive(challenge)}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive Challenges (only for managers) */}
            {canManage && inactiveChallenges.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">
                  Desafios Inativos ({inactiveChallenges.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveChallenges.map(challenge => {
                    const difficultyConfig = DIFFICULTY_CONFIG[challenge.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.MEDIA;
                    const DifficultyIcon = difficultyConfig.icon;

                    return (
                      <Card key={challenge.id} className="opacity-60 hover:opacity-100 transition-opacity">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline" className="text-muted-foreground">
                              <DifficultyIcon className="h-3 w-3 mr-1" />
                              {difficultyConfig.label}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingChallenge(challenge);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja remover este desafio?')) {
                                    deleteChallengeMutation.mutate(challenge.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <CardTitle className="text-base mt-2 text-muted-foreground">{challenge.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{challenge.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{challenge.bonus}</p>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                            <Label htmlFor={`active-${challenge.id}`} className="text-xs text-muted-foreground">
                              Ativar
                            </Label>
                            <Switch
                              id={`active-${challenge.id}`}
                              checked={challenge.is_active}
                              onCheckedChange={() => toggleActive(challenge)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Desafio</DialogTitle>
          </DialogHeader>
          {editingChallenge && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>Título do Desafio *</Label>
                <Input
                  value={editingChallenge.title}
                  onChange={e => setEditingChallenge(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={editingChallenge.description}
                  onChange={e => setEditingChallenge(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={4}
                />
              </div>
              <div>
                <Label>Dificuldade *</Label>
                <Select
                  value={editingChallenge.difficulty}
                  onValueChange={v => setEditingChallenge(prev => prev ? { ...prev, difficulty: v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACIL">⭐ Fácil</SelectItem>
                    <SelectItem value="MEDIA">🎯 Médio</SelectItem>
                    <SelectItem value="DIFICIL">🔥 Difícil</SelectItem>
                    <SelectItem value="EXTREMO">⚡ Extremo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bonificação *</Label>
                <Input
                  value={editingChallenge.bonus}
                  onChange={e => setEditingChallenge(prev => prev ? { ...prev, bonus: e.target.value } : null)}
                />
              </div>
              <Button 
                onClick={() => {
                  if (editingChallenge) {
                    updateChallengeMutation.mutate({
                      id: editingChallenge.id,
                      updates: {
                        title: editingChallenge.title,
                        description: editingChallenge.description,
                        difficulty: editingChallenge.difficulty,
                        bonus: editingChallenge.bonus,
                      },
                    });
                  }
                }} 
                disabled={
                  !editingChallenge.title || 
                  !editingChallenge.description || 
                  !editingChallenge.bonus || 
                  updateChallengeMutation.isPending
                }
                className="w-full"
              >
                {updateChallengeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
