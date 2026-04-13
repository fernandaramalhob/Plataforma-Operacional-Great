import { List, Layers, Calendar, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ProjectView } from '@/types/projects';

interface ProjectsViewNavProps {
  currentView: ProjectView;
  onViewChange: (view: ProjectView) => void;
}

const views: { id: ProjectView; label: string; icon: React.ElementType }[] = [
  { id: 'LIST', label: 'Lista', icon: List },
  { id: 'PIPELINE', label: 'Etapas', icon: Layers },
  { id: 'TIMELINE', label: 'Timeline', icon: Calendar },
  { id: 'FINANCE', label: 'Financeiro', icon: DollarSign },
  { id: 'RISKS', label: 'Riscos', icon: AlertTriangle },
  { id: 'INSIGHTS', label: 'Insights', icon: BarChart3 },
];

export function ProjectsViewNav({ currentView, onViewChange }: ProjectsViewNavProps) {
  return (
    <div className="relative">
      {/* Glassmorphism container */}
      <div className="relative flex items-center gap-1 p-1.5 rounded-xl bg-background/50 backdrop-blur-xl border border-border/50 shadow-lg">
        {views.map((view, index) => {
          const Icon = view.icon;
          const isActive = currentView === view.id;
          
          return (
            <motion.button
              key={view.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onViewChange(view.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-muted/50",
                isActive && "text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeViewBg"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
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
    </div>
  );
}
