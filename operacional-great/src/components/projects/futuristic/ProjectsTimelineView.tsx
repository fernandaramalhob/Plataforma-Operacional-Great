import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectFilters } from '@/types/projects';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, differenceInDays, isWithinInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectsTimelineViewProps {
  projects: Project[];
  filters: ProjectFilters;
  onOpenProject: (project: Project) => void;
}

type ZoomLevel = 'month' | 'quarter';

export function ProjectsTimelineView({ projects, filters, onOpenProject }: ProjectsTimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoom, setZoom] = useState<ZoomLevel>('month');

  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status !== 'ALL' && project.status !== filters.status) {
      return false;
    }
    if (filters.team !== 'ALL' && project.team !== filters.team) {
      return false;
    }
    if (filters.priority !== 'ALL' && project.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  // Only show projects with dates
  const projectsWithDates = filteredProjects.filter(p => p.start_date || p.due_date);

  // Get visible date range
  const visibleRange = useMemo(() => {
    if (zoom === 'month') {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    } else {
      // Quarter view: show 3 months
      return {
        start: startOfMonth(subMonths(currentDate, 1)),
        end: endOfMonth(addMonths(currentDate, 1)),
      };
    }
  }, [currentDate, zoom]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end });
  }, [visibleRange]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' ? subMonths : addMonths;
    const amount = zoom === 'month' ? 1 : 3;
    setCurrentDate(fn(currentDate, amount));
  };

  const getBarPosition = (project: Project) => {
    const start = project.start_date ? new Date(project.start_date) : null;
    const end = project.due_date ? new Date(project.due_date) : null;

    if (!start && !end) return null;

    const effectiveStart = start || end!;
    const effectiveEnd = end || start!;

    // Check if project is visible in current range
    const projectRange = { start: effectiveStart, end: effectiveEnd };
    const isVisible = 
      isWithinInterval(effectiveStart, visibleRange) ||
      isWithinInterval(effectiveEnd, visibleRange) ||
      (effectiveStart <= visibleRange.start && effectiveEnd >= visibleRange.end);

    if (!isVisible) return null;

    const clampedStart = effectiveStart < visibleRange.start ? visibleRange.start : effectiveStart;
    const clampedEnd = effectiveEnd > visibleRange.end ? visibleRange.end : effectiveEnd;

    const totalDays = days.length;
    const startOffset = differenceInDays(clampedStart, visibleRange.start);
    const duration = differenceInDays(clampedEnd, clampedStart) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const statusColors: Record<string, string> = {
    PLANEJADO: 'from-slate-400 to-slate-500',
    EM_ANDAMENTO: 'from-cyan-400 to-cyan-600',
    EM_RISCO: 'from-amber-400 to-amber-600',
    PAUSADO: 'from-slate-300 to-slate-400',
    CONCLUIDO: 'from-emerald-400 to-emerald-600',
    CANCELADO: 'from-red-400 to-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-surface rounded-2xl overflow-hidden"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100/80 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">
              {zoom === 'month' 
                ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                : `${format(subMonths(currentDate, 1), 'MMM', { locale: ptBR })} - ${format(addMonths(currentDate, 1), 'MMM yyyy', { locale: ptBR })}`
              }
            </span>
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setZoom('month')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                zoom === 'month' ? 'bg-white shadow-sm' : 'hover:bg-slate-200/50'
              )}
              title="Visualização mensal"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setZoom('quarter')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                zoom === 'quarter' ? 'bg-white shadow-sm' : 'hover:bg-slate-200/50'
              )}
              title="Visualização trimestral"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Days Header */}
          <div className="flex border-b border-slate-200/50 bg-slate-50/50">
            {/* Project Name Column */}
            <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200/50">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Projeto
              </span>
            </div>
            
            {/* Days */}
            <div className="flex-1 flex">
              {days.map((day, index) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const showDate = zoom === 'month' || day.getDate() === 1 || day.getDate() === 15;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 min-w-[30px] p-1 text-center border-r border-slate-100",
                      isWeekend && "bg-slate-50/80",
                      isToday && "bg-cyan-50"
                    )}
                  >
                    {showDate && (
                      <>
                        <div className="text-[10px] text-slate-400 uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={cn(
                          "text-xs font-medium",
                          isToday ? "text-cyan-600" : "text-slate-600"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Rows */}
          <div className="divide-y divide-slate-100">
            {projectsWithDates.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum projeto com datas definidas</p>
                <p className="text-sm text-slate-400 mt-1">
                  Adicione datas de início e fim aos projetos para visualizá-los na timeline
                </p>
              </div>
            ) : (
              projectsWithDates.map((project, index) => {
                const barPosition = getBarPosition(project);
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex group hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Project Info */}
                    <div
                      className="w-64 flex-shrink-0 p-3 border-r border-slate-200/50 cursor-pointer"
                      onClick={() => onOpenProject(project)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {project.code}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-700 text-sm mt-1 line-clamp-1 group-hover:text-cyan-600 transition-colors">
                        {project.name}
                      </h4>
                      {project.client && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {project.client.clinic_name || project.client.client_name}
                        </p>
                      )}
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-20 flex items-center">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {days.map((day, i) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex-1 min-w-[30px] border-r border-slate-50",
                                isWeekend && "bg-slate-50/50",
                                isToday && "bg-cyan-50/50"
                              )}
                            />
                          );
                        })}
                      </div>

                      {/* Project Bar */}
                      {barPosition && (
                        <motion.div
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          style={{
                            left: barPosition.left,
                            width: barPosition.width,
                          }}
                          className="absolute h-8 origin-left cursor-pointer"
                          onClick={() => onOpenProject(project)}
                        >
                          <div className={cn(
                            "h-full rounded-lg bg-gradient-to-r shadow-sm relative overflow-hidden group/bar",
                            statusColors[project.status] || statusColors.PLANEJADO
                          )}>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/bar:translate-x-full transition-transform duration-1000" />
                            
                            {/* Progress overlay */}
                            <div 
                              className="absolute inset-y-0 left-0 bg-white/20"
                              style={{ width: `${project.progress_pct}%` }}
                            />
                            
                            {/* Label */}
                            <div className="absolute inset-0 flex items-center px-2">
                              <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                                {project.name}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* No dates indicator */}
                      {!barPosition && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-slate-300 italic">
                            Fora do período
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200/50 bg-slate-50/30">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {Object.entries(statusColors).slice(0, 5).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded bg-gradient-to-r", colors)} />
              <span className="text-xs text-slate-600">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
