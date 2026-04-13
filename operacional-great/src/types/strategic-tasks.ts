// Strategic Tasks Module Types

export type StrategicGoal = 'CRESCIMENTO' | 'RECEITA' | 'PRODUTO' | 'OPERACAO' | 'SUPORTE' | 'NENHUM';
export type StrategicTaskStatus = 'BACKLOG' | 'TODO' | 'EM_ANDAMENTO' | 'EM_REVISAO' | 'CONCLUIDO' | 'BLOQUEADO' | 'CANCELADO';

export interface StrategicTask {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  
  // Strategic classification
  strategic_goal: StrategicGoal;
  status: StrategicTaskStatus;
  
  // Impact scoring (0-10)
  impact_revenue: number;
  impact_operational: number;
  urgency: number;
  effort_estimate: number;
  impact_score: number;
  
  // Delay cost
  delay_cost_financial: number;
  delay_cost_project_impact?: string | null;
  delay_cost_deadline_impact?: string | null;
  
  // Relationships
  project_id?: string | null;
  assigned_to_user_id?: string | null;
  created_by_user_id?: string | null;
  
  // Dates
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  
  // Ghost task detection
  status_changes_count: number;
  last_status_change?: string | null;
  
  // Metadata
  tags: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  project?: { name: string; code: string } | null;
  assignee?: { id: string; full_name: string; avatar_url?: string | null } | null;
  creator?: { id: string; full_name: string } | null;
}

export interface CreateStrategicTaskForm {
  title: string;
  description?: string;
  strategic_goal: StrategicGoal;
  impact_revenue: number;
  impact_operational: number;
  urgency: number;
  effort_estimate: number;
  delay_cost_financial?: number;
  delay_cost_project_impact?: string;
  delay_cost_deadline_impact?: string;
  project_id?: string;
  assigned_to_user_id?: string;
  due_date?: string;
  tags?: string[];
}

export interface StrategicDecision {
  id: string;
  title: string;
  decision: string;
  reason?: string | null;
  expected_impact?: string | null;
  affected_project_ids: string[];
  affected_task_ids: string[];
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  creator?: { full_name: string } | null;
}

// Kanban columns configuration
export const KANBAN_COLUMNS: { id: StrategicTaskStatus; label: string; color: string }[] = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-400' },
  { id: 'TODO', label: 'A Fazer', color: 'bg-blue-500' },
  { id: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-amber-500' },
  { id: 'EM_REVISAO', label: 'Em Revisão', color: 'bg-purple-500' },
  { id: 'CONCLUIDO', label: 'Concluído', color: 'bg-emerald-500' },
  { id: 'BLOQUEADO', label: 'Bloqueado', color: 'bg-red-500' },
];

// Strategic goal configuration
export const STRATEGIC_GOALS: { id: StrategicGoal; label: string; color: string; icon: string }[] = [
  { id: 'CRESCIMENTO', label: 'Crescimento', color: 'bg-green-100 text-green-700', icon: 'TrendingUp' },
  { id: 'RECEITA', label: 'Receita', color: 'bg-emerald-100 text-emerald-700', icon: 'DollarSign' },
  { id: 'PRODUTO', label: 'Produto', color: 'bg-blue-100 text-blue-700', icon: 'Package' },
  { id: 'OPERACAO', label: 'Operação', color: 'bg-orange-100 text-orange-700', icon: 'Settings' },
  { id: 'SUPORTE', label: 'Suporte', color: 'bg-purple-100 text-purple-700', icon: 'Headphones' },
  { id: 'NENHUM', label: 'Sem impacto', color: 'bg-gray-100 text-gray-500', icon: 'HelpCircle' },
];

// Helper functions
export const getGoalConfig = (goal: StrategicGoal) => 
  STRATEGIC_GOALS.find(g => g.id === goal) || STRATEGIC_GOALS[5];

export const getStatusConfig = (status: StrategicTaskStatus) =>
  KANBAN_COLUMNS.find(c => c.id === status) || KANBAN_COLUMNS[0];

export const getImpactScoreColor = (score: number): string => {
  if (score >= 8) return 'text-emerald-600 bg-emerald-100';
  if (score >= 6) return 'text-blue-600 bg-blue-100';
  if (score >= 4) return 'text-amber-600 bg-amber-100';
  if (score >= 2) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
};

// Ghost task detection criteria
export const isGhostTask = (task: StrategicTask): boolean => {
  const now = new Date();
  const createdAt = new Date(task.created_at);
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Ghost if: open > 14 days, status changed > 3 times, or no assignee and open > 7 days
  const isStale = daysSinceCreation > 14 && !['CONCLUIDO', 'CANCELADO'].includes(task.status);
  const hasExcessiveChanges = task.status_changes_count > 3;
  const isOrphaned = !task.assigned_to_user_id && daysSinceCreation > 7 && task.status !== 'BACKLOG';
  
  return isStale || hasExcessiveChanges || isOrphaned;
};
