import { useState } from 'react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

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

// Strip timezone suffix so date is parsed as local time, avoiding UTC offset shift
function parseAsLocal(datetimeStr: string): Date {
  const local = datetimeStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  return new Date(local);
}

// Convert stored ISO string to datetime-local input value
function toDatetimeLocal(datetimeStr: string): string {
  const local = datetimeStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  return local.slice(0, 16); // "YYYY-MM-DDTHH:mm"
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
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { toast.error('Sessão expirada. Faça login novamente.'); return; }

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
      toast.error('Erro ao criar reunião', { description: error.message });
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
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setIsEditSubmitting(true);
    try {
      const { error } = await supabase.from('meetings').update({
        title: editForm.title,
        datetime_start: toIsoFromLocalInput(editForm.datetime_start),
        datetime_end: toIsoFromLocalInput(editForm.datetime_end),
        agenda: editForm.agenda || null,
        scope: editForm.scope,
      }).eq('id', editMeeting.id);
      if (error) throw error;
      toast.success('Reunião atualizada!');
      setIsEditOpen(false);
      setEditMeeting(null);
      invalidate();
    } catch (error: any) {
      toast.error('Erro ao atualizar reunião', { description: error.message });
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
      toast.success('Reunião removida.');
      setDeleteMeeting(null);
      invalidate();
    } catch (error: any) {
      toast.error('Erro ao remover reunião', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const pastMeetings = meetings?.filter(m => new Date(m.datetime_start) < new Date()) || [];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-info" />
          </div>
          <div>
            <h1 className="text-h1 text-foreground">Reuniões</h1>
            <p className="text-body text-muted-foreground">Reuniões gerais e de equipe</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Agendar Reunião</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Crie uma nova reunião para sua equipe
              </DialogDescription>
            </DialogHeader>
            <MeetingForm form={formData} onChange={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-border">Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Reunião
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Meetings */}
      <section>
        <h2 className="text-h2 text-foreground mb-4">Próximas Reuniões</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !upcomingMeetings || upcomingMeetings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card shadow-card p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-body text-muted-foreground mb-4">Nenhuma reunião agendada</p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="border-border">
              <Plus className="h-4 w-4 mr-2" />
              Agendar primeira reunião
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-grid">
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

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <section>
          <h2 className="text-h2 text-foreground mb-4">Reuniões Anteriores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-grid">
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditMeeting(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Reunião</DialogTitle>
            <DialogDescription className="text-muted-foreground">Atualize os dados da reunião</DialogDescription>
          </DialogHeader>
          <MeetingForm form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-border">Cancelar</Button>
            <Button onClick={handleEdit} disabled={isEditSubmitting}>
              {isEditSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteMeeting} onOpenChange={(open) => { if (!open) setDeleteMeeting(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover Reunião</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja remover <strong>{deleteMeeting?.title}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MeetingForm({ form, onChange }: { form: MeetingFormData; onChange: (f: MeetingFormData) => void }) {
  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-caption font-medium text-foreground mb-1.5 block">Título *</label>
        <Input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Ex: Alinhamento semanal"
          className="bg-surface-2 border-border text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-caption font-medium text-foreground mb-1.5 block">Início *</label>
          <Input
            type="datetime-local"
            value={form.datetime_start}
            onChange={(e) => onChange({ ...form, datetime_start: e.target.value })}
            className="bg-surface-2 border-border text-foreground"
          />
        </div>
        <div>
          <label className="text-caption font-medium text-foreground mb-1.5 block">Fim *</label>
          <Input
            type="datetime-local"
            value={form.datetime_end}
            onChange={(e) => onChange({ ...form, datetime_end: e.target.value })}
            className="bg-surface-2 border-border text-foreground"
          />
        </div>
      </div>
      <div>
        <label className="text-caption font-medium text-foreground mb-1.5 block">Pauta</label>
        <Textarea
          value={form.agenda}
          onChange={(e) => onChange({ ...form, agenda: e.target.value })}
          placeholder="Descreva a pauta da reunião..."
          className="bg-surface-2 border-border text-foreground min-h-[100px]"
        />
      </div>
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
    <div className={`rounded-lg border bg-card shadow-card p-card transition-colors group ${isPast ? 'border-border/50 opacity-70' : 'border-border hover:border-info/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
          <Video className="h-5 w-5 text-info" />
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-caption border-border text-muted-foreground">
            {meeting.scope === 'GERAL' ? 'Geral' : meeting.scope}
          </Badge>
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-body font-semibold text-foreground mb-2">{meeting.title}</h3>

      <div className="space-y-1.5 text-caption text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
        </div>
      </div>

      {meeting.agenda && (
        <p className="text-caption text-muted-foreground mt-3 line-clamp-2">{meeting.agenda}</p>
      )}

      {meeting.recording_link && (
        <a
          href={meeting.recording_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-caption text-primary hover:underline mt-3"
        >
          <ExternalLink className="h-3 w-3" />
          Ver gravação
        </a>
      )}
    </div>
  );
}
