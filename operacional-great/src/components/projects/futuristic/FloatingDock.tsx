import { Search, Filter, Plus, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRef, useState, useCallback } from 'react';

interface DockButtonProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  shortcut?: string;
}

function DockButton({ icon: Icon, label, onClick, shortcut }: DockButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          ref={buttonRef}
          onClick={onClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-xl",
            "bg-white/80 backdrop-blur-sm border border-slate-200/80",
            "shadow-lg hover:shadow-xl hover:ring-2 hover:ring-cyan-500/30 transition-all duration-200",
            "text-slate-600 hover:text-cyan-600",
            "futuristic-focus",
            isPressed && "translate-z-[-4px]"
          )}
          style={{
            transform: isPressed ? 'translateZ(-4px) scale(0.95)' : undefined,
          }}
        >
          <Icon className="w-5 h-5" />
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="left" className="glass-surface-strong">
        <p className="flex items-center gap-2">
          {label}
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 rounded">
              {shortcut}
            </kbd>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface FloatingDockProps {
  onSearch?: () => void;
  onFilter?: () => void;
  onQuickAdd?: () => void;
  onHelp?: () => void;
}

export function FloatingDock({ onSearch, onFilter, onQuickAdd, onHelp }: FloatingDockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="fixed right-6 bottom-6 z-50"
    >
      <div className="flex flex-col gap-2 p-2 rounded-2xl glass-surface shadow-2xl shadow-slate-900/10">
        <DockButton icon={Search} label="Buscar" onClick={onSearch} shortcut="⌘K" />
        <DockButton icon={Filter} label="Filtros" onClick={onFilter} shortcut="F" />
        <DockButton icon={Plus} label="Adicionar" onClick={onQuickAdd} shortcut="N" />
        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />
        <DockButton icon={HelpCircle} label="Ajuda" onClick={onHelp} shortcut="?" />
      </div>
    </motion.div>
  );
}
