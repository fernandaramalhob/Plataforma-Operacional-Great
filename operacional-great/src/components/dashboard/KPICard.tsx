import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  'data-cy'?: string;
  'data-value-cy'?: string;
}

const iconColorClasses = {
  default: 'bg-black/[0.04] text-foreground',
  primary: 'bg-primary/8 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/12 text-amber-600',
  danger: 'bg-primary/8 text-primary',
  info: 'bg-sky-500/10 text-sky-600',
};

const trendColors = {
  up: 'text-emerald-600',
  down: 'text-primary',
  neutral: 'text-muted-foreground',
};

export function KPICard({
  label,
  value,
  change,
  changeLabel,
  trend = 'neutral',
  icon,
  iconColor = 'default',
  className,
  'data-cy': dataCy,
  'data-value-cy': dataValueCy,
}: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div data-cy={dataCy} className={cn('great-panel px-5 py-6 md:px-6', className)}>
      <div className="flex items-start gap-4">
        {icon ? (
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px]', iconColorClasses[iconColor])}>
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground/85 md:text-base">{label}</p>
          <p data-cy={dataValueCy} className="mt-2 text-4xl font-black tracking-[-0.05em] text-foreground tabular-nums">
            {value}
          </p>

          {change !== undefined ? (
            <div className={cn('mt-3 flex items-center gap-2 text-sm font-semibold', trendColors[trend])}>
              <TrendIcon className="h-4 w-4" />
              <span>{change > 0 ? '+' : ''}{change}%</span>
              {changeLabel ? <span className="font-medium text-muted-foreground">{changeLabel}</span> : null}
            </div>
          ) : changeLabel ? (
            <p className="mt-3 text-sm text-muted-foreground">{changeLabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
