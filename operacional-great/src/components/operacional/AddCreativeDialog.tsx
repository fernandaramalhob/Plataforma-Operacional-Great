import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, Loader2, FileIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DESIGNERS } from '@/hooks/useClientActivityTracking';
import { getWeekOfMonth } from 'date-fns';

interface AddCreativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function AddCreativeDialog({ open, onOpenChange, clientId, clientName }: AddCreativeDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [responsavelArte, setResponsavelArte] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  const upsertActivityTracking = async (designerName: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const week = getWeekOfMonth(now);
    const { data: userData } = await supabase.auth.getUser();

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

  const addCreative = useMutation({
    mutationFn: async () => {
      if (!user || selectedFiles.length === 0) throw new Error('Selecione pelo menos um arquivo');
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
        client_name: clientName,
        client_id: clientId,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        created_by_user_id: user.id,
        created_by_name: responsavelArte || user.name,
        status: 'PARA_SUBIR',
      });
      if (error) throw error;

      if (responsavelArte) {
        try {
          await upsertActivityTracking(responsavelArte);
        } catch (e) {
          console.error('Error updating activity tracking:', e);
        }
      }
    },
    onSuccess: () => {
      toast.success('Criativo adicionado com sucesso!');
      onOpenChange(false);
      setSelectedFiles([]);
      setResponsavelArte('');
      queryClient.invalidateQueries({ queryKey: ['ad-creatives'] });
      queryClient.invalidateQueries({ queryKey: ['client-activity-tracking'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao adicionar: ' + err.message);
    },
    onSettled: () => setIsUploading(false),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setResponsavelArte('');
    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Criativo — {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Designer select */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Responsável pela Arte</label>
            <Select value={responsavelArte} onValueChange={setResponsavelArte}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o designer" />
              </SelectTrigger>
              <SelectContent>
                {DESIGNERS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload area */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Arquivos (fotos, vídeos, áudios)</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-20 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para selecionar arquivos</span>
              </div>
            </Button>
          </div>

          {/* File previews */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="relative group rounded-lg border border-border overflow-hidden aspect-square bg-muted/30 flex items-center justify-center">
                  {previewUrls[idx] && file.type.startsWith('image/') ? (
                    <img src={previewUrls[idx]} alt="" className="w-full h-full object-cover" />
                  ) : previewUrls[idx] && file.type.startsWith('video/') ? (
                    <video src={previewUrls[idx]} className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-background/80 text-[10px] px-1 py-0.5 truncate">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            onClick={() => addCreative.mutate()}
            disabled={isUploading || selectedFiles.length === 0 || !responsavelArte}
          >
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
