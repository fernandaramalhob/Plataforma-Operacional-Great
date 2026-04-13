import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Project, ProjectStatus, ProjectPriority, ProjectTeam } from '@/types/projects';

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, updates: Partial<Project>) => Promise<void>;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANEJADO', label: 'Planejado' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'EM_RISCO', label: 'Em Risco' },
  { value: 'PAUSADO', label: 'Pausado' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

const TEAM_OPTIONS: { value: ProjectTeam; label: string }[] = [
  { value: 'TIME_7', label: 'Time 7' },
  { value: 'TROPA_DE_ELITE', label: 'Tropa de Elite' },
];

export function EditProjectDialog({ project, open, onOpenChange, onSubmit, isSubmitting }: EditProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANEJADO');
  const [priority, setPriority] = useState<ProjectPriority>('MEDIA');
  const [team, setTeam] = useState<ProjectTeam | ''>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budgetPlanned, setBudgetPlanned] = useState('');
  const [budgetUsed, setBudgetUsed] = useState('');
  const [roiExpected, setRoiExpected] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status);
      setPriority(project.priority);
      setTeam(project.team || '');
      setStartDate(project.start_date ? project.start_date.split('T')[0] : '');
      setDueDate(project.due_date ? project.due_date.split('T')[0] : '');
      setBudgetPlanned(project.budget_planned?.toString() || '');
      setBudgetUsed(project.budget_used?.toString() || '');
      setRoiExpected(project.roi_expected?.toString() || '');
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    await onSubmit(project.id, {
      name,
      description: description || null,
      status,
      priority,
      team: team || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      budget_planned: budgetPlanned ? parseFloat(budgetPlanned) : null,
      budget_used: budgetUsed ? parseFloat(budgetUsed) : null,
      roi_expected: roiExpected ? parseFloat(roiExpected) : null,
    });
    onOpenChange(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Equipe</Label>
            <Select value={team || '__none__'} onValueChange={(v) => setTeam(v === '__none__' ? '' : v as ProjectTeam)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {TEAM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Prazo</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetPlanned">Orç. Planejado</Label>
              <Input
                id="budgetPlanned"
                type="number"
                step="0.01"
                value={budgetPlanned}
                onChange={(e) => setBudgetPlanned(e.target.value)}
                placeholder="R$"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetUsed">Orç. Utilizado</Label>
              <Input
                id="budgetUsed"
                type="number"
                step="0.01"
                value={budgetUsed}
                onChange={(e) => setBudgetUsed(e.target.value)}
                placeholder="R$"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roiExpected">ROI Esperado (%)</Label>
              <Input
                id="roiExpected"
                type="number"
                step="0.1"
                value={roiExpected}
                onChange={(e) => setRoiExpected(e.target.value)}
                placeholder="%"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
