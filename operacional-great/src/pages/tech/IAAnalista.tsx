import { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Brain,
  LineChart,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ANALYSIS_PROMPTS = [
  'Analise o desempenho da equipe Tech neste mês',
  'Quais são os principais gargalos de produtividade?',
  'Sugira melhorias para o processo de deploy',
  'Compare a velocidade de entrega entre sprints',
  'Identifique padrões de bugs recorrentes',
];

const INSIGHTS = [
  { type: 'success', title: 'Entregas acima da meta', description: '+15% de tarefas concluídas este mês' },
  { type: 'warning', title: 'Bugs em alta', description: '3 bugs críticos pendentes' },
  { type: 'info', title: 'Oportunidade', description: 'Automação pode reduzir 30% do tempo em QA' },
];

export default function IAAnalista() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulated response - will be replaced with actual AI call
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Esta é uma resposta simulada. Aguarde a configuração do prompt real para análises personalizadas da IA Analista.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handlePrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    setMessages([]);
    toast.info('Nova análise iniciada');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">IA Analista</h1>
              <p className="text-muted-foreground text-sm">Análises inteligentes e insights de produtividade</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleNewChat} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Nova análise
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Análise
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Olá! Sou a IA Analista</h3>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                  Posso analisar dados de produtividade, identificar padrões, sugerir melhorias 
                  e fornecer insights para otimizar os processos do setor Tech.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {ANALYSIS_PROMPTS.slice(0, 3).map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrompt(prompt)}
                      className="text-xs"
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      {prompt}
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
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      'max-w-[70%] rounded-2xl p-4',
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted rounded-bl-md'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] opacity-70">
                          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {message.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
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
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analisando dados...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="O que você quer analisar?"
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
                disabled={!inputValue.trim() || isLoading}
                className="h-[60px] px-6 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Análises sugeridas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ANALYSIS_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePrompt(prompt)}
                  className="w-full justify-start text-xs h-auto py-2 px-3 text-left"
                >
                  <LineChart className="h-3 w-3 mr-2 shrink-0" />
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Insights recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {INSIGHTS.map((insight, index) => (
                <div 
                  key={index}
                  className={cn(
                    'p-3 rounded-lg border',
                    insight.type === 'success' && 'bg-green-500/5 border-green-500/20',
                    insight.type === 'warning' && 'bg-amber-500/5 border-amber-500/20',
                    insight.type === 'info' && 'bg-blue-500/5 border-blue-500/20',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'success' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {insight.type === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    {insight.type === 'info' && <Target className="h-3 w-3 text-blue-500" />}
                    <span className="text-xs font-medium">{insight.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
                ● Online
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                IA configurada para análises de produtividade e insights do setor Tech.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}