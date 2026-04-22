import { Plus, FolderKanban, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ProjectsHeaderProps {
  onNewProject: () => void;
}

export function ProjectsHeader({ onNewProject }: ProjectsHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden"
    >
      {/* Futuristic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-violet-500/5 rounded-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent" />
      
      {/* Animated glow effect */}
      <div className="absolute top-0 left-1/4 w-96 h-32 bg-cyan-400/20 blur-3xl animate-pulse" />
      
      <div className="relative p-6 flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur-lg opacity-50" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text"
              >
                Projetos
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground"
              >
                ERP de acompanhamento — etapas, entregas, riscos e finanças
              </motion.p>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3"
        >
          <Button 
            variant="outline" 
            className="relative group overflow-hidden border-border/50 hover:border-cyan-500/50 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 group-hover:via-cyan-500/10 transition-all duration-300" />
            <FolderKanban className="w-4 h-4 mr-2" />
            Templates
          </Button>
          
          <Button 
            onClick={onNewProject}
            className="relative group overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">N</kbd>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
