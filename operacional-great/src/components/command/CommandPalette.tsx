import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Bot,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Crown,
  LayoutDashboard,
  Loader2,
  Search,
  Users,
} from "lucide-react";

interface CommandAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: cardResults = [], isLoading: isSearchingCards } = useQuery({
    queryKey: ["command-palette-cards", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const query = search.toLowerCase();

      const { data: cards, error } = await supabase
        .from("exec_cards")
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
        console.error("Error searching cards:", error);
        return [];
      }

      const { data: clientCards, error: clientError } = await supabase
        .from("exec_cards")
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
        .ilike("operational_clients.client_name", `%${query}%`)
        .limit(10);

      if (clientError) {
        console.error("Error searching cards by client:", clientError);
      }

      const allCards = [...(cards || []), ...(clientCards || [])];
      const uniqueCards = allCards.filter(
        (card, index, self) => index === self.findIndex((current) => current.id === card.id),
      );

      return uniqueCards.map((card) => ({
        id: card.id,
        title: card.title,
        column_name: (card.exec_columns as any)?.name || "Sem coluna",
        board_name: (card.exec_boards as any)?.name || "Sem quadro",
        board_id: card.board_id,
        client_name: (card.operational_clients as any)?.client_name,
      })) as ExecCardResult[];
    },
    enabled: isOpen && search.length >= 2,
    staleTime: 1000 * 30,
  });

  const actions: CommandAction[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Ir para Dashboard",
        icon: LayoutDashboard,
        action: () => navigate("/operacional/dashboard"),
      },
      {
        id: "nav-clientes",
        label: "Ir para CRM Operacional",
        icon: Users,
        action: () => navigate("/operacional/crm"),
      },
      {
        id: "nav-execucao",
        label: "Ir para Execucao",
        icon: CheckSquare,
        action: () => navigate("/operacional/execucao"),
      },
      {
        id: "nav-meu-dia",
        label: "Ir para Meu Dia",
        icon: ClipboardList,
        action: () => navigate("/operacional/meu-dia"),
      },
      {
        id: "nav-reunioes",
        label: "Ir para Reunioes",
        icon: CalendarDays,
        action: () => navigate("/operacional/reunioes"),
      },
      {
        id: "nav-ranking",
        label: "Ir para Ranking das Equipes",
        icon: Crown,
        action: () => navigate("/operacional/inteligencia"),
      },
      {
        id: "nav-estudos",
        label: "Ir para Area de Estudos",
        icon: BookOpen,
        action: () => navigate("/operacional/area-estudo"),
      },
      {
        id: "nav-study-ai",
        label: "Abrir Great Study AI",
        icon: Bot,
        action: () => navigate("/operacional/great-study-ai"),
      },
    ],
    [navigate],
  );

  const handleCardSelect = (card: ExecCardResult) => {
    navigate(`/operacional/execucao?cardId=${card.id}&boardId=${card.board_id}`);
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Logo variant="mark" size="sm" />
        <span className="text-sm text-muted-foreground">Busca operacional</span>
      </div>
      <CommandInput
        placeholder="Buscar clientes, cards, reunioes e paginas..."
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

        {cardResults.length > 0 && (
          <CommandGroup heading="Cards da execucao">
            {cardResults.map((card) => (
              <CommandItem
                key={card.id}
                value={`card-${card.id}-${card.title}-${card.client_name || ""}`}
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

        {cardResults.length > 0 && actions.length > 0 && <CommandSeparator />}

        <CommandGroup heading="Navegacao">
          {actions.map((action) => (
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
      </CommandList>
    </CommandDialog>
  );
}
