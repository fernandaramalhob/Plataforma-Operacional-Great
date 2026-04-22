import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WidgetCardProps {
  title: string;
  action?: {
    label: string;
    href: string;
  };
  count?: number;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  children: React.ReactNode;
  className?: string;
  'data-cy'?: string;
}

const toneStyles = {
  default: 'border-black/6',
  danger: 'border-primary/18',
  warning: 'border-amber-500/20',
  success: 'border-emerald-500/20',
};

export function WidgetCard({
  title,
  action,
  count,
  tone = 'default',
  children,
  className,
  'data-cy': dataCy,
}: WidgetCardProps) {
  return (
    <div data-cy={dataCy} className={cn('great-panel overflow-hidden', toneStyles[tone], className)}>
      <div className="flex items-center justify-between gap-3 border-b border-black/6 px-5 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <h3 className="text-[1.85rem] font-black tracking-[-0.05em] text-foreground">{title}</h3>
          {count !== undefined ? (
            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">
              {count}
            </span>
          ) : null}
        </div>

        {action ? (
          <Link to={action.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover">
            {action.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
    </div>
  );
}
