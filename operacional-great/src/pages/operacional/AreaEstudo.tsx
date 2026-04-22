import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, ExternalLink, File, FolderOpen, Heart, Loader2, Palette, Pencil, PenTool, Plus, Search, ShieldCheck, Sparkles, Target, Trash2, Upload, Users, Video, X } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  users: Users,
  'heart-handshake': Heart,
  palette: Palette,
  video: Video,
  'pen-tool': PenTool,
  sparkles: Sparkles,
  'shield-check': ShieldCheck,
  book: BookOpen,
};

interface StudyCategory {
  id: string;
  name: string;
  color: string | null;
  icon?: string;
  description?: string | null;
}

interface StudyResource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  file_ref: string | null;
}

export default function AreaEstudo() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: 'book', color: '#ef4444' });
  const [newResource, setNewResource] = useState({ category_id: '', title: '', description: '', source_url: '' });
  const [editLink, setEditLink] = useState('');
  const [editFile, setEditFile] = useState<{ name: string; ref: string } | null>(null);

  const canManage = isAdmin || (user as { operational_role?: string } | null)?.operational_role === 'COORDENADOR_RED';

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('study_categories').select('*').order('name');
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['study-resources', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('study_resources').select('*');
      if (selectedCategory) query = query.eq('category_id', selectedCategory);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudyResource[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('study_categories').insert({
        ...newCategory,
        description: newCategory.description || null,
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-categories'] });
      setIsAddCategoryOpen(false);
      setNewCategory({ name: '', description: '', icon: 'book', color: '#ef4444' });
      toast.success('Área criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar área.'),
  });

  const createResource = useMutation({
    mutationFn: async () => {
      let fileRef: string | null = null;
      if (selectedFile) {
        setIsUploading(true);
        const ext = selectedFile.name.split('.').pop();
        const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('study-files').upload(path, selectedFile);
        if (uploadError) throw uploadError;
        fileRef = path;
        setIsUploading(false);
      }

      const { error } = await supabase.from('study_resources').insert({
        category_id: newResource.category_id,
        type: selectedFile ? 'DOCUMENT' : 'LINK',
        title: newResource.title,
        description: newResource.description || null,
        tags: [],
        source_url: newResource.source_url || null,
        file_ref: fileRef,
        difficulty: 'INICIANTE',
        visibility: 'ALL_INTERNAL',
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      setIsAddResourceOpen(false);
      setNewResource({ category_id: '', title: '', description: '', source_url: '' });
      setSelectedFile(null);
      toast.success('Conteúdo adicionado.');
    },
    onError: () => {
      setIsUploading(false);
      toast.error('Erro ao adicionar conteúdo.');
    },
  });

  const updateResource = useMutation({
    mutationFn: async () => {
      if (!editingResource) return;
      const { error } = await supabase
        .from('study_resources')
        .update({ source_url: editLink || null, file_ref: editFile?.ref || null })
        .eq('id', editingResource.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      setIsEditDialogOpen(false);
      setEditingResource(null);
      toast.success('Conteúdo atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar conteúdo.'),
  });

  const deleteResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase.from('study_resources').delete().eq('id', resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      toast.success('Conteúdo removido.');
    },
    onError: () => toast.error('Erro ao remover conteúdo.'),
  });

  const selectedCategoryData = categories.find((item) => item.id === selectedCategory) ?? null;
  const filteredResources = resources.filter((resource) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return resource.title.toLowerCase().includes(query) || resource.description?.toLowerCase().includes(query);
  });

  const openEdit = (resource: StudyResource) => {
    setEditingResource(resource);
    setEditLink(resource.source_url || '');
    setEditFile(resource.file_ref ? { name: resource.file_ref.split('/').pop() || 'Arquivo', ref: resource.file_ref } : null);
    setIsEditDialogOpen(true);
  };

  const getFileUrl = (fileRef: string) => supabase.storage.from('study-files').getPublicUrl(fileRef).data.publicUrl;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.08),_transparent_40%),linear-gradient(180deg,#fffdfd_0%,#f7f2f1_100%)]">
      <div className="border-b border-slate-200/80 px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-red-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Área de Estudos</span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950">Conteúdos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Biblioteca interna com materiais, links e arquivos para estudo e consulta do time.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-slate-200 bg-white/90 px-5 hover:bg-slate-50"
              onClick={() => navigate('/operacional/great-study-ai')}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Great Study AI
            </Button>

            {canManage ? (
              <>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button variant="outline" className="h-12 rounded-2xl border-red-200 bg-white/90 px-5 text-red-500 hover:bg-red-50"><Plus className="mr-2 h-4 w-4" />Nova área</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar área de estudo</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input value={newCategory.name} onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))} placeholder="Nome da área" />
                      <Textarea value={newCategory.description} onChange={(e) => setNewCategory((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select value={newCategory.icon} onValueChange={(value) => setNewCategory((p) => ({ ...p, icon: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="book">Livro</SelectItem>
                            <SelectItem value="target">Alvo</SelectItem>
                            <SelectItem value="users">Equipe</SelectItem>
                            <SelectItem value="palette">Design</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="sparkles">IA</SelectItem>
                            <SelectItem value="shield-check">Processos</SelectItem>
                            <SelectItem value="heart-handshake">Pessoas</SelectItem>
                            <SelectItem value="pen-tool">Roteiro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="color" value={newCategory.color} onChange={(e) => setNewCategory((p) => ({ ...p, color: e.target.value }))} />
                      </div>
                      <Button className="w-full" onClick={() => createCategory.mutate()} disabled={!newCategory.name || createCategory.isPending}>
                        {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar área'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                  <DialogTrigger asChild><Button className="h-12 rounded-2xl bg-red-500 px-5 text-white hover:bg-red-600"><Plus className="mr-2 h-4 w-4" />Adicionar conteúdo</Button></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Adicionar conteúdo</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Select value={newResource.category_id} onValueChange={(value) => setNewResource((p) => ({ ...p, category_id: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                        <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={newResource.title} onChange={(e) => setNewResource((p) => ({ ...p, title: e.target.value }))} placeholder="Título do conteúdo" />
                      <Textarea value={newResource.description} onChange={(e) => setNewResource((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                      <Input value={newResource.source_url} onChange={(e) => setNewResource((p) => ({ ...p, source_url: e.target.value }))} placeholder="https://..." />
                      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className={cn('w-full rounded-2xl border-2 border-dashed p-4 text-sm', selectedFile ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}>
                        {selectedFile ? selectedFile.name : 'Selecionar arquivo opcional'}
                      </button>
                      <Button className="w-full" onClick={() => createResource.mutate()} disabled={!newResource.category_id || !newResource.title || createResource.isPending || isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar conteúdo'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por título ou descrição..." className="h-12 rounded-2xl border-slate-200 bg-white/95 pl-11" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Área ativa</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCategoryData?.name ?? 'Todas as áreas'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resultados</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{filteredResources.length} conteúdos</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="min-h-0 rounded-[28px] border-white/70 bg-white/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-red-500" />Trilhas</CardTitle>
            <CardDescription>Escolha uma área para filtrar os materiais.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0">
            <ScrollArea className="h-[calc(100vh-22rem)] pr-3 xl:h-[calc(100vh-18rem)]">
              <div className="space-y-2">
                <button type="button" onClick={() => setSelectedCategory(null)} className={cn('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm', !selectedCategory ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700')}>
                  <FolderOpen className="h-4 w-4" /><span className="font-medium">Todos os conteúdos</span>
                </button>
                {categories.map((category) => {
                  const Icon = iconMap[category.icon || 'book'] || BookOpen;
                  const active = selectedCategory === category.id;
                  return (
                    <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)} className={cn('flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left', active ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700')}>
                      <span className={cn('mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl', active ? 'bg-white/16' : 'bg-white')}>
                        <Icon className="h-4 w-4" style={{ color: active ? '#fff' : category.color || '#ef4444' }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{category.name}</span>
                        {category.description ? <span className={cn('mt-1 block text-xs', active ? 'text-white/80' : 'text-slate-500')}>{category.description}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-0 rounded-[28px] border-white/70 bg-white/88">
          <CardHeader className="border-b border-slate-100 pb-5">
            <CardTitle className="text-xl font-bold text-slate-950">{selectedCategoryData?.name ?? 'Todos os conteúdos'}</CardTitle>
            <CardDescription>{selectedCategoryData?.description || 'Links, arquivos e materiais centralizados em um só lugar.'}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 p-0">
            <ScrollArea className="h-[calc(100vh-18rem)] px-6 py-6">
              {categoriesLoading || resourcesLoading ? (
                <div className="flex h-52 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>
              ) : filteredResources.length === 0 ? (
                <div className="flex h-[60vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-center">
                  <BookOpen className="mb-4 h-12 w-12 text-slate-300" />
                  <h3 className="text-xl font-semibold text-slate-900">Nenhum conteúdo encontrado</h3>
                  <p className="mt-2 max-w-md text-sm text-slate-500">{canManage ? 'Adicione materiais nessa área para começar a montar a biblioteca.' : 'Quando novos materiais forem publicados, eles aparecerão aqui.'}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredResources.map((resource) => {
                    const category = categories.find((item) => item.id === resource.category_id);
                    const Icon = category ? iconMap[category.icon || 'book'] || BookOpen : BookOpen;
                    return (
                      <Card key={resource.id} className="rounded-[26px] border-slate-200/90 bg-white">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: category?.color ? `${category.color}1f` : 'rgba(239,68,68,.12)' }}>
                              <Icon className="h-5 w-5" style={{ color: category?.color || '#ef4444' }} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{category?.name || 'Biblioteca'}</p>
                              <CardTitle className="mt-1 text-lg leading-tight text-slate-950">{resource.title}</CardTitle>
                            </div>
                          </div>
                          {resource.description ? <CardDescription className="line-clamp-3 text-sm leading-6 text-slate-500">{resource.description}</CardDescription> : null}
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="flex flex-wrap gap-2">
                            {resource.source_url ? <Button size="sm" className="rounded-xl bg-red-500 text-white hover:bg-red-600" onClick={() => window.open(resource.source_url!, '_blank')}><ExternalLink className="mr-2 h-4 w-4" />Abrir link</Button> : null}
                            {resource.file_ref ? <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => window.open(getFileUrl(resource.file_ref!), '_blank')}><File className="mr-2 h-4 w-4" />Abrir arquivo</Button> : null}
                          </div>
                          {canManage ? (
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500" onClick={() => openEdit(resource)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500" onClick={() => deleteResource.mutate(resource.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar conteúdo</DialogTitle></DialogHeader>
          {editingResource ? (
            <div className="space-y-4 pt-4">
              <div>
                <Label className="font-medium">{editingResource.title}</Label>
                <p className="text-sm text-slate-500">{editingResource.description || 'Sem descrição'}</p>
              </div>
              <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="Atualizar link" />
              <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">{editFile ? editFile.name : 'Nenhum arquivo anexado'}</div>
              <input ref={editFileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const ext = file.name.split('.').pop();
                  const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  const { error } = await supabase.storage.from('study-files').upload(path, file);
                  if (error) throw error;
                  setEditFile({ name: file.name, ref: path });
                } catch {
                  toast.error('Erro ao enviar arquivo.');
                } finally {
                  setIsUploading(false);
                }
              }} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => editFileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" />Trocar arquivo</>}
                </Button>
                {editFile ? <Button variant="outline" size="icon" onClick={() => setEditFile(null)}><X className="h-4 w-4" /></Button> : null}
              </div>
              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={() => updateResource.mutate()} disabled={updateResource.isPending}>
                  {updateResource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
