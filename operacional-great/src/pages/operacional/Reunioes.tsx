import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMeetings, useUpcomingMeetings } from '@/hooks/useOperationalData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
  Sparkles,
  ArrowUpRight,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type MeetingFormData = {
  title: string;
  datetime_start: string;
  datetime_end: string;
  agenda: string;
  scope: string;
};

const EMPTY_FORM: MeetingFormData = {
  title: '',
  datetime_start: '',
  datetime_end: '',
  agenda: '',
  scope: 'GERAL',
};

function parseAsLocal(datetimeStr: string): Date {
  const local = datetimeStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  return new Date(local);
}

function toDatetimeLocal(datetimeStr: string): string {
  const local = datetimeStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  return local.slice(0, 16);
}

function toIsoFromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export default function Reunioes() {
  const { data: meetings, isLoading } = useMeetings();
  const { data: upcomingMeetings } = useUpcomingMeetings(10);
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MeetingFormData>(EMPTY_FORM);

  const [editMeeting, setEditMeeting] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<MeetingFormData>(EMPTY_FORM);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [deleteMeeting, setDeleteMeeting] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.datetime_start || !formData.datetime_end) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('meetings').insert({
        title: formData.title,
        datetime_start: toIsoFromLocalInput(formData.datetime_start),
        datetime_end: toIsoFromLocalInput(formData.datetime_end),
        agenda: formData.agenda || null,
        scope: formData.scope,
        created_by_user_id: authUser.id,
      });
      if (error) throw error;
      toast.success('Reunião criada com sucesso!');
      setIsCreateOpen(false);
      setFormData(EMPTY_FORM);
      invalidate();
    } catch (error: any) {
      toast.error('Erro ao criar reunião.', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (meeting: any) => {
    setEditMeeting(meeting);
    setEditForm({
      title: meeting.title,
      datetime_start: toDatetimeLocal(meeting.datetime_start),
      datetime_end: toDatetimeLocal(meeting.datetime_end),
      agenda: meeting.agenda || '',
      scope: meeting.scope || 'GERAL',
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.title || !editForm.datetime_start || !editForm.datetime_end) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          title: editForm.title,
          datetime_start: toIsoFromLocalInput(editForm.datetime_start),
          datetime_end: toIsoFromLocalInput(editForm.datetime_end),
          agenda: editForm.agenda || null,
          scope: editForm.scope,
        })
        .eq('id', editMeeting.id);

      if (error) throw error;
      toast.success('Reunião atualizada com sucesso!');
      setIsEditOpen(false);
      setEditMeeting(null);
      invalidate();
    } catch (error: any) {
      toast.error('Erro ao atualizar reunião.', { description: error.message });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMeeting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', deleteMeeting.id);
      if (error) throw error;
      toast.success('Reunião removida com sucesso.');
      setDeleteMeeting(null);
      invalidate();
    } catch (error: any) {
      toast.error('Erro ao remover reunião.', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const pastMeetings = meetings?.filter((meeting) => new Date(meeting.datetime_start) < new Date()) || [];

  const stats = useMemo(() => {
    const next = upcomingMeetings || [];
    return {
      total: next.length,
      thisWeek: next.filter((meeting) => isThisWeek(parseAsLocal(meeting.datetime_start))).length,
      general: next.filter((meeting) => meeting.scope === 'GERAL').length,
    };
  }, [upcomingMeetings]);

  return (
    <div className="space-y-8 animate-in">
      <section className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(255,244,244,0.98)_48%,rgba(255,250,250,1))] p-6 shadow-[0_24px_60px_rgba(225,6,0,0.08)] dark:bg-[linear-gradient(135deg,rgba(25,28,35,1),rgba(56,24,28,0.92)_48%,rgba(25,28,35,1))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
        <div className="absolute -top-16 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Central de encontros operacionais
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Video className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reuniões</h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Organize reuniões gerais e de equipe com uma visão mais clara, elegante e alinhada à identidade vermelha da plataforma.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MeetingStatCard label="Próximas" value={stats.total} icon={<Calendar className="h-4 w-4" />} />
            <MeetingStatCard label="Nesta semana" value={stats.thisWeek} icon={<Clock className="h-4 w-4" />} />
            <MeetingStatCard label="Gerais" value={stats.general} icon={<Users className="h-4 w-4" />} />
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-5 shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova reunião
                </Button>
              </DialogTrigger>
              <MeetingDialog
                title="Agendar reunião"
                description="Crie uma nova reunião para alinhar prioridades, decisões e próximos passos."
                form={formData}
                onChange={setFormData}
                submitLabel="Criar reunião"
                isLoading={isSubmitting}
                onCancel={() => setIsCreateOpen(false)}
                onSubmit={handleCreate}
              />
            </Dialog>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Próximas reuniões</h2>
            <p className="text-sm text-muted-foreground">Acompanhe os encontros agendados e mantenha o time sincronizado.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !upcomingMeetings || upcomingMeetings.length === 0 ? (
          <div className="rounded-3xl border border-primary/10 bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="mb-2 text-lg font-semibold text-foreground">Nenhuma reunião agendada</p>
            <p className="mb-5 text-sm text-muted-foreground">Crie a primeira reunião para começar a organizar os alinhamentos do time.</p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="rounded-xl border-primary/20 hover:bg-primary/5">
              <Plus className="mr-2 h-4 w-4" />
              Agendar primeira reunião
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcomingMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onEdit={() => openEdit(meeting)}
                onDelete={() => setDeleteMeeting(meeting)}
              />
            ))}
          </div>
        )}
      </section>

      {pastMeetings.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Reuniões anteriores</h2>
            <p className="text-sm text-muted-foreground">Um histórico rápido dos últimos encontros registrados.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pastMeetings.slice(0, 6).map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                isPast
                onEdit={() => openEdit(meeting)}
                onDelete={() => setDeleteMeeting(meeting)}
              />
            ))}
          </div>
        </section>
      )}

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setEditMeeting(null);
          }
        }}
      >
        <MeetingDialog
          title="Editar reunião"
          description="Atualize título, horário e pauta sem perder o histórico do encontro."
          form={editForm}
          onChange={setEditForm}
          submitLabel="Salvar alterações"
          isLoading={isEditSubmitting}
          onCancel={() => setIsEditOpen(false)}
          onSubmit={handleEdit}
        />
      </Dialog>

      <AlertDialog open={!!deleteMeeting} onOpenChange={(open) => !open && setDeleteMeeting(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover reunião</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza de que deseja remover <strong>{deleteMeeting?.title}</strong>? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MeetingDialog({
  title,
  description,
  form,
  onChange,
  submitLabel,
  isLoading,
  onCancel,
  onSubmit,
}: {
  title: string;
  description: string;
  form: MeetingFormData;
  onChange: (form: MeetingFormData) => void;
  submitLabel: string;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <DialogContent className="border-border bg-card sm:max-w-[640px]">
      <DialogHeader>
        <DialogTitle className="text-foreground">{title}</DialogTitle>
        <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
      </DialogHeader>
      <MeetingForm form={form} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="border-border">
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MeetingForm({ form, onChange }: { form: MeetingFormData; onChange: (form: MeetingFormData) => void }) {
  return (
    <div className="space-y-5 py-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Título *</label>
        <Input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Ex.: Alinhamento semanal da operação"
          className="border-border bg-surface-2 text-foreground"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Início *</label>
          <Input
            type="datetime-local"
            value={form.datetime_start}
            onChange={(e) => onChange({ ...form, datetime_start: e.target.value })}
            className="border-border bg-surface-2 text-foreground"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Fim *</label>
          <Input
            type="datetime-local"
            value={form.datetime_end}
            onChange={(e) => onChange({ ...form, datetime_end: e.target.value })}
            className="border-border bg-surface-2 text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Pauta</label>
        <Textarea
          value={form.agenda}
          onChange={(e) => onChange({ ...form, agenda: e.target.value })}
          placeholder="Descreva a pauta, os responsáveis e os pontos que precisam de decisão."
          className="min-h-[120px] border-border bg-surface-2 text-foreground"
        />
      </div>
    </div>
  );
}

function MeetingStatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="min-w-[130px] rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/5 dark:shadow-none">
      <div className="mb-2 flex items-center justify-between text-primary">
        {icon}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MeetingCard({
  meeting,
  isPast = false,
  onEdit,
  onDelete,
}: {
  meeting: any;
  isPast?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const startDate = parseAsLocal(meeting.datetime_start);
  const endDate = parseAsLocal(meeting.datetime_end);

  return (
    <div
      className={cn(
        'group rounded-[24px] border p-5 transition-all duration-200',
        'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,247,247,0.95))] shadow-[0_18px_40px_rgba(15,23,42,0.06)]',
        'dark:bg-[linear-gradient(180deg,rgba(31,35,43,0.98),rgba(26,29,36,0.96))] dark:shadow-[0_18px_36px_rgba(0,0,0,0.22)]',
        isPast
          ? 'border-border/60 opacity-75'
          : 'border-primary/10 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_46px_rgba(225,6,0,0.10)]'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
              {meeting.scope === 'GERAL' ? 'Geral' : meeting.scope}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Editar reunião"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remover reunião"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-semibold text-foreground">{meeting.title}</h3>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>
            {format(startDate, 'HH:mm')} até {format(endDate, 'HH:mm')}
          </span>
        </div>
      </div>

      {meeting.agenda && (
        <p className="mt-4 line-clamp-3 rounded-2xl bg-black/[0.02] px-3 py-3 text-sm leading-6 text-muted-foreground dark:bg-white/[0.03]">
          {meeting.agenda}
        </p>
      )}

      {meeting.recording_link && (
        <a
          href={meeting.recording_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver gravação
        </a>
      )}
    </div>
  );
}
