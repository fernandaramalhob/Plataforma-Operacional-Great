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
}

export function WidgetCard({ 
  title, 
  action, 
  count, 
  tone = 'default',
  children, 
  className 
}: WidgetCardProps) {
  const toneStyles = {
    default: {
      border: 'border-border',
      badge: 'bg-primary/10 text-primary',
    },
    danger: {
      border: 'border-destructive/30',
      badge: 'bg-destructive/10 text-destructive',
    },
    warning: {
      border: 'border-warning/30',
      badge: 'bg-warning/10 text-warning',
    },
    success: {
      border: 'border-success/30',
      badge: 'bg-success/10 text-success',
    },
  };
  
  return (
    <div className={cn(
      'rounded-lg border bg-card shadow-card overflow-hidden',
      toneStyles[tone].border,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-card py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {count !== undefined && count > 0 && (
            <span className={cn(
              'flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-pill text-caption font-semibold',
              toneStyles[tone].badge
            )}>
              {count}
            </span>
          )}
          <h3 className="text-h2 text-foreground">{title}</h3>
        </div>
        
        {action && (
          <Link 
            to={action.href}
            className="flex items-center gap-1 text-caption font-medium text-primary hover:text-primary-hover transition-colors"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="p-card">
        {children}
      </div>
    </div>
  );
}
