import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, FileText, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectGoal, ScrumStatus } from '@/hooks/useProjectGoals';

const STATUS_OPTIONS: { value: ScrumStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'A Fazer', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: 'bg-amber-500' },
  { value: 'REVIEW', label: 'Revisão', color: 'bg-purple-500' },
  { value: 'DONE', label: 'Concluído', color: 'bg-emerald-500' },
];

interface GoalDetailDialogProps {
  goal: ProjectGoal | null;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (goalId: string, updates: Partial<Pick<ProjectGoal, 'title' | 'description' | 'estimated_hours' | 'sprint_week' | 'scrum_status'>>) => void;
  onDelete: (goalId: string) => void;
}

export function GoalDetailDialog({ goal, projectName, open, onOpenChange, onUpdate, onDelete }: GoalDetailDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [sprintWeek, setSprintWeek] = useState('');
  const [status, setStatus] = useState<ScrumStatus>('TODO');

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setHours(goal.estimated_hours?.toString() || '');
      setSprintWeek(goal.sprint_week?.toString() || '');
      setStatus(goal.scrum_status);
    }
  }, [goal]);

  if (!goal) return null;

  const handleSave = () => {
    onUpdate(goal.id, {
      title: title.trim() || goal.title,
      description: description.trim() || null,
      estimated_hours: hours ? parseFloat(hours) : null,
      sprint_week: sprintWeek ? parseInt(sprintWeek) : null,
      scrum_status: status,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(goal.id);
    onOpenChange(false);
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Colored top bar */}
        <div className={cn('h-1.5 w-full', currentStatus?.color || 'bg-primary')} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-3">
            {projectName && (
              <Badge variant="secondary" className="w-fit text-xs">
                {projectName}
              </Badge>
            )}
            <DialogTitle className="sr-only">Detalhes da atividade</DialogTitle>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Título da atividade..."
            />
          </DialogHeader>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição detalhada da atividade..."
              className="min-h-[100px] resize-none text-sm"
            />
          </div>

          {/* Grid: hours, sprint week, status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horas Estimadas
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Semana (Sprint)
              </label>
              <Input
                type="number"
                min="1"
                max="52"
                value={sprintWeek}
                onChange={(e) => setSprintWeek(e.target.value)}
                placeholder="1"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select value={status} onValueChange={(v) => setStatus(v as ScrumStatus)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Excluir
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-1.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1.5" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
