import { cn } from '@/lib/utils';
import { Building2, AlertTriangle, UserX, RefreshCw } from 'lucide-react';

interface TeamStats {
  total: number;
  novos: number;
  emOnboarding: number;
  ativos: number;
  churned?: number;
  renewals?: number;
  tarefasAtrasadas?: number;
}

interface TeamCardProps {
  title: string;
  subtitle?: string;
  stats: TeamStats;
  className?: string;
  'data-cy'?: string;
  statPrefix?: string;
}

export function TeamCard({ title, subtitle, stats, className, 'data-cy': dataCy, statPrefix }: TeamCardProps) {

  return (
    <div
      data-cy={dataCy}
      className={cn(
        'p-card rounded-lg border border-border bg-card shadow-card card-hover',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-h2 text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-caption text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {stats.renewals !== undefined && stats.renewals > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-pill bg-success/10 border border-success/20">
              <RefreshCw className="h-3 w-3 text-success" />
              <span className="text-caption font-medium text-success">
                {stats.renewals} renovação{stats.renewals > 1 ? 'ções' : ''}
              </span>
            </div>
          )}
          {stats.churned !== undefined && stats.churned > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-pill bg-orange-500/10 border border-orange-500/20">
              <UserX className="h-3 w-3 text-orange-600" />
              <span className="text-caption font-medium text-orange-600">
                {stats.churned} saída{stats.churned > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {stats.tarefasAtrasadas !== undefined && stats.tarefasAtrasadas > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-pill bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-caption font-medium text-destructive">
                {stats.tarefasAtrasadas} atrasadas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
        <div className="text-center p-2 rounded-lg bg-surface-2">
          <p data-cy={statPrefix ? `${statPrefix}-total` : undefined} className="text-kpi-sm text-foreground">{stats.total}</p>
          <p className="text-caption text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-success/10">
          <p data-cy={statPrefix ? `${statPrefix}-ativos` : undefined} className="text-kpi-sm text-success">{stats.ativos}</p>
          <p className="text-caption text-muted-foreground mt-0.5">Ativos</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-warning/10">
          <p data-cy={statPrefix ? `${statPrefix}-onboarding` : undefined} className="text-kpi-sm text-warning">{stats.emOnboarding}</p>
          <p className="text-caption text-muted-foreground mt-0.5">Onboarding</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-primary/10">
          <p data-cy={statPrefix ? `${statPrefix}-renovacoes` : undefined} className="text-kpi-sm text-primary">{stats.renewals || 0}</p>
          <p className="text-caption text-muted-foreground mt-0.5">Renovações</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-orange-500/10">
          <p data-cy={statPrefix ? `${statPrefix}-cancelados` : undefined} className="text-kpi-sm text-orange-600">{stats.churned || 0}</p>
          <p className="text-caption text-muted-foreground mt-0.5">Cancelados</p>
        </div>
      </div>
    </div>
  );
}