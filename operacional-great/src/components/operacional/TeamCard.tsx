import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

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

const statItems = [
  { key: 'total', label: 'Total' },
  { key: 'ativos', label: 'Ativos' },
  { key: 'emOnboarding', label: 'Onboarding' },
  { key: 'renewals', label: 'Renovações' },
  { key: 'churned', label: 'Cancelados' },
] as const;

export function TeamCard({ title, subtitle, stats, className, 'data-cy': dataCy, statPrefix }: TeamCardProps) {
  return (
    <div data-cy={dataCy} className={cn('great-panel overflow-hidden px-6 py-7 md:px-8 md:py-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[2rem] font-black tracking-[-0.06em] text-foreground">{title}</h3>
          {subtitle ? <p className="mt-2 text-[1.05rem] text-muted-foreground">{subtitle}</p> : null}
        </div>

        <button className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/6 md:inline-flex">
          Ver detalhes
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-10 border-t border-black/8 pt-8">
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0">
        {statItems.map((item, index) => {
          const value = item.key === 'renewals' || item.key === 'churned' ? stats[item.key] || 0 : stats[item.key];
          const isPrimary = index === 0;

          return (
            <div
              key={item.key}
              className={cn(
                'relative min-w-0 px-3 text-center lg:px-4',
                index !== 0 && 'lg:border-l lg:border-black/8'
              )}
            >
              <p
                className={cn(
                  'mx-auto min-h-[1.25rem] max-w-[8rem] text-[11px] font-bold uppercase leading-none tracking-[0.04em] sm:text-xs',
                  isPrimary ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </p>
              <p
                data-cy={statPrefix ? `${statPrefix}-${item.key === 'emOnboarding' ? 'onboarding' : item.key}` : undefined}
                className={cn(
                  'mt-8 text-[2.2rem] font-black tracking-[-0.06em] tabular-nums sm:text-[2.35rem]',
                  isPrimary ? 'text-primary' : 'text-foreground'
                )}
              >
                {value}
              </p>
              <p className="mt-3 text-[0.95rem] text-muted-foreground">
                {isPrimary ? 'Carteira' : 'Clientes'}
              </p>
              {isPrimary ? <span className="mx-auto mt-6 block h-1 w-14 rounded-full bg-primary" /> : null}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
