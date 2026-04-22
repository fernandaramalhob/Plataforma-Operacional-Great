// User Roles
export type UserRole = 
  | 'ADMIN'
  | 'SETOR_COMERCIAL' 
  | 'ATENDENTE' 
  | 'GESTOR' 
  | 'COORDENADOR_RED' 
  | 'DESIGN' 
  | 'EDITOR_VIDEO'
  // New commercial roles
  | 'SDR'
  | 'CLOSER'
  | 'COORDENADOR_COMERCIAL'
  // New operational roles
  | 'EQUIPE_DESIGN'
  | 'EQUIPE_TECH';

export const ROLE_LABELS: Record<UserRole, string> = {
  'ADMIN': 'Administrador',
  'SETOR_COMERCIAL': 'Setor Comercial',
  'ATENDENTE': 'Atendente',
  'GESTOR': 'Gestor de Tráfego',
  'COORDENADOR_RED': 'Coordenador/Head',
  'DESIGN': 'Design',
  'EDITOR_VIDEO': 'Editor de Vídeo',
  // Commercial roles
  'SDR': 'SDR',
  'CLOSER': 'Closer',
  'COORDENADOR_COMERCIAL': 'Coordenador/Head Comercial',
  // Operational roles
  'EQUIPE_DESIGN': 'Equipe Design',
  'EQUIPE_TECH': 'Equipe Tech',
};

// Commercial role permissions
export const COMMERCIAL_ROLE_PERMISSIONS = {
  SDR: {
    canCreate: true,
    canEditBasic: true, // ativo, cliente, criativo, indicacao, data, equipe
    canEditAdvanced: false, // faturamento, pacote, periodo, entrada
    canMoveToNegociacao: true,
    canMoveToFechado: false,
    canMoveToPerdido: false,
    canExport: false,
    canManageLists: false,
  },
  CLOSER: {
    canCreate: false,
    canEditBasic: true,
    canEditAdvanced: true,
    canMoveToNegociacao: true,
    canMoveToFechado: true,
    canMoveToPerdido: true,
    canExport: false,
    canManageLists: false,
  },
  COORDENADOR_COMERCIAL: {
    canCreate: true,
    canEditBasic: true,
    canEditAdvanced: true,
    canMoveToNegociacao: true,
    canMoveToFechado: true,
    canMoveToPerdido: true,
    canExport: true,
    canManageLists: true,
  },
};

export type Module = 'COMERCIAL' | 'OPERACIONAL' | 'CEO' | 'TECH';

// Team member role types for cost tracking
export type TeamMemberRole = 'COORDENADOR' | 'GESTOR_TRAFEGO' | 'DESIGN' | 'EDITOR_VIDEO' | 'ROTEIRISTA';

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  'COORDENADOR': 'Coordenador/Head',
  'GESTOR_TRAFEGO': 'Gestor de Tráfego',
  'DESIGN': 'Designer',
  'EDITOR_VIDEO': 'Editor de Vídeo',
  'ROTEIRISTA': 'Roteirista',
};

// User
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  active: boolean;
  createdAt: Date;
}

// Team
export interface Team {
  id: string;
  name: string;
  createdAt: Date;
}

// Client
export type PlanType = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL';
export type StatusComercial = 'NOVO' | 'EM_NEGOCIACAO' | 'FECHADO' | 'PERDIDO';
export type StatusOperacional = 'NOVO_CLIENTE' | 'ATIVO' | 'PAUSADO' | 'ENCERRADO';

export interface Client {
  id: string;
  clientName: string;
  clinicName: string;
  plan: PlanType;
  dealValue: number;
  creativeSource: string;
  statusComercial: StatusComercial;
  statusOperacional: StatusOperacional;
  createdByUserId: string;
  assignedTeamId?: string;
  assignedGestorId?: string;
  assignedAtendenteId?: string;
  assignedDesignId?: string;
  assignedEditorVideoId?: string;
  createdAt: Date;
}

// Task
export type TaskStatus = 'BACKLOG' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDA';
export type TaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  ownerUserId: string;
  createdByUserId: string;
  relatedClientId?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entity?: string;
  entityId?: string;
  createdAt: Date;
}

// Performance Check-in
export interface PerformanceCheckin {
  id: string;
  userId: string;
  date: Date;
  score: number;
  whatIDid: string;
  blockers?: string;
  createdAt: Date;
}

// KPI Types
export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

// Goals
export interface SalesGoal {
  id: string;
  month: string;
  goalValue: number;
  currentValue: number;
  createdByUserId: string;
  createdAt: Date;
}

export interface OperationalGoal {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  scopeType: 'GLOBAL' | 'TEAM' | 'USER';
  scopeTeamId?: string;
  scopeUserId?: string;
  slaHours: number;
  tasksCompletedPerWeek: number;
  checkinsRequiredPerWeek: number;
  createdByUserId: string;
  createdAt: Date;
}

// Activity Log
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: Date;
}
