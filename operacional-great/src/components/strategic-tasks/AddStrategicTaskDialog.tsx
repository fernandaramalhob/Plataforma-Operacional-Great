import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Settings, 
  Headphones,
  HelpCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  STRATEGIC_GOALS, 
  type StrategicGoal, 
  type CreateStrategicTaskForm,
  type StrategicTaskStatus 
} from '@/types/strategic-tasks';
import type { Project } from '@/types/projects';

interface AddStrategicTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: CreateStrategicTaskForm) => Promise<unknown>;
  isSubmitting: boolean;
  projects: Project[];
  users: { id: string; full_name: string }[];
  initialStatus?: StrategicTaskStatus;
}

const goalIcons: Record<string, React.ElementType> = {
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  Headphones,
  HelpCircle,
};

export function AddStrategicTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  projects,
  users,
  initialStatus = 'TODO'
}: AddStrategicTaskDialogProps) {
  const [form, setForm] = useState<CreateStrategicTaskForm>({
    title: '',
    description: '',
    strategic_goal: 'OPERACAO',
    impact_revenue: 5,
    impact_operational: 5,
    urgency: 5,
    effort_estimate: 5,
    delay_cost_financial: 0,
  });

  const [showNoImpactWarning, setShowNoImpactWarning] = useState(false);

  // Calculate preview impact score
  const previewScore = Math.min(10, (
    (form.impact_revenue * 2) + 
    (form.impact_operational * 1.5) + 
    (form.urgency * 1.5)
  ) / (form.effort_estimate * 0.5));

  const handleGoalChange = (goal: StrategicGoal) => {
    setForm({ ...form, strategic_goal: goal });
    setShowNoImpactWarning(goal === 'NENHUM');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    // Reset form
    setForm({
      title: '',
      description: '',
      strategic_goal: 'OPERACAO',
      impact_revenue: 5,
      impact_operational: 5,
      urgency: 5,
      effort_estimate: 5,
      delay_cost_financial: 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-red-500" />
            Nova Tarefa Estratégica
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="O que precisa ser feito?"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes adicionais..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Strategic Goal Selection */}
          <div>
            <Label className="mb-3 block">Objetivo Estratégico *</Label>
            <div className="grid grid-cols-3 gap-2">
              {STRATEGIC_GOALS.map((goal) => {
                const Icon = goalIcons[goal.icon];
                const isSelected = form.strategic_goal === goal.id;
                
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleGoalChange(goal.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      isSelected 
                        ? "border-red-500 bg-red-50 dark:bg-red-950/30" 
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      isSelected ? "text-red-600" : "text-slate-500"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-red-700" : "text-slate-600"
                    )}>
                      {goal.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* No Impact Warning */}
            <AnimatePresence>
              {showNoImpactWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Essa tarefa deveria existir?
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Tarefas sem impacto estratégico podem ser desperdício de recursos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Impact Sliders */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-700 dark:text-slate-200">Score de Impacto</h4>
              <span className={cn(
                "text-xl font-bold px-3 py-1 rounded-lg",
                previewScore >= 8 ? "bg-emerald-100 text-emerald-700" :
                previewScore >= 6 ? "bg-blue-100 text-blue-700" :
                previewScore >= 4 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {previewScore.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Impacto no Faturamento</Label>
                  <span className="text-sm font-medium text-slate-600">{form.impact_revenue}/10</span>
                </div>
                <Slider
                  value={[form.impact_revenue]}
                  onValueChange={([val]) => setForm({ ...form, impact_revenue: val })}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Impacto Operacional</Label>
                  <span className="text-sm font-medium text-slate-600">{form.impact_operational}/10</span>
                </div>
                <Slider
                  value={[form.impact_operational]}
                  onValueChange={([val]) => setForm({ ...form, impact_operational: val })}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Urgência</Label>
                  <span className="text-sm font-medium text-slate-600">{form.urgency}/10</span>
                </div>
                <Slider
                  value={[form.urgency]}
                  onValueChange={([val]) => setForm({ ...form, urgency: val })}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Esforço Estimado</Label>
                  <span className="text-sm font-medium text-slate-600">{form.effort_estimate}/10</span>
                </div>
                <Slider
                  value={[form.effort_estimate]}
                  onValueChange={([val]) => setForm({ ...form, effort_estimate: Math.max(1, val) })}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Delay Cost */}
          <div>
            <Label htmlFor="delay_cost">Custo do Atraso (R$/dia)</Label>
            <Input
              id="delay_cost"
              type="number"
              value={form.delay_cost_financial || ''}
              onChange={(e) => setForm({ ...form, delay_cost_financial: Number(e.target.value) || 0 })}
              placeholder="0"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Quanto a empresa perde por dia se essa tarefa não for executada?
            </p>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Projeto Relacionado</Label>
              <Select
                value={form.project_id || ''}
                onValueChange={(val) => setForm({ ...form, project_id: val || undefined })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Responsável</Label>
              <Select
                value={form.assigned_to_user_id || ''}
                onValueChange={(val) => setForm({ ...form, assigned_to_user_id: val || undefined })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguém</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Data Limite</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!form.title || isSubmitting}
              className="bg-gradient-to-r from-red-600 to-red-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
