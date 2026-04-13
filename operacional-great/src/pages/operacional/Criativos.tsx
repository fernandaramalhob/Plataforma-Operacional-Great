import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, CheckCircle2, Upload, FileIcon, User, Calendar, Clock, Trash2, Loader2, ChevronsUpDown, Check, Download, X, BarChart3, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format, getWeekOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DESIGNERS } from '@/hooks/useClientActivityTracking';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CriativosActivityTab from '@/components/operacional/CriativosActivityTab';

interface AdCreative {
  id: string;
  client_id: string | null;
  client_name: string;
  image_url: string;
  image_urls: string[];
  status: 'PARA_SUBIR' | 'ATIVO';
  created_by_user_id: string;
  created_by_name: string;
  completed_by_user_id: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function Criativos() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [manualClientMode, setManualClientMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [responsavelArte, setResponsavelArte] = useState('');
  const [detailAd, setDetailAd] = useState<AdCreative | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // State for activate confirmation dialog
  const [activateAd, setActivateAd] = useState<AdCreative | null>(null);
  const [activateGestor, setActivateGestor] = useState('');

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-criativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ad creatives with client team info
  const { data: adCreatives = [], isLoading } = useQuery({
    queryKey: ['ad-creatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_creatives')
        .select('*, operational_clients(team_id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        image_urls: Array.isArray(d.image_urls) ? d.image_urls : (d.image_url ? [d.image_url] : []),
        team_id: d.operational_clients?.team_id || null,
      })) as (AdCreative & { team_id: string | null })[];
    },
  });

  // Fetch operational clients for select
  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-criativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, team_id')
        .in('status_operacional', ['ATIVO', 'ONBOARDING', 'NOVO_CLIENTE'])
        .order('client_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for gestor selection
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-activate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('ad-creatives-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_creatives' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // File previews
  useEffect(() => {
    const urls: string[] = [];
    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        urls.push(URL.createObjectURL(file));
      } else {
        urls.push('');
      }
    });
    setPreviewUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [selectedFiles]);

  // Helper to upsert client_activity_tracking
  const upsertActivityTracking = async (clientId: string, designerName: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const week = getWeekOfMonth(now);
    const { data: userData } = await supabase.auth.getUser();

    // Get existing record
    const { data: existing } = await supabase
      .from('client_activity_tracking')
      .select('id, artes_count')
      .eq('client_id', clientId)
      .eq('year', year)
      .eq('month', month)
      .eq('week', week)
      .eq('designer_name', designerName)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('client_activity_tracking')
        .update({ artes_count: (existing.artes_count || 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('client_activity_tracking')
        .insert({
          client_id: clientId,
          year,
          month,
          week,
          artes_count: 1,
          designer_name: designerName,
          created_by_user_id: userData?.user?.id,
        });
    }
  };

  // Add creative mutation
  const addCreative = useMutation({
    mutationFn: async () => {
      if (!user || selectedFiles.length === 0 || !newClientName.trim()) throw new Error('Dados obrigatórios faltando');
      setIsUploading(true);

      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('ad-creatives')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('ad_creatives').insert({
        client_name: newClientName.trim(),
        client_id: newClientId,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        created_by_user_id: user.id,
        created_by_name: responsavelArte || user.name,
        status: 'PARA_SUBIR',
      });
      if (error) throw error;

      // Auto-count in Controle - Artes
      if (newClientId && responsavelArte) {
        try {
          await upsertActivityTracking(newClientId, responsavelArte);
        } catch (e) {
          console.error('Error updating activity tracking:', e);
        }
      }
    },
    onSuccess: () => {
      toast.success('Anúncio adicionado!');
      setIsAddOpen(false);
      setNewClientName('');
      setNewClientId(null);
      setManualClientMode(false);
      setSelectedFiles([]);
      setResponsavelArte('');
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['designers-totals'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao adicionar: ' + err.message);
    },
    onSettled: () => setIsUploading(false),
  });

  // Complete creative (mark as ATIVO) with gestor
  const completeCreative = useMutation({
    mutationFn: async ({ id, gestorName }: { id: string; gestorName: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('ad_creatives').update({
        status: 'ATIVO',
        completed_by_user_id: user.id,
        completed_by_name: gestorName,
        completed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Anúncio marcado como ativo!');
      setActivateAd(null);
      setActivateGestor('');
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  // Delete creative
  const deleteCreative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ad_creatives').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Anúncio removido!');
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const filteredAds = teamFilter === 'all' 
    ? adCreatives 
    : teamFilter === 'sem_equipe'
      ? adCreatives.filter(a => !a.team_id)
      : adCreatives.filter(a => a.team_id === teamFilter);

  const paraSubir = filteredAds.filter(a => a.status === 'PARA_SUBIR');
  const ativos = filteredAds.filter(a => a.status === 'ATIVO');

  const filteredClients = teamFilter === 'all'
    ? clients
    : teamFilter === 'sem_equipe'
      ? clients.filter(c => !c.team_id)
      : clients.filter(c => c.team_id === teamFilter);

  const handleClientSelect = (clientId: string) => {
    if (clientId === newClientId) {
      setNewClientId(null);
      setNewClientName('');
    } else {
      setNewClientId(clientId);
      const client = clients.find(c => c.id === clientId);
      if (client) setNewClientName(client.client_name);
    }
    setClientComboOpen(false);
  };

  const handleActivateClick = (ad: AdCreative) => {
    setActivateAd(ad);
    setActivateGestor('');
  };

  const handleConfirmActivate = () => {
    if (!activateAd || !activateGestor) return;
    completeCreative.mutate({ id: activateAd.id, gestorName: activateGestor });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">Criativos — Anúncios</h1>
          <p className="text-sm text-muted-foreground">Gerencie anúncios para subir e ativos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Anúncio
          </Button>
        </div>
      </div>

      {/* Team filter bar */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-border bg-muted/30">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Equipe:</span>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
            <SelectItem value="sem_equipe">Sem equipe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-2 border-b border-border">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Quadro
            </TabsTrigger>
            <TabsTrigger value="atividades" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Atividades
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kanban" className="flex-1 overflow-auto mt-0">

      {/* Two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Column: Anúncios para Subir */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-3 bg-orange-500/10 border-b border-border">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm text-orange-600">Anúncios para Subir</h2>
              <span className="ml-auto bg-orange-500/20 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {paraSubir.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paraSubir.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum anúncio para subir
              </div>
            ) : (
              paraSubir.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onComplete={() => handleActivateClick(ad)}
                  onDelete={() => deleteCreative.mutate(ad.id)}
                  onClickCard={() => setDetailAd(ad)}
                  isAdmin={isAdmin}
                  userId={user?.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Column: Anúncios Ativos */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 bg-green-500/10 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h2 className="font-semibold text-sm text-green-600">Anúncios Ativos</h2>
              <span className="ml-auto bg-green-500/20 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {ativos.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ativos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum anúncio ativo
              </div>
            ) : (
              ativos.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onDelete={() => deleteCreative.mutate(ad.id)}
                  onClickCard={() => setDetailAd(ad)}
                  isAdmin={isAdmin}
                  userId={user?.id}
                />
              ))
            )}
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="atividades" className="flex-1 overflow-hidden mt-0">
          <CriativosActivityTab />
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Anúncio para Subir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client select or manual input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Cliente *</label>
                <button
                  type="button"
                  onClick={() => {
                    setManualClientMode(!manualClientMode);
                    setNewClientName('');
                    setNewClientId(null);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {manualClientMode ? 'Selecionar da lista' : 'Digitar manualmente'}
                </button>
              </div>
              {manualClientMode ? (
                <Input
                  placeholder="Digite o nome do cliente..."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              ) : (
                <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={clientComboOpen} className="w-full justify-between font-normal">
                      {newClientId ? clients.find(c => c.id === newClientId)?.client_name : "Selecione o cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.map((c) => (
                            <CommandItem key={c.id} value={c.client_name} onSelect={() => handleClientSelect(c.id)}>
                              <Check className={cn("mr-2 h-4 w-4", newClientId === c.id ? "opacity-100" : "opacity-0")} />
                              {c.client_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Responsável pela arte - Select from DESIGNERS */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Responsável pela Arte *</label>
              <Select value={responsavelArte} onValueChange={setResponsavelArte}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o designer..." />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNERS.map((designer) => (
                    <SelectItem key={designer} value={designer}>
                      {designer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Arquivos do Anúncio *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {selectedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative group">
                          {previewUrls[idx] ? (
                            file.type.startsWith('video/') ? (
                              <video src={previewUrls[idx]} className="w-full h-20 object-cover rounded-lg" muted />
                            ) : (
                              <img src={previewUrls[idx]} alt="Preview" className="w-full h-20 object-cover rounded-lg" />
                            )
                          ) : (
                            <div className="w-full h-20 flex items-center justify-center bg-muted/30 rounded-lg">
                              <FileIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{file.name}</p>
                        </div>
                      ))}
                    </div>
                    <label className="cursor-pointer inline-block">
                      <Button variant="outline" size="sm" type="button" asChild>
                        <span><Plus className="h-3 w-3 mr-1" />Adicionar mais</span>
                      </Button>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <FileIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar os arquivos</p>
                    <p className="text-xs text-muted-foreground mt-1">Imagens, vídeos ou documentos (múltiplos)</p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setSelectedFiles(Array.from(e.target.files));
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addCreative.mutate()}
              disabled={!newClientName.trim() || selectedFiles.length === 0 || !responsavelArte || isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={!!activateAd} onOpenChange={(v) => { if (!v) { setActivateAd(null); setActivateGestor(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ativar Anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme quem é o gestor que está ativando o anúncio de <strong>{activateAd?.client_name}</strong>.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Gestor Responsável *</label>
              <Input
                placeholder="Digite o nome do gestor..."
                value={activateGestor}
                onChange={(e) => setActivateGestor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateAd(null); setActivateGestor(''); }}>Cancelar</Button>
            <Button
              onClick={handleConfirmActivate}
              disabled={!activateGestor || completeCreative.isPending}
              className="gap-2"
            >
              {completeCreative.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <AdDetailDialog ad={detailAd} open={!!detailAd} onOpenChange={(v) => !v && setDetailAd(null)} />
    </div>
  );
}

// Download helper using fetch-to-blob
async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
}

// Ad Detail Dialog
function AdDetailDialog({ ad, open, onOpenChange }: { ad: AdCreative | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!ad) return null;
  const urls = ad.image_urls && ad.image_urls.length > 0 ? ad.image_urls : (ad.image_url ? [ad.image_url] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ad.client_name}
            <span className="text-xs font-normal text-muted-foreground">— {urls.length} arquivo(s)</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {urls.map((url, idx) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
            const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
            const filename = url.split('/').pop()?.split('?')[0] || `arquivo-${idx + 1}`;

            return (
              <div key={idx} className="border border-border rounded-lg overflow-hidden">
                {isImage ? (
                  <img src={url} alt={`${ad.client_name} ${idx + 1}`} className="w-full max-h-[400px] object-contain bg-muted/20" />
                ) : isVideo ? (
                  <video controls className="w-full max-h-[400px] bg-muted/20" playsInline preload="metadata" crossOrigin="anonymous">
                    <source src={url} type={/\.mov(\?|$)/i.test(url) ? 'video/mp4' : undefined} />
                    <source src={url} />
                    Seu navegador não suporta este formato de vídeo.
                  </video>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center bg-muted/20">
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-1">{filename}</p>
                  </div>
                )}
                <div className="flex items-center justify-between p-2 bg-muted/10">
                  <span className="text-xs text-muted-foreground truncate max-w-[70%]">{filename}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => downloadFile(url, filename)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><User className="h-3 w-3" /><span>Criado por: {ad.created_by_name}</span></div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(ad.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
          {ad.status === 'ATIVO' && ad.completed_at && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ativado por: {ad.completed_by_name} em {format(new Date(ad.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Ad Card component
function AdCard({
  ad,
  onComplete,
  onDelete,
  onClickCard,
  isAdmin,
  userId,
}: {
  ad: AdCreative;
  onComplete?: () => void;
  onDelete: () => void;
  onClickCard: () => void;
  isAdmin: boolean;
  userId?: string;
}) {
  const canDelete = isAdmin || ad.created_by_user_id === userId;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden group hover:border-primary/30 transition-all cursor-pointer" onClick={onClickCard}>
      {/* File previews */}
      <div className="relative">
        {ad.image_urls && ad.image_urls.length > 0 ? (
          <div className={cn("grid gap-0.5", ad.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {ad.image_urls.map((url, idx) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
              const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
              return isImage ? (
                <img key={idx} src={url} alt={`Anúncio ${ad.client_name} ${idx + 1}`} className={cn("w-full object-cover", ad.image_urls.length === 1 ? "h-40" : "h-24")} />
              ) : isVideo ? (
                <video key={idx} className={cn("w-full object-cover", ad.image_urls.length === 1 ? "h-40" : "h-24")} muted playsInline preload="metadata" crossOrigin="anonymous">
                  <source src={url} type={/\.mov(\?|$)/i.test(url) ? 'video/mp4' : undefined} />
                  <source src={url} />
                </video>
              ) : (
                <div key={idx} className={cn("w-full flex flex-col items-center justify-center bg-muted/30", ad.image_urls.length === 1 ? "h-28" : "h-24")}>
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        ) : ad.image_url ? (
          /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(ad.image_url) ? (
            <img src={ad.image_url} alt={`Anúncio ${ad.client_name}`} className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-28 flex flex-col items-center justify-center bg-muted/30">
              <FileIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )
        ) : null}
        {ad.image_urls && ad.image_urls.length > 1 && (
          <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ad.image_urls.length} arquivos</span>
        )}
        {ad.status === 'PARA_SUBIR' && onComplete && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            title="Marcar como ativo"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 left-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm text-foreground truncate">{ad.client_name}</h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Arte: {ad.created_by_name}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(ad.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          <Clock className="h-3 w-3 ml-1" />
          <span>{format(new Date(ad.created_at), "HH:mm", { locale: ptBR })}</span>
        </div>

        {ad.status === 'ATIVO' && ad.completed_at && (
          <div className="pt-2 border-t border-border space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ativado por: <strong>{ad.completed_by_name}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(ad.completed_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              <Clock className="h-3 w-3 ml-1" />
              <span>{format(new Date(ad.completed_at), "HH:mm", { locale: ptBR })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
