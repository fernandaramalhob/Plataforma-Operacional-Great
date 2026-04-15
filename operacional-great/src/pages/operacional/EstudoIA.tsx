import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  ClipboardList,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const QUICK_PROMPTS = [
  "Resuma o processo ideal de onboarding operacional.",
  "Monte um checklist de alinhamento para reunioes com clientes.",
  "Crie um plano de estudo para dominar execucao e CRM operacional.",
  "Explique como priorizar tarefas urgentes no operacional.",
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function EstudoIA() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((conversation) => conversation.id === activeConvId) ?? null;
  const messages = activeConv?.messages ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function createNewConversation() {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      title: "Nova conversa",
      messages: [],
      createdAt: new Date(),
    };

    setConversations((prev) => [conversation, ...prev]);
    setActiveConvId(id);
    setInput("");
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((conversation) => conversation.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    let conversationId = activeConvId;

    if (!conversationId) {
      conversationId = crypto.randomUUID();
      const newConversation: Conversation = {
        id: conversationId,
        title: content.slice(0, 42),
        messages: [],
        createdAt: new Date(),
      };

      setConversations((prev) => [newConversation, ...prev]);
      setActiveConvId(conversationId);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;

        const updatedMessages = [...conversation.messages, userMessage];
        return {
          ...conversation,
          title: conversation.messages.length === 0 ? content.slice(0, 42) : conversation.title,
          messages: updatedMessages,
        };
      }),
    );

    setInput("");
    setIsLoading(true);

    try {
      const currentConversation = conversations.find((conversation) => conversation.id === conversationId);
      const history = (currentConversation?.messages ?? []).map((message) => ({
        role: message.role,
        content: message.content,
      }));

      history.push({ role: "user", content });

      const { data, error } = await supabase.functions.invoke("study-ai-chat", {
        body: {
          messages: history,
          mode: "CATEGORY_FOCUS",
          categoryName: "Operacional",
          categoryDescription:
            "Processos, reunioes, execucao, CRM e rotina do setor operacional da empresa.",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message ?? data.reply ?? "Sem resposta.",
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: [...conversation.messages, assistantMessage] }
            : conversation,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="min-h-[calc(100vh-8.5rem)] overflow-hidden rounded-[28px] border border-border bg-card shadow-card">
      <div className="grid h-full min-h-[calc(100vh-8.5rem)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-sidebar-background lg:border-b-0 lg:border-r lg:border-sidebar-border">
          <div className="space-y-3 border-b border-sidebar-border p-4">
            <button
              onClick={() => navigate("/operacional/area-estudo")}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para conteudos
            </button>

            <Button className="w-full justify-start gap-2" onClick={createNewConversation}>
              <Plus className="h-4 w-4" />
              Nova conversa
            </Button>
          </div>

          <ScrollArea className="h-[240px] lg:h-[calc(100vh-14rem)]">
            <div className="space-y-1 p-2">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/70 p-4 text-sm text-muted-foreground">
                  Comece uma conversa para estudar processos operacionais com a IA.
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConvId(conversation.id)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left transition-colors",
                      activeConvId === conversation.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{conversation.title}</span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section className="flex min-w-0 flex-col bg-background">
          <header className="border-b border-border bg-card/90 px-6 py-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Great Study AI</h1>
                <p className="text-sm text-muted-foreground">
                  Assistente focado no setor operacional.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/20 bg-primary/10 text-primary">
                Operacional
              </Badge>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/12 shadow-sm">
                  <Sparkles className="h-9 w-9 text-primary" />
                </div>
                <h2 className="mb-3 text-3xl font-semibold text-foreground">
                  Estudo operacional com contexto do site
                </h2>
                <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
                  Use esta IA para revisar rotina operacional, CRM, reunioes, execucao,
                  onboarding e priorizacao de tarefas.
                </p>

                <div className="grid w-full max-w-3xl gap-3 md:grid-cols-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-2xl border border-border bg-card px-4 py-4 text-left text-sm text-foreground transition-all hover:border-primary/30 hover:bg-surface-2"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[72%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border text-foreground rounded-bl-md",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          "mt-2 text-[11px]",
                          message.role === "user"
                            ? "text-primary-foreground/70 text-right"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>

                    {message.role === "user" && (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-[24px] rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card px-4 py-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-[26px] border border-border bg-background p-3 shadow-sm transition-colors focus-within:border-primary/40">
                <div className="flex items-end gap-3">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte sobre rotina, reunioes, CRM, onboarding ou execucao..."
                    className="min-h-[72px] flex-1 resize-none border-0 bg-transparent p-0 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="h-11 w-11 rounded-2xl"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                Revise informacoes importantes antes de aplicar em clientes ou processos.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
