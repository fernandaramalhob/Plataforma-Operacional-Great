import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CreateProjectForm, ProjectPriority, ProjectTeam } from '@/types/projects';
import { ALLOWED_OWNERS } from '@/types/projects';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: CreateProjectForm) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateProjectDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreateProjectDialogProps) {
  const [form, setForm] = useState<CreateProjectForm>({
    name: '',
    priority: 'MEDIA',
    owner_user_ids: [],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['operational-clients-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_clients')
        .select('id, client_name, clinic_name')
        .eq('status_operacional', 'ATIVO')
        .order('client_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for owner dropdown - filter by allowed owners
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-project-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      // Filter to only allowed owners
      return data.filter(user => 
        ALLOWED_OWNERS.some(name => user.full_name.toLowerCase().includes(name.toLowerCase()))
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.owner_user_ids.length === 0) return;
    
    await onSubmit(form);
    setForm({ name: '', priority: 'MEDIA', owner_user_ids: [] });
    onOpenChange(false);
  };

  const toggleOwner = (userId: string) => {
    setForm(prev => ({
      ...prev,
      owner_user_ids: prev.owner_user_ids.includes(userId)
        ? prev.owner_user_ids.filter(id => id !== userId)
        : [...prev.owner_user_ids, userId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Novo Projeto</DialogTitle>
              <DialogDescription>
                Preencha as informações para criar um novo projeto
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do projeto *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Campanha Black Friday"
              className="bg-background/50"
              required
            />
          </div>

          {/* Owner and Client row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsáveis *</Label>
              <div className="space-y-2 p-3 rounded-lg border bg-background/50 max-h-32 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum responsável disponível</p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`owner-${user.id}`}
                        checked={form.owner_user_ids.includes(user.id)}
                        onCheckedChange={() => toggleOwner(user.id)}
                      />
                      <label
                        htmlFor={`owner-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.full_name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {form.owner_user_ids.length === 0 && (
                <p className="text-xs text-muted-foreground">Selecione pelo menos um responsável</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <Select
                value={form.client_id || 'none'}
                onValueChange={(value) => setForm({ ...form, client_id: value === 'none' ? undefined : value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clinic_name || client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team and Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Equipe (opcional)</Label>
              <Select
                value={form.team || 'none'}
                onValueChange={(value) => setForm({ ...form, team: value === 'none' ? undefined : value as ProjectTeam })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma equipe</SelectItem>
                  <SelectItem value="TIME_7">Time 7</SelectItem>
                  <SelectItem value="TROPA_DE_ELITE">Tropa de Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade *</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value as ProjectPriority })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.start_date || ''}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || undefined })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo final</Label>
              <Input
                type="date"
                value={form.due_date || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })}
                className="bg-background/50"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label>Orçamento planejado (R$)</Label>
            <Input
              type="number"
              value={form.budget_planned || ''}
              onChange={(e) => setForm({ ...form, budget_planned: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0,00"
              className="bg-background/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
              placeholder="Descreva o objetivo e escopo do projeto..."
              className="bg-background/50 min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!form.name || form.owner_user_ids.length === 0 || isSubmitting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Projeto'
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
