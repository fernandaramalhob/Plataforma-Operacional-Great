import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const CYCLE: Array<'light' | 'dark'> = ['light', 'dark'];

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  function handleClick() {
    const current = CYCLE.indexOf((theme as any) ?? 'light');
    const next = CYCLE[(current + 1) % CYCLE.length];
    setTheme(next);
  }

  const icon =
    theme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      className="text-muted-foreground hover:text-foreground transition-all"
      title={theme === 'dark' ? 'Escuro' : 'Claro'}
    >
      {icon}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
