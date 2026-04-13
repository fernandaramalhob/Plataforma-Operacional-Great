import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Calendar, User, Tag, CheckSquare, Paperclip, MessageSquare, Trash2, Building2, Flag, Upload, FileText, Image, File, Loader2, Download, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ExecCard, ExecColumn, ExecComment, useUpdateCard, useCreateComment, useExecComments } from '@/hooks/useExecData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface ExecCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ExecCard | null;
  columns: ExecColumn[];
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[];
  clients: { id: string; client_name: string }[];
  boardId: string;
}

export function ExecCardModal({
  open,
  onOpenChange,
  card,
  columns,
  teamMembers,
  clients,
  boardId,
}: ExecCardModalProps) {
  const [editedCard, setEditedCard] = useState<Partial<ExecCard>>({});
  const [newComment, setNewComment] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pastedImages, setPastedImages] = useState<{ file: File; preview: string }[]>([]);
  
  // CRITICAL: Use ref to capture card ID at modal open to prevent stale closure issues
  const currentCardIdRef = useRef<string | null>(null);
  const [isUploadingPastedImages, setIsUploadingPastedImages] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: comments } = useExecComments(card?.id || null);
  const updateCard = useUpdateCard();
  const createComment = useCreateComment();

  // Handle paste event for images in comment textarea (supports multiple images)
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImages: { file: File; preview: string }[] = [];
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          newImages.push({ file, preview });
        }
      }
    }
    
    if (newImages.length > 0) {
      setPastedImages((prev) => [...prev, ...newImages]);
      toast.info(`${newImages.length} imagem(ns) colada(s)! Cole mais ou clique em "Enviar" para comentar.`);
    }
  }, []);

  // CRITICAL: Update ref whenever card changes to ensure all async operations use the correct card ID
  useEffect(() => {
    if (card) {
      currentCardIdRef.current = card.id;
      setEditedCard({
        title: card.title,
        description: card.description,
        column_id: card.column_id,
        assigned_to_user_id: card.assigned_to_user_id,
        client_id: card.client_id,
        priority: card.priority,
        due_date: card.due_date,
        tags: card.tags || [],
        checklist: card.checklist || [],
        attachments: card.attachments || [],
      });
      // Parse attachments from card data
      const cardAttachments = (card.attachments as Attachment[]) || [];
      setAttachments(cardAttachments);
      // Clear pasted images when switching cards (inline to avoid hoisting issues)
      setPastedImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.preview));
        return [];
      });
      setNewComment('');
    }
  }, [card?.id]); // Only depend on card.id to detect card changes

  if (!card) return null;

  const handleSave = async () => {
    try {
      await updateCard.mutateAsync({
        id: card.id,
        board_id: boardId,
        ...editedCard,
        attachments: attachments,
      });
      toast.success('Tarefa atualizada!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    // CRITICAL: Capture the card ID at the start
    const targetCardId = currentCardIdRef.current;
    if (!files || files.length === 0 || !targetCardId) return;

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${targetCardId}/${crypto.randomUUID()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('exec-attachments')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('exec-attachments')
          .getPublicUrl(fileName);

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Only update local state if still on same card
      if (currentCardIdRef.current === targetCardId) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
      toast.success(`${newAttachments.length} arquivo(s) anexado(s)!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = async (attachment: Attachment) => {
    try {
      // Extract file path from URL
      const urlParts = attachment.url.split('/exec-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('exec-attachments').remove([filePath]);
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success('Anexo removido!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover anexo');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Clear all pasted images
  const clearPastedImages = () => {
    pastedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setPastedImages([]);
  };

  // Remove a single pasted image
  const removePastedImage = (index: number) => {
    setPastedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Upload pasted images, add as comment, and set first as cover
  const handleAddCommentWithImages = async () => {
    // CRITICAL: Capture the card ID at the start of the operation to prevent stale closure issues
    const targetCardId = currentCardIdRef.current;
    if (pastedImages.length === 0 || !targetCardId) return;

    setIsUploadingPastedImages(true);
    try {
      const uploadedUrls: string[] = [];
      const newAttachments: Attachment[] = [];

      // Upload all images using the captured card ID
      for (const pastedImage of pastedImages) {
        const fileExt = pastedImage.file.type.split('/')[1] || 'png';
        const fileName = `${targetCardId}/${crypto.randomUUID()}.${fileExt}`;

        const { error } = await supabase.storage
          .from('exec-attachments')
          .upload(fileName, pastedImage.file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('exec-attachments')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);

        newAttachments.push({
          id: crypto.randomUUID(),
          name: `imagem-${format(new Date(), 'dd-MM-yyyy-HHmmss')}-${uploadedUrls.length}.${fileExt}`,
          url: urlData.publicUrl,
          type: pastedImage.file.type,
          size: pastedImage.file.size,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Verify we're still on the same card before committing changes
      if (currentCardIdRef.current !== targetCardId) {
        console.warn('Card changed during upload, aborting comment submission');
        toast.warning('O card foi alterado. Por favor, tente novamente.');
        return;
      }

      // Build comment body with all images
      const imageLinks = uploadedUrls.map((url, i) => `📷 [Imagem ${i + 1}](${url})`).join('\n');
      const commentBody = newComment.trim() 
        ? `${newComment.trim()}\n\n${imageLinks}`
        : imageLinks;

      await createComment.mutateAsync({
        card_id: targetCardId,
        body: commentBody,
      });

      // Use first image as cover
      await updateCard.mutateAsync({
        id: targetCardId,
        board_id: boardId,
        cover_image: uploadedUrls[0],
      });

      // Only update local state if still on same card
      if (currentCardIdRef.current === targetCardId) {
        setAttachments((prev) => [...prev, ...newAttachments]);
        setEditedCard((prev) => ({ ...prev, cover_image: uploadedUrls[0] }));
        setNewComment('');
        clearPastedImages();
      }
      
      toast.success(`${uploadedUrls.length} imagem(ns) adicionada(s)! Primeira definida como capa.`);
    } catch (error) {
      console.error('Error uploading pasted images:', error);
      toast.error('Erro ao enviar imagens');
    } finally {
      setIsUploadingPastedImages(false);
    }
  };

  const handleAddComment = async () => {
    // CRITICAL: Capture the card ID at the start
    const targetCardId = currentCardIdRef.current;
    if (!targetCardId) return;
    
    if (!newComment.trim() && pastedImages.length === 0) return;
    
    // If there are pasted images, use the images handler
    if (pastedImages.length > 0) {
      await handleAddCommentWithImages();
      return;
    }

    try {
      await createComment.mutateAsync({
        card_id: targetCardId,
        body: newComment.trim(),
      });
      // Only clear if still on same card
      if (currentCardIdRef.current === targetCardId) {
        setNewComment('');
      }
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const currentTags = editedCard.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      setEditedCard((prev) => ({ ...prev, tags: [...currentTags, newTag.trim()] }));
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditedCard((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const currentChecklist = editedCard.checklist || [];
    setEditedCard((prev) => ({
      ...prev,
      checklist: [...currentChecklist, { id: crypto.randomUUID(), text: newChecklistItem.trim(), done: false }],
    }));
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setEditedCard((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    }));
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setEditedCard((prev) => ({
      ...prev,
      checklist: (prev.checklist || []).filter((item) => item.id !== itemId),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-start gap-3">
            <Input
              value={editedCard.title || ''}
              onChange={(e) => setEditedCard((prev) => ({ ...prev, title: e.target.value }))}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 h-auto"
              placeholder="Título da tarefa"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="p-4 pt-0 space-y-4">
            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Column */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Coluna</Label>
                <Select
                  value={editedCard.column_id}
                  onValueChange={(value) => setEditedCard((prev) => ({ ...prev, column_id: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Prioridade</Label>
                <Select
                  value={editedCard.priority}
                  onValueChange={(value: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE') =>
                    setEditedCard((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAIXA">🔵 Baixa</SelectItem>
                    <SelectItem value="MEDIA">🟡 Média</SelectItem>
                    <SelectItem value="ALTA">🟠 Alta</SelectItem>
                    <SelectItem value="URGENTE">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Responsável</Label>
                <Select
                  value={editedCard.assigned_to_user_id || 'none'}
                  onValueChange={(value) =>
                    setEditedCard((prev) => ({ ...prev, assigned_to_user_id: value === 'none' ? null : value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguém</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Prazo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {editedCard.due_date ? format(new Date(editedCard.due_date), 'PPP', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={editedCard.due_date ? new Date(editedCard.due_date) : undefined}
                      onSelect={(date) =>
                        setEditedCard((prev) => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : null }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Client */}
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente</Label>
                <Select
                  value={editedCard.client_id || 'none'}
                  onValueChange={(value) =>
                    setEditedCard((prev) => ({ ...prev, client_id: value === 'none' ? null : value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Vincular cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
              <Textarea
                value={editedCard.description || ''}
                onChange={(e) => setEditedCard((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Adicionar descrição..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(editedCard.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nova tag..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="outline" size="sm" className="h-8" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Checklist</Label>
              <div className="space-y-1.5 mb-2">
                {(editedCard.checklist || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={() => handleToggleChecklistItem(item.id)}
                    />
                    <span className={cn('flex-1 text-sm', item.done && 'line-through text-muted-foreground')}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Novo item..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                />
                <Button variant="outline" size="sm" className="h-8" onClick={handleAddChecklistItem}>
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Anexos
              </Label>
              
              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
                      {attachment.type.startsWith('image/') ? (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        </a>
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                          {getFileIcon(attachment.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium truncate block hover:underline"
                        >
                          {attachment.name}
                        </a>
                        <span className="text-[10px] text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-primary p-1 transition-colors"
                        title="Baixar arquivo"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Force download by fetching and creating blob
                          fetch(attachment.url)
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = attachment.name;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            })
                            .catch(() => {
                              window.open(attachment.url, '_blank');
                            });
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveAttachment(attachment)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? 'Enviando...' : 'Adicionar arquivo'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Cover Image Preview */}
            {(editedCard.cover_image || card.cover_image) && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" />
                  Capa do Card
                </Label>
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={editedCard.cover_image || card.cover_image || ''} 
                    alt="Capa do card" 
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 text-xs"
                    onClick={() => setEditedCard((prev) => ({ ...prev, cover_image: null }))}
                  >
                    Remover capa
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Comments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentários
                <span className="text-[10px] ml-1 text-muted-foreground/70">(Cole imagens para anexar e definir capa)</span>
              </Label>
              
              <div className="space-y-3 mb-3">
                {comments?.map((comment) => {
                  // Extract all image URLs from the comment
                  const imageUrls = comment.body.match(/\((https?:\/\/[^)]+)\)/g)?.map(m => m.slice(1, -1)) || [];
                  const textContent = comment.body.split('\n\n📷')[0];
                  const hasImages = comment.body.includes('📷') && imageUrls.length > 0;

                  return (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={comment.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {comment.author?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">{comment.author?.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.created_at), 'dd MMM HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {hasImages ? (
                            <>
                              {textContent && <p className="mb-2">{textContent}</p>}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {imageUrls.map((url, idx) => (
                                  <a 
                                    key={idx}
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <img 
                                      src={url} 
                                      alt={`Imagem ${idx + 1}`} 
                                      className="max-h-24 rounded border border-border hover:opacity-80 transition-opacity"
                                    />
                                  </a>
                                ))}
                              </div>
                            </>
                          ) : (
                            comment.body
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pasted Images Preview */}
              {pastedImages.length > 0 && (
                <div className="mb-3 p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-wrap gap-2">
                      {pastedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img.preview} 
                            alt={`Imagem ${index + 1}`} 
                            className="h-16 w-16 object-cover rounded border border-border"
                          />
                          <button
                            onClick={() => removePastedImage(index)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <ImagePlus className="h-4 w-4 text-primary" />
                        {pastedImages.length} imagem(ns) pronta(s)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cole mais imagens ou clique em enviar. A primeira será a capa do card.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs mt-2 text-destructive hover:text-destructive"
                        onClick={clearPastedImages}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remover todas
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  ref={commentTextareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Escrever comentário ou colar imagens (Ctrl+V)..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
              <div className="flex justify-end mt-2 gap-2">
                {pastedImages.length > 0 ? (
                  <Button 
                    size="sm" 
                    onClick={handleAddCommentWithImages} 
                    disabled={isUploadingPastedImages}
                    className="gap-1.5"
                  >
                    {isUploadingPastedImages ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {isUploadingPastedImages ? 'Enviando...' : `Enviar ${pastedImages.length} imagem(ns)`}
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim() || createComment.isPending}>
                    Comentar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateCard.isPending}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
