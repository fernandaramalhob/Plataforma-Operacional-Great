import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCommercial, Agendador, AGENDADOR_OPTIONS } from '@/contexts/CommercialContext';
import { Target, Users } from 'lucide-react';

interface EditAllSDRGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAllSDRGoalsDialog({ open, onOpenChange }: EditAllSDRGoalsDialogProps) {
  const { setSDRGoal, getSDRStats } = useCommercial();
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [goals, setGoals] = useState<Record<Agendador, string>>(() => {
    const initial: Record<Agendador, string> = {} as Record<Agendador, string>;
    AGENDADOR_OPTIONS.forEach(a => {
      initial[a.value] = '';
    });
    return initial;
  });

  useEffect(() => {
    if (open) {
      const newGoals: Record<Agendador, string> = {} as Record<Agendador, string>;
      AGENDADOR_OPTIONS.forEach(a => {
        const stats = getSDRStats(a.value, currentMonthKey);
        newGoals[a.value] = stats.goalCount > 0 ? stats.goalCount.toString() : '';
      });
      setGoals(newGoals);
    }
  }, [open, getSDRStats, currentMonthKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    AGENDADOR_OPTIONS.forEach(a => {
      const value = parseInt(goals[a.value]) || 0;
      if (value > 0) {
        setSDRGoal(a.value, currentMonthKey, value);
      }
    });
    onOpenChange(false);
  };

  const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Metas dos SDRs
          </DialogTitle>
          <DialogDescription>
            Defina as metas de agendamentos fechados para {currentMonth}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {AGENDADOR_OPTIONS.map(agendador => {
            const stats = getSDRStats(agendador.value, currentMonthKey);
            return (
              <div key={agendador.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`goal-${agendador.value}`}>{agendador.label}</Label>
                  <span className="text-sm text-muted-foreground">
                    Atual: {stats.closedCount} fechados
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`goal-${agendador.value}`}
                    type="number"
                    min="0"
                    value={goals[agendador.value]}
                    onChange={(e) => setGoals(prev => ({ ...prev, [agendador.value]: e.target.value }))}
                    placeholder="Meta de fechamentos"
                    className="flex-1"
                  />
                </div>
              </div>
            );
          })}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Metas</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
