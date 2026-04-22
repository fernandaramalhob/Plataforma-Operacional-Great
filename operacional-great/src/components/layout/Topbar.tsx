import { Search, Command, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { open } = useCommandPalette();

  return (
    <header className="great-panel flex items-center gap-3 px-3 py-3 md:px-5">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        className="h-11 w-11 rounded-2xl border border-black/10 bg-white/80 text-foreground shadow-sm hover:bg-white md:hidden"
      >
        <PanelLeftOpen className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      <Button
        variant="ghost"
        onClick={open}
        className="h-12 flex-1 justify-start rounded-2xl border border-black/8 bg-white/85 px-4 text-left text-muted-foreground shadow-sm hover:bg-white md:max-w-[560px]"
      >
        <Search className="mr-3 h-4 w-4 shrink-0" />
        <span className="truncate text-sm md:text-base">Buscar clientes, tarefas, equipes...</span>
        <span className="ml-auto hidden items-center gap-1 rounded-xl border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary md:inline-flex">
          <Command className="h-3 w-3" />K
        </span>
      </Button>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <NotificationsPopover buttonClassName="h-11 w-11 rounded-2xl border border-black/8 bg-white/85 shadow-sm hover:bg-white" />
        <div className="hidden h-8 w-px bg-black/10 md:block" />
        <ThemeToggle className="h-11 w-11 rounded-2xl border border-black/8 bg-white/85 shadow-sm hover:bg-white" />
      </div>
    </header>
  );
}
