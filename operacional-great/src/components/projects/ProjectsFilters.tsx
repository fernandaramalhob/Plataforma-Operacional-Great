import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectFilters, ProjectStatus, ProjectPriority, ProjectTeam } from '@/types/projects';

interface ProjectsFiltersProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
}

export function ProjectsFilters({ filters, onFiltersChange }: ProjectsFiltersProps) {
  const hasActiveFilters = filters.status !== 'ALL' || filters.team !== 'ALL' || filters.priority !== 'ALL' || filters.search;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'ALL',
      team: 'ALL',
      priority: 'ALL',
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap items-center gap-3"
    >
      {/* Search with glow effect */}
      <div className="relative group flex-1 min-w-[280px] max-w-md">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projeto, cliente, responsável..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-cyan-500/50 transition-all duration-300"
          />
        </div>
      </div>

      {/* Status filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value as ProjectStatus | 'ALL' })}
      >
        <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-cyan-500/30 transition-colors">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os status</SelectItem>
          <SelectItem value="PLANEJADO">Planejado</SelectItem>
          <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
          <SelectItem value="EM_RISCO">Em Risco</SelectItem>
          <SelectItem value="PAUSADO">Pausado</SelectItem>
          <SelectItem value="CONCLUIDO">Concluído</SelectItem>
          <SelectItem value="CANCELADO">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      {/* Team filter */}
      <Select
        value={filters.team}
        onValueChange={(value) => onFiltersChange({ ...filters, team: value as ProjectTeam | 'ALL' })}
      >
        <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-cyan-500/30 transition-colors">
          <SelectValue placeholder="Equipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas as equipes</SelectItem>
          <SelectItem value="TIME_7">Time 7</SelectItem>
          <SelectItem value="TROPA_DE_ELITE">Tropa de Elite</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={filters.priority}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value as ProjectPriority | 'ALL' })}
      >
        <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-sm border-border/50 hover:border-cyan-500/30 transition-colors">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas</SelectItem>
          <SelectItem value="BAIXA">Baixa</SelectItem>
          <SelectItem value="MEDIA">Média</SelectItem>
          <SelectItem value="ALTA">Alta</SelectItem>
          <SelectItem value="CRITICA">Crítica</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
