const TOMORROW  = new Date(Date.now() + 86_400_000).toISOString()
const NEXT_WEEK = new Date(Date.now() + 7 * 86_400_000).toISOString()

const MOCK_TEAMS = [
  { id: 'equipe-7', name: 'Equipe 7', created_at: new Date().toISOString() },
  { id: 'tropa-de-elite', name: 'Tropa de Elite', created_at: new Date().toISOString() },
]

const MOCK_CLIENTS = [
  { id: 'c-ativo-1', client_name: 'Cliente Ativo 1', status_operacional: 'ATIVO', team_id: 'equipe-7', deal_value: 2000, created_at: new Date().toISOString() },
  { id: 'c-novo-1', client_name: 'Novo Cliente ABC', status_operacional: 'NOVO_CLIENTE', team_id: 'equipe-7', deal_value: 1500, created_at: new Date().toISOString() },
  { id: 'c-churn-1', client_name: 'Cliente Perdido', status_operacional: 'ENCERRADO', churn_reason: 'Preço alto', team_id: 'equipe-7', deal_value: 1000, created_at: new Date().toISOString() },
  { id: 'c-renov-1', client_name: 'Cliente Renovado', status_operacional: 'ATIVO', renewal_status: 'RENEWED', renewal_date: TOMORROW, team_id: 'tropa-de-elite', deal_value: 2500, created_at: new Date().toISOString() },
]

const MOCK_TASKS = [
  { id: 't-1', title: 'Tarefa Pendente Teste', status: 'TODO', due_date: NEXT_WEEK, created_at: new Date().toISOString() },
]

const MOCK_MEETINGS = [
  { id: 'm-1', title: 'Reunião de Alinhamento', datetime_start: TOMORROW, datetime_end: NEXT_WEEK, created_at: new Date().toISOString() },
]

export function seedDashboard(win: Window) {
  win.localStorage.setItem('mock_db_teams', JSON.stringify(MOCK_TEAMS))
  win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(MOCK_CLIENTS))
  win.localStorage.setItem('mock_db_work_items', JSON.stringify(MOCK_TASKS))
  win.localStorage.setItem('mock_db_meetings', JSON.stringify(MOCK_MEETINGS))
}