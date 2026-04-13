import { Card, CardContent } from '@/components/ui/card';
import { LineChart } from 'lucide-react';

export default function Metricas() {
  return (
    <div className="space-y-6 min-h-screen bg-background -m-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <LineChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas</h1>
          <p className="text-muted-foreground">Indicadores operacionais e KPIs</p>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          <LineChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground">Métricas Operacionais</h3>
          <p className="mt-2">Em breve: ganhos, perdas, potenciais do mês e indicadores de execução.</p>
        </CardContent>
      </Card>
    </div>
  );
}
