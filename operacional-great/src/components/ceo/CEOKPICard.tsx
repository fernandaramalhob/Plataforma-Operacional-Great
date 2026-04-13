import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface CEOKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  description: string;
  dataSource: string;
  valueClassName?: string;
}

export function CEOKPICard({
  title,
  value,
  subtitle,
  icon,
  description,
  dataSource,
  valueClassName = '',
}: CEOKPICardProps) {
  return (
    <Card className="group relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] p-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
                <div className="pt-1 border-t">
                  <p className="text-xs text-primary font-medium">📊 Fonte dos dados:</p>
                  <p className="text-xs text-muted-foreground">{dataSource}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
