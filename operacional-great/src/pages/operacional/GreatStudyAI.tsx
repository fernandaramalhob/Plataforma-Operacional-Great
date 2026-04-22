import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BookOpen, Bot, Loader2, Send, Sparkles } from 'lucide-react';

interface StudyCategory {
  id: string;
  name: string;
  description: string | null;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function GreatStudyAI() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'CATEGORY_FOCUS' | 'GREAT_GENERAL'>('GREAT_GENERAL');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: categories = [] } = useQuery({
    queryKey: ['study-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('study_categories').select('id, name, description').order('name');
      if (error) throw error;
      return data as StudyCategory[];
    },
  });

  const activeCategory = categories.find((category) => category.id === selectedCategory) ?? null;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const nextMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('study-ai-chat', {
        body: {
          messages: nextMessages,
          mode,
          categoryName: mode === 'CATEGORY_FOCUS' && activeCategory ? activeCategory.name : null,
          categoryDescription: mode === 'CATEGORY_FOCUS' && activeCategory ? activeCategory.description : null,
        },
      });

      if (response.error) throw response.error;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data?.message || 'Não consegui responder agora. Tente de novo em instantes.' },
      ]);
    } catch {
      toast.error('Erro ao consultar a Great Study AI.');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Tive um problema para responder agora. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPrompt = (prompt: string) => setInput(prompt);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_36%),linear-gradient(180deg,#fffefe_0%,#f6f1f0_100%)]">
      <div className="border-b border-slate-200/80 px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-red-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Área de Estudos</span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950">Great Study AI</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Um chat dedicado para tirar dúvidas, resumir materiais e estudar como se fosse um GPT interno da Great.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant={mode === 'GREAT_GENERAL' ? 'default' : 'outline'} className={cn('h-12 rounded-2xl', mode === 'GREAT_GENERAL' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-slate-200 bg-white')} onClick={() => setMode('GREAT_GENERAL')}>
              <Bot className="mr-2 h-4 w-4" />
              Modo geral
            </Button>
            <Button variant={mode === 'CATEGORY_FOCUS' ? 'default' : 'outline'} className={cn('h-12 rounded-2xl', mode === 'CATEGORY_FOCUS' ? 'bg-red-500 text-white hover:bg-red-600' : 'border-slate-200 bg-white')} onClick={() => setMode('CATEGORY_FOCUS')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Foco por área
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[24px] border border-white/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sugestões rápidas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Monte um plano de estudo semanal', 'Crie um quiz sobre este tema', 'Resuma esse assunto em tópicos', 'Explique de forma simples para um iniciante'].map((prompt) => (
                <button key={prompt} type="button" onClick={() => applyPrompt(prompt)} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Área de foco</p>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="mt-3 h-12 rounded-2xl border-slate-200 bg-white">
                <SelectValue placeholder="Selecione uma área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-sm text-slate-500">
              {mode === 'CATEGORY_FOCUS'
                ? activeCategory?.description || 'Selecione uma área para a IA responder com mais contexto.'
                : 'No modo geral, a IA responde usando um contexto mais amplo da operação.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col rounded-[32px] border border-white/70 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <ScrollArea className="flex-1 px-6 py-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-red-50 text-red-500">
                  <Sparkles className="h-9 w-9" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-slate-950">Comece uma conversa</h2>
                <p className="mt-2 max-w-xl text-sm text-slate-500">
                  Faça perguntas sobre processos, peça resumos, monte exercícios ou use a IA para estudar materiais da Great.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={cn('max-w-3xl rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm', message.role === 'user' ? 'ml-auto bg-red-500 text-white' : 'bg-slate-100 text-slate-700')}>
                    {message.content}
                  </div>
                ))}
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-[24px] bg-slate-100 px-5 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pensando...
                  </div>
                ) : null}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-slate-100 p-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Pergunte qualquer coisa para a Great Study AI..."
                className="min-h-[110px] resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Enter envia. Shift + Enter quebra linha.</p>
                <Button className="h-11 rounded-2xl bg-red-500 px-5 text-white hover:bg-red-600" onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-bold text-slate-950">Como usar melhor</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Peça formatos específicos</p>
              <p className="mt-1">Exemplo: resumo, checklist, quiz, passo a passo ou plano semanal.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Use o modo por área</p>
              <p className="mt-1">Quando quiser respostas mais alinhadas a um tema da biblioteca interna.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Transforme materiais em estudo</p>
              <p className="mt-1">A IA pode explicar, testar retenção e sugerir aplicação prática no dia a dia.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
