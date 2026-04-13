// Projects ERP Module Types

export type ProjectStatus = 'PLANEJADO' | 'EM_ANDAMENTO' | 'EM_RISCO' | 'PAUSADO' | 'CONCLUIDO' | 'CANCELADO';
export type ProjectPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type ProjectTeam = 'TIME_7' | 'TROPA_DE_ELITE';
export type PhaseStatus = 'NAO_INICIADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'BLOQUEADA';
export type MilestoneStatus = 'PENDENTE' | 'ATINGIDO' | 'ATRASADO';
export type DeliverableType = 'DOC' | 'DESIGN' | 'VIDEO' | 'ROTEIRO' | 'CAMPANHA' | 'RELATORIO' | 'SISTEMA' | 'OUTRO';
export type DeliverableStatus = 'PENDENTE' | 'EM_PRODUCAO' | 'EM_REVISAO' | 'APROVADO' | 'ENTREGUE';
export type RiskSeverity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type RiskProbability = 'BAIXA' | 'MEDIA' | 'ALTA';
export type RiskStatus = 'ABERTO' | 'MITIGANDO' | 'RESOLVIDO';
export type UpdateType = 'CHECKIN' | 'STATUS_CHANGE' | 'NOTE' | 'DECISION';

// Allowed project owners (filter by name)
export const ALLOWED_OWNERS = ['Bruno Gomes', 'Fernanda'];

export interface Project {
  id: string;
  code: string;
  name: string;
  client_id?: string | null;
  team?: ProjectTeam | null;
  owner_user_id?: string | null;
  owner_user_ids?: string[] | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string | null;
  due_date?: string | null;
  progress_pct: number;
  description?: string | null;
  budget_planned?: number | null;
  budget_used?: number | null;
  roi_expected?: number | null;
  risks_count: number;
  blockers_count: number;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: { client_name: string; clinic_name?: string } | null;
  owner?: { full_name: string; avatar_url?: string } | null;
  owners?: { id: string; full_name: string; avatar_url?: string }[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  order: number;
  status: PhaseStatus;
  start_date?: string | null;
  due_date?: string | null;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  phase_id?: string | null;
  name: string;
  target_date?: string | null;
  status: MilestoneStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDeliverable {
  id: string;
  project_id: string;
  phase_id?: string | null;
  name: string;
  type: DeliverableType;
  status: DeliverableStatus;
  assigned_to_user_id?: string | null;
  client_approval_required: boolean;
  attachments?: unknown | null;
  linked_exec_card_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: { full_name: string; avatar_url?: string } | null;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  status: RiskStatus;
  owner_user_id?: string | null;
  mitigation_plan?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: { full_name: string } | null;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_user_id: string;
  type: UpdateType;
  body: string;
  created_at: string;
  // Joined fields
  author?: { full_name: string; avatar_url?: string } | null;
}

// Form types
export interface CreateProjectForm {
  name: string;
  client_id?: string;
  team?: ProjectTeam;
  owner_user_ids: string[];
  start_date?: string;
  due_date?: string;
  priority: ProjectPriority;
  budget_planned?: number;
  description?: string;
}

// View types
export type ProjectView = 'LIST' | 'PIPELINE' | 'TIMELINE' | 'SCRUM' | 'FINANCE' | 'RISKS' | 'INSIGHTS';

// Filter types
export interface ProjectFilters {
  search: string;
  status: ProjectStatus | 'ALL';
  team: ProjectTeam | 'ALL';
  owner_user_id?: string;
  priority: ProjectPriority | 'ALL';
}

// Helper functions
export const getStatusLabel = (status: ProjectStatus): string => {
  const labels: Record<ProjectStatus, string> = {
    PLANEJADO: 'Planejado',
    EM_ANDAMENTO: 'Em Andamento',
    EM_RISCO: 'Em Risco',
    PAUSADO: 'Pausado',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
  };
  return labels[status];
};

export const getStatusColor = (status: ProjectStatus): string => {
  const colors: Record<ProjectStatus, string> = {
    PLANEJADO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    EM_ANDAMENTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    EM_RISCO: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    PAUSADO: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    CONCLUIDO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    CANCELADO: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return colors[status];
};

export const getPriorityLabel = (priority: ProjectPriority): string => {
  const labels: Record<ProjectPriority, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
  };
  return labels[priority];
};

export const getPriorityColor = (priority: ProjectPriority): string => {
  const colors: Record<ProjectPriority, string> = {
    BAIXA: 'bg-slate-100 text-slate-600',
    MEDIA: 'bg-blue-100 text-blue-600',
    ALTA: 'bg-orange-100 text-orange-600',
    CRITICA: 'bg-red-100 text-red-600',
  };
  return colors[priority];
};

export const getTeamLabel = (team: ProjectTeam): string => {
  const labels: Record<ProjectTeam, string> = {
    TIME_7: 'Time 7',
    TROPA_DE_ELITE: 'Tropa de Elite',
  };
  return labels[team];
};

export const getDeliverableTypeLabel = (type: DeliverableType): string => {
  const labels: Record<DeliverableType, string> = {
    DOC: 'Documento',
    DESIGN: 'Design',
    VIDEO: 'Vídeo',
    ROTEIRO: 'Roteiro',
    CAMPANHA: 'Campanha',
    RELATORIO: 'Relatório',
    SISTEMA: 'Sistema',
    OUTRO: 'Outro',
  };
  return labels[type];
};

export const getRiskSeverityLabel = (severity: RiskSeverity): string => {
  const labels: Record<RiskSeverity, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    CRITICA: 'Crítica',
  };
  return labels[severity];
};

export const getRiskSeverityColor = (severity: RiskSeverity): string => {
  const colors: Record<RiskSeverity, string> = {
    BAIXA: 'bg-green-100 text-green-700',
    MEDIA: 'bg-yellow-100 text-yellow-700',
    ALTA: 'bg-orange-100 text-orange-700',
    CRITICA: 'bg-red-100 text-red-700',
  };
  return colors[severity];
};
