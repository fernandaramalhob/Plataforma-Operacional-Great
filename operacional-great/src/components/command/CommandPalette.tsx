import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserPlus,
  ListPlus,
  CheckCircle,
  Search,
  Briefcase,
  Target,
  BarChart3,
  Settings,
  CheckSquare,
  Loader2,
} from 'lucide-react';

interface CommandAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  module?: 'COMERCIAL' | 'OPERACIONAL' | 'ALL';
  roles?: string[];
}

interface ExecCardResult {
  id: string;
  title: string;
  column_name: string;
  board_name: string;
  board_id: string;
  client_name?: string;
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const { user, getModule } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const currentModule = getModule();

  // Search exec_cards when user types
  const { data: cardResults = [], isLoading: isSearchingCards } = useQuery({
    queryKey: ['command-palette-cards', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
      const query = search.toLowerCase();
      
      // Search cards by title or client name
      const { data: cards, error } = await supabase
        .from('exec_cards')
        .select(`
          id,
          title,
          column_id,
          board_id,
          client_id,
          exec_columns!inner(name),
          exec_boards!inner(name),
          operational_clients(client_name)
        `)
        .or(`title.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error searching cards:', error);
        return [];
      }

      // Also search by client name
      const { data: clientCards, error: clientError } = await supabase
        .from('exec_cards')
        .select(`
          id,
          title,
          column_id,
          board_id,
          client_id,
          exec_columns!inner(name),
          exec_boards!inner(name),
          operational_clients!inner(client_name)
        `)
        .ilike('operational_clients.client_name', `%${query}%`)
        .limit(10);

      if (clientError) {
        console.error('Error searching cards by client:', clientError);
      }

      // Merge results and remove duplicates
      const allCards = [...(cards || []), ...(clientCards || [])];
      const uniqueCards = allCards.filter((card, index, self) => 
        index === self.findIndex(c => c.id === card.id)
      );

      return uniqueCards.map(card => ({
        id: card.id,
        title: card.title,
        column_name: (card.exec_columns as any)?.name || 'Sem coluna',
        board_name: (card.exec_boards as any)?.name || 'Sem quadro',
        board_id: card.board_id,
        client_name: (card.operational_clients as any)?.client_name,
      })) as ExecCardResult[];
    },
    enabled: isOpen && search.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });

  const actions: CommandAction[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Ir para Dashboard',
      icon: LayoutDashboard,
      action: () => navigate(currentModule === 'COMERCIAL' ? '/comercial/dashboard' : '/operacional/dashboard'),
      keywords: ['home', 'inicio', 'painel'],
      module: 'ALL',
    },
    {
      id: 'nav-pipeline',
      label: 'Ir para Pipeline',
      icon: Briefcase,
      action: () => navigate('/comercial/pipeline'),
      keywords: ['vendas', 'negociação'],
      module: 'COMERCIAL',
    },
    {
      id: 'nav-metas',
      label: 'Ir para Metas',
      icon: Target,
      action: () => navigate('/comercial/metas'),
      keywords: ['objetivos', 'goals'],
      module: 'COMERCIAL',
    },
    {
      id: 'nav-clientes',
      label: 'Ir para Clientes',
      icon: Users,
      action: () => navigate('/operacional/clientes'),
      keywords: ['customers', 'accounts'],
      module: 'OPERACIONAL',
    },
    {
      id: 'nav-execucao',
      label: 'Ir para Execução (ClickUp)',
      icon: CheckSquare,
      action: () => navigate('/operacional/execucao'),
      keywords: ['tarefas', 'kanban', 'clickup', 'cards'],
      module: 'OPERACIONAL',
    },
    {
      id: 'nav-tarefas',
      label: 'Ir para Tarefas',
      icon: ClipboardList,
      action: () => navigate('/operacional/tarefas'),
      keywords: ['tasks', 'kanban', 'backlog'],
      module: 'OPERACIONAL',
      roles: ['GESTOR', 'COORDENADOR_RED'],
    },
    {
      id: 'nav-performance',
      label: 'Ir para Performance',
      icon: BarChart3,
      action: () => navigate('/operacional/performance'),
      keywords: ['metrics', 'checkin'],
      module: 'OPERACIONAL',
    },
    {
      id: 'nav-coordenacao',
      label: 'Ir para Coordenação',
      icon: Settings,
      action: () => navigate('/operacional/coordenacao'),
      keywords: ['admin', 'configuração'],
      module: 'OPERACIONAL',
      roles: ['COORDENADOR_RED'],
    },

    // Quick Actions
    {
      id: 'action-create-client',
      label: 'Criar novo cliente',
      icon: UserPlus,
      action: () => {
        close();
        // TODO: Open create client modal
      },
      keywords: ['novo', 'adicionar', 'new'],
      module: 'COMERCIAL',
    },
    {
      id: 'action-create-task',
      label: 'Criar nova tarefa',
      icon: ListPlus,
      action: () => {
        close();
        // TODO: Open create task modal
      },
      keywords: ['novo', 'adicionar', 'task'],
      module: 'OPERACIONAL',
      roles: ['GESTOR', 'COORDENADOR_RED'],
    },
    {
      id: 'action-checkin',
      label: 'Fazer check-in de performance',
      icon: CheckCircle,
      action: () => {
        close();
        navigate('/operacional/performance');
      },
      keywords: ['performance', 'daily', 'registro'],
      module: 'OPERACIONAL',
    },
  ], [currentModule, navigate, close]);

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      // Module filter
      if (action.module !== 'ALL' && action.module !== currentModule) {
        return false;
      }

      // Role filter
      if (action.roles && user && !action.roles.includes(user.role)) {
        return false;
      }

      return true;
    });
  }, [actions, currentModule, user]);

  const navigationActions = filteredActions.filter(a => a.id.startsWith('nav-'));
  const quickActions = filteredActions.filter(a => a.id.startsWith('action-'));

  const handleCardSelect = (card: ExecCardResult) => {
    // Navigate to execução page with card ID to open the card modal
    navigate(`/operacional/execucao?cardId=${card.id}&boardId=${card.board_id}`);
    close();
  };

  const hasResults = cardResults.length > 0 || quickActions.length > 0 || navigationActions.length > 0;

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Logo variant="mark" size="sm" />
        <span className="text-sm text-muted-foreground">Command Palette</span>
      </div>
      <CommandInput
        placeholder="Buscar clientes, tarefas, ações..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            {isSearchingCards ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground/50 animate-spin" />
                <p className="text-sm text-muted-foreground">Buscando...</p>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              </>
            )}
          </div>
        </CommandEmpty>

        {/* Cards from ClickUp */}
        {cardResults.length > 0 && (
          <CommandGroup heading="Cards do ClickUp">
            {cardResults.map(card => (
              <CommandItem
                key={card.id}
                value={`card-${card.id}-${card.title}-${card.client_name || ''}`}
                onSelect={() => handleCardSelect(card)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <CheckSquare className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{card.board_name}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {card.column_name}
                    </Badge>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {cardResults.length > 0 && (quickActions.length > 0 || navigationActions.length > 0) && (
          <CommandSeparator />
        )}

        {quickActions.length > 0 && (
          <CommandGroup heading="Ações Rápidas">
            {quickActions.map(action => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.action();
                  close();
                }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {quickActions.length > 0 && navigationActions.length > 0 && (
          <CommandSeparator />
        )}

        {navigationActions.length > 0 && (
          <CommandGroup heading="Navegação">
            {navigationActions.map(action => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.action();
                  close();
                }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
