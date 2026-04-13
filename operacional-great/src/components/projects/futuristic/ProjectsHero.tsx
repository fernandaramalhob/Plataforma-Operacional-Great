import { Plus, FolderKanban, Sparkles, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useMemo, useRef, useState, useCallback } from 'react';
import type { Project } from '@/types/projects';

interface ProjectsHeroProps {
  projects: Project[];
  onNewProject: () => void;
}

interface MetaPillProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color: 'red' | 'amber' | 'emerald';
}

function MetaPill({ icon: Icon, label, count, color }: MetaPillProps) {
  const colorClasses = {
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClasses[color]} text-sm font-medium`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span className="font-bold tabular-nums">{count}</span>
    </motion.div>
  );
}

function MagneticButton({ 
  children, 
  onClick, 
  className 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [magneticPos, setMagneticPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.15;
    const deltaY = (e.clientY - centerY) * 0.15;
    setMagneticPos({ x: Math.max(-10, Math.min(10, deltaX)), y: Math.max(-10, Math.min(10, deltaY)) });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMagneticPos({ x: 0, y: 0 });
  }, []);

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${magneticPos.x}px, ${magneticPos.y}px)`,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export function ProjectsHero({ projects, onNewProject }: ProjectsHeroProps) {
  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === 'EM_ANDAMENTO').length;
    const atRisk = projects.filter(p => p.status === 'EM_RISCO' || p.risks_count > 0).length;
    const completed = projects.filter(p => p.status === 'CONCLUIDO').length;
    return { active, atRisk, completed };
  }, [projects]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Glass background */}
      <div className="glass-surface-strong rounded-2xl p-8">
        {/* Scanline texture */}
        <div className="absolute inset-0 scanline rounded-2xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Title + Meta */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <motion.div 
                className="relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl blur-lg opacity-40" />
                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-4xl font-bold tracking-tight"
                >
                  <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                    Projetos
                  </span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground mt-1"
                >
                  ERP de acompanhamento — etapas, entregas, riscos e finanças
                </motion.p>
              </div>
            </div>

            {/* Meta Pills */}
            <motion.div 
              className="flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <MetaPill icon={CheckCircle} label="Ativos" count={stats.active} color="red" />
              <MetaPill icon={AlertTriangle} label="Em Risco" count={stats.atRisk} color="amber" />
              <MetaPill icon={Clock} label="Concluídos" count={stats.completed} color="emerald" />
            </motion.div>
          </div>

          {/* Right: Actions */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-3"
          >
            <Button 
              variant="outline" 
              className="relative group overflow-hidden border-slate-200 hover:border-red-500/50 transition-all duration-300 bg-white/50 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 group-hover:via-red-500/10 transition-all duration-300" />
              <FolderKanban className="w-4 h-4 mr-2" />
              Templates
            </Button>
            
            <MagneticButton
              onClick={onNewProject}
              className="relative group overflow-hidden px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
              <Plus className="w-4 h-4" />
              Novo Projeto
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">N</kbd>
            </MagneticButton>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
