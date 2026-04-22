import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Flame
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import type { Project, ProjectPriority, ProjectStatus } from '@/types/projects';

interface ProjectWithScore extends Project {
  impactScore: number;
  scoreBreakdown: {
    priority: number;
    status: number;
    deadline: number;
    progress: number;
    budget: number;
  };
}

interface ProjectsFocusPanelProps {
  projects: Project[];
  onOpenProject?: (project: Project) => void;
}

// Calculate impact score for a project (0-10)
function calculateImpactScore(project: Project): ProjectWithScore {
  const breakdown = {
    priority: 0,
    status: 0,
    deadline: 0,
    progress: 0,
    budget: 0,
  };

  // Priority score (0-3)
  const priorityScores: Record<ProjectPriority, number> = {
    BAIXA: 0.5,
    MEDIA: 1.5,
    ALTA: 2.5,
    CRITICA: 3,
  };
  breakdown.priority = priorityScores[project.priority] || 1;

  // Status score (0-2.5)
  const statusScores: Record<ProjectStatus, number> = {
    EM_RISCO: 2.5,
    EM_ANDAMENTO: 2,
    PLANEJADO: 1,
    PAUSADO: 0.5,
    CONCLUIDO: 0,
    CANCELADO: 0,
  };
  breakdown.status = statusScores[project.status] || 0;

  // Deadline proximity score (0-2.5)
  if (project.due_date) {
    const dueDate = parseISO(project.due_date);
    if (isValid(dueDate)) {
      const daysUntilDue = differenceInDays(dueDate, new Date());
      if (daysUntilDue < 0) {
        breakdown.deadline = 2.5; // Overdue
      } else if (daysUntilDue <= 3) {
        breakdown.deadline = 2.2;
      } else if (daysUntilDue <= 7) {
        breakdown.deadline = 1.8;
      } else if (daysUntilDue <= 14) {
        breakdown.deadline = 1.2;
      } else if (daysUntilDue <= 30) {
        breakdown.deadline = 0.8;
      } else {
        breakdown.deadline = 0.4;
      }
    }
  }

  // Progress score - low progress with high priority = higher score (0-1.5)
  const progressInverse = (100 - project.progress_pct) / 100;
  breakdown.progress = progressInverse * 1.5;

  // Budget score - if has budget planned, add weight (0-0.5)
  if (project.budget_planned && project.budget_planned > 0) {
    breakdown.budget = 0.5;
  }

  const totalScore = Math.min(
    10,
    breakdown.priority + breakdown.status + breakdown.deadline + breakdown.progress + breakdown.budget
  );

  return {
    ...project,
    impactScore: Math.round(totalScore * 10) / 10,
    scoreBreakdown: breakdown,
  };
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-red-500';
  if (score >= 6) return 'text-orange-500';
  if (score >= 4) return 'text-amber-500';
  return 'text-emerald-500';
}

function getScoreBgGradient(score: number): string {
  if (score >= 8) return 'from-red-500/20 to-red-600/10';
  if (score >= 6) return 'from-orange-500/20 to-orange-600/10';
  if (score >= 4) return 'from-amber-500/20 to-amber-600/10';
  return 'from-emerald-500/20 to-emerald-600/10';
}

export function ProjectsFocusPanel({ projects, onOpenProject }: ProjectsFocusPanelProps) {
  // Calculate scores and get top 3 active projects
  const focusProjects = useMemo(() => {
    const activeProjects = projects.filter(
      p => !['CONCLUIDO', 'CANCELADO', 'PAUSADO'].includes(p.status)
    );
    
    const scoredProjects = activeProjects.map(calculateImpactScore);
    
    return scoredProjects
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 3);
  }, [projects]);

  // Calculate average score
  const avgScore = useMemo(() => {
    if (focusProjects.length === 0) return 0;
    const total = focusProjects.reduce((sum, p) => sum + p.impactScore, 0);
    return Math.round((total / focusProjects.length) * 10) / 10;
  }, [focusProjects]);

  if (focusProjects.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-800/40 backdrop-blur-xl shadow-xl"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-xl blur-lg opacity-50" />
              <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Foco do Dia
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Top 3 projetos por score de impacto
              </p>
            </div>
          </div>

          {/* Average Score Badge */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Score Médio</p>
              <p className={cn("text-2xl font-bold", getScoreColor(avgScore))}>
                {avgScore}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <Zap className={cn("h-5 w-5", getScoreColor(avgScore))} />
            </div>
          </div>
        </div>

        {/* Focus Projects Grid */}
        <div className="grid gap-4">
          {focusProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => onOpenProject?.(project)}
              className={cn(
                "group relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-300",
                "border border-white/30 dark:border-slate-700/50",
                "bg-gradient-to-r",
                getScoreBgGradient(project.impactScore),
                "hover:scale-[1.02] hover:shadow-lg hover:border-cyan-500/50"
              )}
            >
              {/* Rank indicator */}
              <div className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center">
                <span className={cn(
                  "text-sm font-bold",
                  index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-amber-700"
                )}>
                  #{index + 1}
                </span>
              </div>

              <div className="flex items-start gap-4 ml-6">
                {/* Impact Score Circle */}
                <div className="relative shrink-0">
                  <svg className="w-14 h-14 -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${(project.impactScore / 10) * 150.8} 150.8`}
                      strokeLinecap="round"
                      className={getScoreColor(project.impactScore)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-sm font-bold", getScoreColor(project.impactScore))}>
                      {project.impactScore}
                    </span>
                  </div>
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {project.code}
                      </p>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-4">
                        {project.name}
                      </h3>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-500 transition-colors shrink-0 mt-1" />
                  </div>

                  {/* Metrics Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Priority */}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5",
                        project.priority === 'CRITICA' && "border-red-500 text-red-600 bg-red-50 dark:bg-red-950",
                        project.priority === 'ALTA' && "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950",
                        project.priority === 'MEDIA' && "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950",
                        project.priority === 'BAIXA' && "border-slate-400 text-slate-600 bg-slate-50 dark:bg-slate-800"
                      )}
                    >
                      {project.priority}
                    </Badge>

                    {/* Status */}
                    {project.status === 'EM_RISCO' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-red-500 text-red-600 bg-red-50 dark:bg-red-950 gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Em Risco
                      </Badge>
                    )}

                    {/* Deadline */}
                    {project.due_date && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-slate-300 dark:border-slate-600 gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {(() => {
                          const days = differenceInDays(parseISO(project.due_date), new Date());
                          if (days < 0) return `${Math.abs(days)}d atrasado`;
                          if (days === 0) return 'Hoje';
                          if (days === 1) return 'Amanhã';
                          return `${days}d`;
                        })()}
                      </Badge>
                    )}

                    {/* Budget */}
                    {project.budget_planned && project.budget_planned > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 gap-1">
                        R$ {(project.budget_planned / 1000).toFixed(0)}k
                      </Badge>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={project.progress_pct} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">
                      {project.progress_pct}%
                    </span>
                  </div>

                  {/* Score Breakdown (hover) */}
                  <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Prioridade +{project.scoreBreakdown.priority.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Status +{project.scoreBreakdown.status.toFixed(1)}
                    </span>
                    {project.scoreBreakdown.deadline > 0 && (
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        Prazo +{project.scoreBreakdown.deadline.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Progresso +{project.scoreBreakdown.progress.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Helper text */}
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
          Score calculado automaticamente com base em prioridade, status, prazo e progresso
        </p>
      </div>
    </motion.div>
  );
}
