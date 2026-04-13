import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Trash2, 
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ImageIcon,
  X
} from 'lucide-react';
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

  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
        break;
      }
    }
  };

  // Process image file to data URL
  const processImageFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachedImages(prev => [...prev, {
        id: crypto.randomUUID(),
        dataUrl,
        file
      }]);
      toast.success('Imagem anexada');
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached image
  const removeImage = (id: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const imageDataUrls = attachedImages.map(img => img.dataUrl);
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    try {
      // Build message content for API - use any type for flexible content structure
      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      
      if (input.trim()) {
        userContent.push({ type: 'text', text: input.trim() });
      }
      
      for (const dataUrl of imageDataUrls) {
        userContent.push({
          type: 'image_url',
          image_url: { url: dataUrl }
        });
      }

      // Build messages array for API
      const messagesToSend: Array<{ role: string; content: unknown }> = messages.map(m => {
        if (m.images && m.images.length > 0) {
          const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          if (m.content) {
            content.push({ type: 'text', text: m.content });
          }
          for (const img of m.images) {
            content.push({ type: 'image_url', image_url: { url: img } });
          }
          return { role: m.role, content };
        }
        return { role: m.role, content: m.content };
      });

      // Add current message
      messagesToSend.push({
        role: 'user',
        content: userContent.length === 1 && userContent[0].type === 'text' 
          ? userContent[0].text! 
          : userContent
      });

      const { data, error } = await supabase.functions.invoke('analyst-ai-chat', {
        body: { messages: messagesToSend },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setAttachedImages([]);
    toast.success('Conversa limpa');
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold mt-3 mb-2 text-foreground">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold mt-2 mb-1 text-foreground">{line.slice(4)}</h3>;
      }
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-1">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="mb-1">{line}</p>;
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Agente Analista
              <Sparkles className="h-5 w-5 text-purple-500" />
            </h1>
            <p className="text-sm text-muted-foreground">
              IA especialista em diagnóstico e plano de ação
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar conversa
          </Button>
        )}
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary" className="gap-1">
          <Target className="h-3 w-3" />
          Diagnóstico
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          Plano de Ação
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Análise de Riscos
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          KPIs e Métricas
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <ImageIcon className="h-3 w-3" />
          Análise de Imagem
        </Badge>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Olá! Sou seu Agente Analista</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Descreva a situação do seu cliente ou projeto e eu irei fornecer:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span>Análise estruturada</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Diagnóstico com causa-raiz</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Plano de ação priorizado</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <span>Cole imagens (Ctrl+V)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {/* Show images if present */}
                      {message.images && message.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Anexo ${idx + 1}`}
                              className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {renderMarkdown(message.content)}
                        </div>
                      ) : (
                        message.content && <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      <span className="text-[10px] opacity-50 mt-1 block">
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      <span className="text-sm text-muted-foreground">Analisando...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Attached images preview */}
          {attachedImages.length > 0 && (
            <div className="border-t px-4 py-2 flex flex-wrap gap-2">
              {attachedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.dataUrl}
                    alt="Preview"
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              
              {/* Attach image button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-auto px-3 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Descreva a situação ou cole uma imagem (Ctrl+V)..."
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
                className="h-auto px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pressione Enter para enviar, Shift+Enter para nova linha. Cole imagens com Ctrl+V.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}