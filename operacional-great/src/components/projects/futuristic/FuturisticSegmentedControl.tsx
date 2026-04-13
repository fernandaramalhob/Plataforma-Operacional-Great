import { List, Layers, Calendar, BarChart3, KanbanSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ProjectView } from '@/types/projects';

interface FuturisticSegmentedControlProps {
  currentView: ProjectView;
  onViewChange: (view: ProjectView) => void;
}

const views: { id: ProjectView; label: string; icon: React.ElementType }[] = [
  { id: 'LIST', label: 'Lista', icon: List },
  { id: 'PIPELINE', label: 'Etapas', icon: Layers },
  { id: 'SCRUM', label: 'Scrum', icon: KanbanSquare },
  { id: 'TIMELINE', label: 'Timeline', icon: Calendar },
  { id: 'INSIGHTS', label: 'Insights', icon: BarChart3 },
];

export function FuturisticSegmentedControl({ currentView, onViewChange }: FuturisticSegmentedControlProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="relative"
    >
      {/* Glassmorphism container */}
      <div className="relative flex items-center gap-1 p-1.5 rounded-2xl glass-surface shadow-lg">
        {views.map((view, index) => {
          const Icon = view.icon;
          const isActive = currentView === view.id;
          
          return (
            <motion.button
              key={view.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              onClick={() => onViewChange(view.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 futuristic-focus",
                !isActive && "hover:bg-slate-100/80",
                isActive && "text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeViewBg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-400 shadow-lg shadow-red-500/25"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              
              {/* Preview glow on hover */}
              {!isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/8 to-red-400/8 opacity-0"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              
              <span className="relative z-10 flex items-center gap-2">
                <Icon className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
                <span className="hidden sm:inline">{view.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
