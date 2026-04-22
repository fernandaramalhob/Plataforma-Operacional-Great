import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Trash2, Sparkles, Target, TrendingUp, AlertTriangle, CheckCircle2, MessageSquare, ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageAttachment {
  id: string;
  dataUrl: string;
  file?: File;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: Date;
}

export default function AgenteAnalista() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        break;
      }
    }
  };

  const processImageFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo de 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachedImages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl, file }]);
      toast.success('Imagem anexada');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) processImageFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => setAttachedImages((prev) => prev.filter((img) => img.id !== id));

  const sendMessage = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;
    const imageDataUrls = attachedImages.map((img) => img.dataUrl);
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), images: imageDataUrls.length > 0 ? imageDataUrls : undefined, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    try {
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (input.trim()) userContent.push({ type: 'text', text: input.trim() });
      for (const dataUrl of imageDataUrls) userContent.push({ type: 'image_url', image_url: { url: dataUrl } });

      const messagesToSend: Array<{ role: string; content: unknown }> = messages.map((m) => {
        if (m.images && m.images.length > 0) {
          const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          if (m.content) content.push({ type: 'text', text: m.content });
          for (const img of m.images) content.push({ type: 'image_url', image_url: { url: img } });
          return { role: m.role, content };
        }
        return { role: m.role, content: m.content };
      });

      messagesToSend.push({ role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? userContent[0].text! : userContent });

      const { data, error } = await supabase.functions.invoke('analyst-ai-chat', { body: { messages: messagesToSend } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.message, timestamp: new Date() }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="mb-2 mt-4 text-xl font-bold text-foreground">{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="mb-2 mt-3 text-lg font-semibold text-foreground">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="mb-1 mt-2 text-base font-semibold text-foreground">{line.slice(4)}</h3>;
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return <p key={i} className="mb-1">{parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}</p>;
      }
      if (line.startsWith('- ')) return <li key={i} className="mb-1 ml-4">{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="mb-1">{line}</p>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-red-400 shadow-lg shadow-primary/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">Agente Analista<Sparkles className="h-5 w-5 text-primary" /></h1>
            <p className="text-sm text-muted-foreground">IA especialista em diagnóstico e plano de ação</p>
          </div>
        </div>
        {messages.length > 0 && <Button variant="outline" size="sm" onClick={() => { setMessages([]); setAttachedImages([]); toast.success('Conversa limpa'); }} className="gap-2"><Trash2 className="h-4 w-4" />Limpar conversa</Button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ icon: Target, label: 'Diagnóstico' }, { icon: TrendingUp, label: 'Plano de ação' }, { icon: AlertTriangle, label: 'Análise de riscos' }, { icon: CheckCircle2, label: 'KPIs e métricas' }, { icon: ImageIcon, label: 'Análise de imagem' }].map(({ icon: Icon, label }) => (
          <Badge key={label} variant="secondary" className="gap-1 border border-primary/10 bg-primary/5 text-primary"><Icon className="h-3 w-3" />{label}</Badge>
        ))}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-red-300/10"><MessageSquare className="h-10 w-10 text-primary" /></div>
                <h3 className="mb-2 text-xl font-semibold">Olá! Sou seu Agente Analista</h3>
                <p className="mb-6 max-w-md text-muted-foreground">Descreva a situação do seu cliente ou projeto e eu irei fornecer:</p>
                <div className="grid max-w-lg grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><Target className="h-4 w-4 text-primary" /><span>Análise estruturada</span></div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" /><span>Diagnóstico com causa-raiz</span></div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><TrendingUp className="h-4 w-4 text-green-500" /><span>Plano de ação priorizado</span></div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><ImageIcon className="h-4 w-4 text-blue-500" /><span>Cole imagens (Ctrl+V)</span></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-gradient-to-br from-primary to-red-400 text-white"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>}
                    <div className={cn('max-w-[80%] rounded-2xl px-4 py-3', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {message.images && message.images.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{message.images.map((img, idx) => <img key={idx} src={img} alt={`Anexo ${idx + 1}`} className="max-h-[150px] max-w-[200px] rounded-lg object-cover" />)}</div>}
                      {message.role === 'assistant' ? <div className="prose prose-sm max-w-none dark:prose-invert">{renderMarkdown(message.content)}</div> : message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                      <span className="mt-1 block text-[10px] opacity-50">{message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {message.role === 'user' && <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-primary/10 text-primary"><User className="h-4 w-4" /></AvatarFallback></Avatar>}
                  </div>
                ))}
                {isLoading && <div className="flex gap-3"><Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-gradient-to-br from-primary to-red-400 text-white"><Bot className="h-4 w-4" /></AvatarFallback></Avatar><div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Analisando...</span></div></div>}
              </div>
            )}
          </ScrollArea>

          {attachedImages.length > 0 && <div className="flex flex-wrap gap-2 border-t px-4 py-2">{attachedImages.map((img) => <div key={img.id} className="group relative"><img src={img.dataUrl} alt="Preview" className="h-16 w-16 rounded-lg border object-cover" /><button onClick={() => removeImage(img.id)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3" /></button></div>)}</div>}

          <div className="border-t p-4">
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="icon" className="h-auto shrink-0 px-3" onClick={() => fileInputRef.current?.click()} disabled={isLoading}><ImageIcon className="h-5 w-5" /></Button>
              <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} onPaste={handlePaste} placeholder="Descreva a situação ou cole uma imagem (Ctrl+V)..." className="min-h-[60px] max-h-[200px] resize-none" disabled={isLoading} />
              <Button onClick={sendMessage} disabled={(!input.trim() && attachedImages.length === 0) || isLoading} className="h-auto bg-gradient-to-r from-primary to-red-400 px-4 hover:from-primary/90 hover:to-red-500">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Pressione Enter para enviar, Shift+Enter para nova linha. Cole imagens com Ctrl+V.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
