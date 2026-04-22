import { ChampionshipTeam, ChampionshipMonthlyHistory, ChampionshipEvent } from '@/hooks/useChampionshipData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

interface PointsEvolutionChartProps {
  teams: ChampionshipTeam[];
  monthlyHistory: ChampionshipMonthlyHistory[];
}

export function PointsEvolutionChart({ teams, monthlyHistory }: PointsEvolutionChartProps) {
  // Group history by month
  const months = [...new Set(monthlyHistory.map(h => h.month))].sort();
  
  const chartData = months.map(month => {
    const monthData: Record<string, any> = { month: formatMonth(month) };
    teams.forEach(team => {
      const teamHistory = monthlyHistory.find(h => h.team_id === team.team_id && h.month === month);
      monthData[team.label] = teamHistory?.total_points || 0;
    });
    return monthData;
  });

  // Add current month with current data if not in history
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!months.includes(currentMonth)) {
    const currentData: Record<string, any> = { month: formatMonth(currentMonth) };
    teams.forEach(team => {
      currentData[team.label] = team.total_points;
    });
    chartData.push(currentData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolução de Pontos</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {teams.map((team) => (
                <Line
                  key={team.team_id}
                  type="monotone"
                  dataKey={team.label}
                  stroke={team.badge_color}
                  strokeWidth={3}
                  dot={{ fill: team.badge_color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Dados históricos serão exibidos conforme eventos forem registrados
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ItemsSoldBreakdownProps {
  events: ChampionshipEvent[];
  teams: ChampionshipTeam[];
}

export function ItemsSoldBreakdown({ events, teams }: ItemsSoldBreakdownProps) {
  const itemEvents = events.filter(e => e.event_type === 'ITEM_SOLD');
  
  // Group by item label
  const itemCounts: Record<string, number> = {};
  itemEvents.forEach(event => {
    const label = event.item_label || 'Outro';
    itemCounts[label] = (itemCounts[label] || 0) + 1;
  });

  const chartData = Object.entries(itemCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#CA8A04', '#9333EA', '#EC4899', '#06B6D4', '#F97316'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Itens Vendidos por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum item vendido registrado ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RenewalVsLossChartProps {
  teams: ChampionshipTeam[];
}

export function RenewalVsLossChart({ teams }: RenewalVsLossChartProps) {
  const chartData = teams.map(team => ({
    name: team.label,
    Renovações: team.renewals,
    Perdas: team.losses,
    color: team.badge_color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Renovações vs Perdas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="name" type="category" width={100} className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="Renovações" fill="#16A34A" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Perdas" fill="#DC2626" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}
