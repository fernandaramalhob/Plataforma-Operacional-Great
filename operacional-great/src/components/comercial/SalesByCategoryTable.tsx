import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCommercial, Periodo, PERIODO_OPTIONS } from '@/contexts/CommercialContext';
import { MonthPeriodFilter, useMonthFilter } from './MonthPeriodFilter';
import { cn } from '@/lib/utils';

interface CategoryStats {
  categoria: Periodo;
  label: string;
  contratos: number;
  faturamento: number;
  ticketMedio: number;
  porcentagem: number;
}

const CATEGORY_COLORS: Record<Periodo, string> = {
  'MENSAL': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'TRIMESTRAL': 'bg-green-500/20 text-green-400 border-green-500/30',
  'SEMESTRAL': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'TAXA_INTERESSE': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export function SalesByCategoryTable() {
  const { pipelineClients } = useCommercial();
  const [selectedMonth, setSelectedMonth] = useState('2026-01'); // Default to January 2026
  const { filterByMonth } = useMonthFilter();

  // Filter only closed (FECHADO) clients for selected month
  const closedClients = pipelineClients.filter(c => {
    const clientDate = c.dataEntrada || c.entryDate;
    return c.stage === 'FECHADO' && filterByMonth(clientDate ? new Date(clientDate) : undefined, selectedMonth);
  });

  // Calculate total revenue
  const totalRevenue = closedClients.reduce((sum, c) => sum + (c.entrada || c.dealValue || 0), 0);

  // Group by period/category
  const categoryStats: CategoryStats[] = PERIODO_OPTIONS.map(option => {
    const clientsInCategory = closedClients.filter(c => c.periodo === option.value);
    const contratos = clientsInCategory.length;
    const faturamento = clientsInCategory.reduce((sum, c) => sum + (c.entrada || c.dealValue || 0), 0);
    const ticketMedio = contratos > 0 ? faturamento / contratos : 0;
    const porcentagem = totalRevenue > 0 ? (faturamento / totalRevenue) * 100 : 0;

    return {
      categoria: option.value,
      label: option.label === 'Mensal' ? '30 DIAS' : 
             option.label === 'Trimestral' ? '90 DIAS' : 
             option.label === 'Semestral' ? '180 DIAS' : 
             option.label === 'Taxa de Interesse' ? 'TAXA DE INTERESSE' : option.label,
      contratos,
      faturamento,
      ticketMedio,
      porcentagem,
    };
  });

  // Sort by revenue descending
  categoryStats.sort((a, b) => b.faturamento - a.faturamento);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Valores das Vendas por Categoria</CardTitle>
        <MonthPeriodFilter value={selectedMonth} onChange={setSelectedMonth} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-muted-foreground text-center">Contratos</TableHead>
              <TableHead className="text-muted-foreground text-right">Faturamento</TableHead>
              <TableHead className="text-muted-foreground text-right">Ticket Médio</TableHead>
              <TableHead className="text-muted-foreground text-right">Porcentagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryStats.map((stat) => (
              <TableRow key={stat.categoria} className="border-border/20">
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn("font-medium", CATEGORY_COLORS[stat.categoria])}
                  >
                    {stat.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium">{stat.contratos}</TableCell>
                <TableCell className="text-right font-medium text-success">
                  R$ {stat.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  {stat.contratos > 0 
                    ? `R$ ${stat.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : '#DIV/0!'}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-semibold",
                    stat.porcentagem >= 50 && "text-success",
                    stat.porcentagem >= 20 && stat.porcentagem < 50 && "text-amber-400",
                    stat.porcentagem < 20 && stat.porcentagem > 0 && "text-muted-foreground"
                  )}>
                    {stat.porcentagem.toFixed(0)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {/* Total Row */}
            <TableRow className="border-t-2 border-primary/30 bg-primary/5">
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell className="text-center font-bold">
                {categoryStats.reduce((sum, s) => sum + s.contratos, 0)}
              </TableCell>
              <TableCell className="text-right font-bold text-success">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-bold">
                {closedClients.length > 0 
                  ? `R$ ${(totalRevenue / closedClients.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'R$ 0,00'}
              </TableCell>
              <TableCell className="text-right font-bold">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
