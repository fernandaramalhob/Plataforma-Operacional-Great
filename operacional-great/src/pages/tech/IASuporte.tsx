import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  MessageSquare,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

const SUGGESTIONS = [
  'Como criar um prompt eficiente para vendas?',
  'Audite este prompt e sugira melhorias',
  'Preciso de um fluxo de atendimento para clínica estética',
  'Como estruturar um prompt de onboarding?',
  'Crie um protocolo para suporte técnico',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai-chat`;

export default function IASuporte() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const maxFiles = 10;
    const maxSize = 20 * 1024 * 1024; // 20MB

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;

    if (attachments.length + imageItems.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (!file) return;

      if (file.size > maxSize) {
        toast.error(`Imagem excede 20MB`);
        return;
      }

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: 'image',
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        attachment.preview = e.target?.result as string;
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });

    // Prevent default paste behavior for images
    e.preventDefault();
  };

  const streamChat = async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        throw new Error(errorData.error || "Limite de requisições excedido. Tente novamente mais tarde.");
      }
      if (resp.status === 402) {
        throw new Error(errorData.error || "Créditos insuficientes. Adicione créditos ao workspace.");
      }
      throw new Error(errorData.error || "Erro ao conectar com a IA");
    }

    if (!resp.body) throw new Error("Sem resposta do servidor");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: assistantSoFar,
                timestamp: new Date(),
              }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: assistantSoFar,
                timestamp: new Date(),
              }];
            });
          }
        } catch { /* ignore partial leftovers */ }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxFiles = 10;
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (attachments.length + files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} excede 20MB`);
        return;
      }

      const isImage = file.type.startsWith('image/');
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'file',
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, attachment]);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

    // Build content with attachments info
    let messageContent = inputValue;
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(a => 
        `[Anexo: ${a.file.name} (${a.type === 'image' ? 'imagem' : 'arquivo'})]`
      ).join('\n');
      messageContent = attachmentInfo + (inputValue ? '\n\n' + inputValue : '');
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    setMessages([]);
    setAttachments([]);
    toast.info('Nova conversa iniciada');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">IA de Suporte</h1>
              <p className="text-muted-foreground text-sm">Engenheiro de Prompt Sênior - Assistente especializado</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleNewChat} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Nova conversa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Conversa
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Engenheiro de Prompt Sênior</h3>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                  Especializado em criar, auditar e otimizar prompts avançados. 
                  Posso adaptar estruturas para qualquer área e gerar protocolos modulares completos.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
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
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      'max-w-[70%] rounded-2xl p-4',
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted rounded-bl-md'
                    )}>
                      {/* Attachments preview */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.attachments.map(att => (
                            <div key={att.id} className="relative">
                              {att.type === 'image' && att.preview ? (
                                <img 
                                  src={att.preview} 
                                  alt={att.file.name}
                                  className="h-20 w-20 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="h-16 px-3 flex items-center gap-2 bg-background/50 rounded-lg border">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-xs truncate max-w-[100px]">{att.file.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] opacity-70">
                          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {message.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(message.content, message.id)}
                            className="h-6 w-6"
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
                {attachments.map(att => (
                  <div key={att.id} className="relative group">
                    {att.type === 'image' && att.preview ? (
                      <img 
                        src={att.preview} 
                        alt={att.file.name}
                        className="h-16 w-16 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="h-16 px-3 flex items-center gap-2 bg-background rounded-lg border">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs truncate max-w-[80px]">{att.file.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.xml,.csv"
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-[60px] w-[60px] shrink-0"
                title="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPaste={handlePaste}
                placeholder="Digite sua dúvida sobre prompts, fluxos ou protocolos... (Ctrl+V para colar imagens)"
                className="min-h-[60px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                onClick={handleSend} 
                disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                className="h-[60px] px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <Paperclip className="h-3 w-3 inline mr-1" />
              Arraste arquivos ou clique no ícone para anexar (máx. 10 arquivos, 20MB cada)
            </p>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Sugestões rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSuggestion(suggestion)}
                  className="w-full justify-start text-xs h-auto py-2 px-3 text-left"
                >
                  {suggestion}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                ● Online
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Engenheiro de Prompt Sênior configurado e pronto para criar, auditar e otimizar prompts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Capacidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Criar prompts avançados com XML</p>
              <p>• Auditar e otimizar prompts existentes</p>
              <p>• Gerar frameworks para fluxos variáveis</p>
              <p>• Adaptar para qualquer nicho</p>
              <p>• Protocolos modulares em estágios</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
