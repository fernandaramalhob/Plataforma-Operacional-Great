import { useState, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Target, 
  Users, 
  Heart, 
  Palette, 
  Video, 
  PenTool, 
  Sparkles, 
  ShieldCheck,
  FileText,
  Bot,
  Send,
  Loader2,
  FolderOpen,
  Trash2,
  ExternalLink,
  Upload,
  File,
  Pencil,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon mapping for categories
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
  description: string | null;
  icon: string | null;
  color: string | null;
  created_by_user_id: string;
  created_at: string;
}

interface ResourceAttachment {
  id: string;
  type: 'file' | 'link';
  name: string;
  url: string;
  file_ref?: string;
}

interface StudyResource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  file_ref: string | null;
  attachments?: ResourceAttachment[];
  created_by_user_id: string;
  created_at: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AreaEstudo() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // AI Chat
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'CATEGORY_FOCUS' | 'GREAT_GENERAL'>('CATEGORY_FOCUS');

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit form state
  const [editFormLinks, setEditFormLinks] = useState<string[]>([]);
  const [newEditLink, setNewEditLink] = useState('');
  const [editFormFiles, setEditFormFiles] = useState<{ name: string; ref: string }[]>([]);

  // Form states
  const [newResource, setNewResource] = useState({
    category_id: '',
    title: '',
    description: '',
    source_url: '',
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: 'book',
    color: '#3b82f6',
  });

  // Check if user can manage content (create/update)
  const canManage = isAdmin || (user as any)?.operational_role === 'COORDENADOR_RED';
  
  // Check if user can delete (only coordinator/admin)
  const canDelete = isAdmin || (user as any)?.operational_role === 'COORDENADOR_RED';

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['study-resources', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('study_resources').select('*');
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudyResource[];
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: typeof newCategory) => {
      const { error } = await supabase.from('study_categories').insert({
        name: category.name,
        description: category.description || null,
        icon: category.icon,
        color: category.color,
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-categories'] });
      toast.success('Área criada com sucesso!');
      setIsAddCategoryOpen(false);
      setNewCategory({ name: '', description: '', icon: 'book', color: '#3b82f6' });
    },
    onError: () => toast.error('Erro ao criar área'),
  });

  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: async (resource: typeof newResource) => {
      let fileRef: string | null = null;
      
      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('study-files')
          .upload(filePath, selectedFile);
        
        if (uploadError) {
          setIsUploading(false);
          throw uploadError;
        }
        
        fileRef = filePath;
        setIsUploading(false);
      }
      
      const { error } = await supabase.from('study_resources').insert({
        category_id: resource.category_id,
        type: selectedFile ? 'DOCUMENT' as any : 'LINK' as any,
        title: resource.title,
        description: resource.description || null,
        tags: [],
        source_url: resource.source_url || null,
        file_ref: fileRef,
        difficulty: 'INICIANTE' as any,
        visibility: 'ALL_INTERNAL' as any,
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      toast.success('Conteúdo adicionado!');
      setIsAddResourceOpen(false);
      setNewResource({
        category_id: '',
        title: '',
        description: '',
        source_url: '',
      });
      setSelectedFile(null);
    },
    onError: () => toast.error('Erro ao adicionar conteúdo'),
  });

  // Get file URL
  const getFileUrl = (fileRef: string) => {
    const { data } = supabase.storage.from('study-files').getPublicUrl(fileRef);
    return data.publicUrl;
  };

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase.from('study_resources').delete().eq('id', resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      toast.success('Conteúdo removido!');
    },
  });

  // Update resource mutation
  const updateResourceMutation = useMutation({
    mutationFn: async ({ resourceId, updates }: { resourceId: string; updates: Partial<StudyResource> }) => {
      const { error } = await supabase
        .from('study_resources')
        .update(updates)
        .eq('id', resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-resources'] });
      toast.success('Conteúdo atualizado!');
      setIsEditDialogOpen(false);
      setEditingResource(null);
    },
    onError: () => toast.error('Erro ao atualizar conteúdo'),
  });

  // Handle opening edit dialog
  const handleOpenEditDialog = (resource: StudyResource) => {
    setEditingResource(resource);
    // Parse existing links
    const links: string[] = [];
    if (resource.source_url) {
      links.push(resource.source_url);
    }
    setEditFormLinks(links);
    setNewEditLink('');
    // Parse existing files
    const files: { name: string; ref: string }[] = [];
    if (resource.file_ref) {
      files.push({ name: resource.file_ref.split('/').pop() || 'Arquivo', ref: resource.file_ref });
    }
    setEditFormFiles(files);
    setIsEditDialogOpen(true);
  };

  // Add link to edit form
  const handleAddEditLink = () => {
    if (newEditLink.trim() && !editFormLinks.includes(newEditLink.trim())) {
      setEditFormLinks(prev => [...prev, newEditLink.trim()]);
      setNewEditLink('');
    }
  };

  // Remove link from edit form
  const handleRemoveEditLink = (link: string) => {
    if (!canDelete) {
      toast.error('Apenas coordenadores podem remover links');
      return;
    }
    setEditFormLinks(prev => prev.filter(l => l !== link));
  };

  // Remove file from edit form
  const handleRemoveEditFile = (ref: string) => {
    if (!canDelete) {
      toast.error('Apenas coordenadores podem remover arquivos');
      return;
    }
    setEditFormFiles(prev => prev.filter(f => f.ref !== ref));
  };

  // Handle file upload in edit mode
  const handleEditFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('study-files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      setEditFormFiles(prev => [...prev, { name: file.name, ref: filePath }]);
      toast.success('Arquivo adicionado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingResource) return;
    
    // Combine links and files into source_url and file_ref
    // For simplicity, we'll use the first link and first file
    const updates: Partial<StudyResource> = {
      source_url: editFormLinks.length > 0 ? editFormLinks[0] : null,
      file_ref: editFormFiles.length > 0 ? editFormFiles[0].ref : null,
    };
    
    updateResourceMutation.mutate({ resourceId: editingResource.id, updates });
  };

  // Filter resources
  const filteredResources = resources.filter(r => {
    if (searchTerm && !r.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // AI Chat handler
  const handleAiSend = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      
      const response = await supabase.functions.invoke('study-ai-chat', {
        body: {
          messages: [...aiMessages, { role: 'user', content: userMessage }],
          mode: aiMode,
          categoryName: selectedCategoryData?.name || null,
          categoryDescription: selectedCategoryData?.description || null,
        },
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data?.message || 'Desculpe, não consegui processar sua pergunta.';
      setAiMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('Erro ao processar sua pergunta');
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Categories */}
      <div className="w-64 border-r border-border bg-surface-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Áreas de Estudo
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                !selectedCategory 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-surface-2'
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Todos os conteúdos
            </button>
            {categories.map(cat => {
              const Icon = iconMap[cat.icon || 'book'] || BookOpen;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedCategory === cat.id 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-surface-2'
                  )}
                >
                  <Icon className="h-4 w-4" style={{ color: cat.color || undefined }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </ScrollArea>
        {canManage && (
          <div className="p-3 border-t border-border">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Área
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Área de Estudo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={newCategory.name}
                      onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Marketing Digital"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={newCategory.description}
                      onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Breve descrição da área..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Ícone</Label>
                      <Select
                        value={newCategory.icon}
                        onValueChange={v => setNewCategory(prev => ({ ...prev, icon: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="book">📚 Livro</SelectItem>
                          <SelectItem value="target">🎯 Alvo</SelectItem>
                          <SelectItem value="users">👥 Equipe</SelectItem>
                          <SelectItem value="palette">🎨 Design</SelectItem>
                          <SelectItem value="video">🎬 Vídeo</SelectItem>
                          <SelectItem value="sparkles">✨ IA</SelectItem>
                          <SelectItem value="shield-check">🛡️ Processos</SelectItem>
                          <SelectItem value="heart-handshake">💜 Gestão de Pessoas</SelectItem>
                          <SelectItem value="pen-tool">✏️ Roteiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label>Cor</Label>
                      <Input
                        type="color"
                        value={newCategory.color}
                        onChange={e => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => createCategoryMutation.mutate(newCategory)} 
                    disabled={!newCategory.name || createCategoryMutation.isPending}
                    className="w-full"
                  >
                    Criar Área
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Área de Estudo</h1>
              <p className="text-muted-foreground">Central de conhecimento interno da Great</p>
            </div>
            {canManage && (
              <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Conteúdo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Adicionar Conteúdo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Área *</Label>
                      <Select
                        value={newResource.category_id}
                        onValueChange={v => setNewResource(prev => ({ ...prev, category_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={newResource.title}
                        onChange={e => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Título do conteúdo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={newResource.description}
                        onChange={e => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição do conteúdo..."
                      />
                    </div>
                    <div>
                      <Label>URL / Link</Label>
                      <Input
                        value={newResource.source_url}
                        onChange={e => setNewResource(prev => ({ ...prev, source_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div className="border-t pt-4">
                      <Label>Ou anexar arquivo</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedFile(file);
                        }}
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                          selectedFile 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-muted-foreground"
                        )}
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <File className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm">Clique para selecionar um arquivo</span>
                            <span className="text-xs">PDF, DOC, PPT, XLS, MP4, MP3...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => createResourceMutation.mutate(newResource)} 
                      disabled={!newResource.category_id || !newResource.title || createResourceMutation.isPending || isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando arquivo...
                        </>
                      ) : (
                        'Adicionar Conteúdo'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Search only */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por título..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Content Grid */}
        <ScrollArea className="flex-1 p-6">
          {resourcesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum conteúdo encontrado</h3>
              <p className="text-muted-foreground">
                {canManage ? 'Adicione conteúdos para começar' : 'Aguarde novos conteúdos serem adicionados'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map(resource => {
                const category = categories.find(c => c.id === resource.category_id);
                const CategoryIcon = category ? (iconMap[category.icon || 'book'] || BookOpen) : FileText;

                return (
                  <Card key={resource.id} className="group hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${category?.color}20` || 'hsl(var(--primary) / 0.1)' }}
                          >
                            <CategoryIcon 
                              className="h-4 w-4" 
                              style={{ color: category?.color || 'hsl(var(--primary))' }} 
                            />
                          </div>
                          {category && (
                            <span className="text-xs text-muted-foreground">{category.name}</span>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-base line-clamp-2 mt-2">{resource.title}</CardTitle>
                      {resource.description && (
                        <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {resource.source_url && (
                            <Button 
                              size="sm" 
                              variant="default"
                              className="flex-1"
                              onClick={() => window.open(resource.source_url!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Acessar Link
                            </Button>
                          )}
                          {resource.file_ref && (
                            <Button 
                              size="sm" 
                              variant="default"
                              className="flex-1"
                              onClick={() => window.open(getFileUrl(resource.file_ref!), '_blank')}
                            >
                              <File className="h-4 w-4 mr-2" />
                              Baixar Arquivo
                            </Button>
                          )}
                          {!resource.source_url && !resource.file_ref && (
                            <span className="text-xs text-muted-foreground">Sem arquivo ou link</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          {/* Edit button - available for anyone who can manage */}
                          {canManage && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => handleOpenEditDialog(resource)}
                              title="Editar conteúdo"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Delete button - only for coordinators/admin */}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteResourceMutation.mutate(resource.id)}
                              title="Remover conteúdo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - AI Chat */}
      <div className="w-80 border-l border-border bg-surface-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Great Study AI
          </h3>
          <div className="mt-2">
            <Tabs value={aiMode} onValueChange={v => setAiMode(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="CATEGORY_FOCUS" className="flex-1 text-xs">
                  Foco na Área
                </TabsTrigger>
                <TabsTrigger value="GREAT_GENERAL" className="flex-1 text-xs">
                  Geral Great
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {aiMessages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {aiMode === 'CATEGORY_FOCUS' 
                    ? selectedCategory 
                      ? `Pergunte sobre ${categories.find(c => c.id === selectedCategory)?.name}`
                      : 'Selecione uma área ou pergunte algo!'
                    : 'Pergunte sobre processos e conhecimentos da Great!'
                  }
                </p>
                <div className="mt-4 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => {
                      setAiInput('Gere um resumo rápido sobre este tema');
                    }}
                  >
                    📝 Gerar resumo
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => {
                      setAiInput('Crie um quiz de fixação');
                    }}
                  >
                    🧠 Criar quiz
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => {
                      setAiInput('Monte um plano de estudo semanal');
                    }}
                  >
                    📅 Plano de estudo
                  </Button>
                </div>
              </div>
            ) : (
              aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground ml-4' 
                      : 'bg-muted mr-4'
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              placeholder="Faça uma pergunta..."
              onKeyDown={e => e.key === 'Enter' && handleAiSend()}
            />
            <Button size="icon" onClick={handleAiSend} disabled={isAiLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Conteúdo</DialogTitle>
          </DialogHeader>
          {editingResource && (
            <div className="space-y-4 pt-4">
              <div>
                <Label className="font-medium">{editingResource.title}</Label>
                <p className="text-sm text-muted-foreground">{editingResource.description || 'Sem descrição'}</p>
              </div>

              {/* Links Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </Label>
                <div className="space-y-2">
                  {editFormLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{link}</span>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveEditLink(link)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newEditLink}
                      onChange={e => setNewEditLink(e.target.value)}
                      placeholder="Adicionar novo link..."
                      onKeyDown={e => e.key === 'Enter' && handleAddEditLink()}
                    />
                    <Button size="sm" variant="outline" onClick={handleAddEditLink} disabled={!newEditLink.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Files Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Arquivos
                </Label>
                <div className="space-y-2">
                  {editFormFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-primary"
                        onClick={() => window.open(getFileUrl(file.ref), '_blank')}
                      >
                        Ver
                      </Button>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveEditFile(file.ref)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.mp3"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleEditFileUpload(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Adicionar Arquivo
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSaveEdit}
                  disabled={updateResourceMutation.isPending}
                >
                  {updateResourceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
