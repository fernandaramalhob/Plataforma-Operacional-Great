import type { AgendamentoLead, AgendamentoLeadInsert } from './useAgendamentoData';
import type { PipelineClient, Faturamento, PipelineStage } from '@/contexts/CommercialContext';

// Mapping from AgendamentoLead faturamento to Pipeline faturamento (now 1:1)
export const AGENDAMENTO_TO_PIPELINE_FATURAMENTO: Record<string, Faturamento> = {
  '0_A_15K': '0_A_15K',
  '15K_A_30K': '15K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_100K': '50K_A_100K',
  '100K_PLUS': '100K_PLUS',
};

// Mapping from Pipeline faturamento to AgendamentoLead faturamento (now 1:1)
export const PIPELINE_TO_AGENDAMENTO_FATURAMENTO: Record<Faturamento, string> = {
  '0_A_15K': '0_A_15K',
  '15K_A_30K': '15K_A_30K',
  '30K_A_50K': '30K_A_50K',
  '50K_A_100K': '50K_A_100K',
  '100K_PLUS': '100K_PLUS',
  'NAO_INFORMADO': '0_A_15K',
  'PERSONALIZADO': '30K_A_50K',
};

// Mapping from AgendamentoLead status to Pipeline stage (1:1 now)
export const AGENDAMENTO_STATUS_TO_PIPELINE_STAGE: Record<string, PipelineStage> = {
  'NOVO_LEAD': 'NOVO',
  'NO_SHOW': 'NO_SHOW',
  'TAXA_INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
  // Legacy mappings for backward compatibility
  'NOSHOW': 'NO_SHOW',
  'REMARCAÇÃO': 'NOVO',
  'FOLLOW UP': 'NEGOCIACAO',
  'VENDA PERDIDA': 'PERDIDO',
  'LEAD DESQUALIFICADO': 'PERDIDO',
  'ENTRAR EM CONTATO': 'NOVO',
  'INTERESSEIRO': 'NEGOCIACAO',
  'FUP - ONE LEVEL': 'NEGOCIACAO',
  'SEM RESPOSTA - PÓS': 'NO_SHOW',
  'REEMBOLSO': 'PERDIDO',
  'ARROGANTE': 'PERDIDO',
  'OUTRA PROPOSTA': 'NEGOCIACAO',
  'FICOU DE DAR RESP': 'NEGOCIACAO',
  'FECHOU COM OUTRO': 'PERDIDO',
  'VIU CNPJ': 'NEGOCIACAO',
  'PAGOU TAXA DE INT': 'TAXA_INTERESSE',
  'NÃO FECHOU': 'PERDIDO',
};

// Mapping from Pipeline stage to AgendamentoLead status (1:1 now)
export const PIPELINE_STAGE_TO_AGENDAMENTO_STATUS: Record<PipelineStage, string> = {
  'NOVO': 'NOVO_LEAD',
  'NO_SHOW': 'NO_SHOW',
  'TAXA_INTERESSE': 'TAXA_INTERESSE',
  'NEGOCIACAO': 'NEGOCIACAO',
  'PERDIDO': 'PERDIDO',
  'FECHADO': 'FECHADO',
};

// Convert AgendamentoLead to PipelineClient format
export function agendamentoToPipeline(
  lead: AgendamentoLead | AgendamentoLeadInsert,
  userId: string,
  nextTeam: string = ''
): Omit<PipelineClient, 'id' | 'createdByUserId'> {
  const stage = 'status' in lead && lead.status 
    ? AGENDAMENTO_STATUS_TO_PIPELINE_STAGE[lead.status] || 'NOVO'
    : 'NOVO';

  return {
    ativo: true,
    clientName: lead.nome,
    clinicName: lead.nome,
    vendedor: 'PEDRO_H', // Default vendedor
    criativo: lead.funil || 'NÃO IDENTIFICADO',
    equipe: nextTeam,
    faturamento: AGENDAMENTO_TO_PIPELINE_FATURAMENTO[lead.faturamento] || '0_A_15K',
    pacote: 'COMPLETO',
    periodo: 'MENSAL',
    indicacao: '',
    entrada: 0, // Will be filled later when closing deal
    dataEntrada: new Date(),
    stage,
    lostReason: stage === 'PERDIDO' ? ('status' in lead ? lead.status : undefined) : undefined,
  };
}

// Mapping from Pipeline temSocio/temMkt/temSecretaria to Agendamento format
function mapTemSocioToAgendamento(temSocio?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' {
  if (temSocio === 'SIM') return 'SIM';
  return 'NAO'; // Default to NAO for undefined or NAO_PERGUNTADO
}

function mapTemMktToAgendamento(temMkt?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' {
  if (temMkt === 'SIM') return 'SIM';
  return 'NAO'; // Default to NAO for undefined or NAO_PERGUNTADO
}

function mapTemSecretariaToAgendamento(temSecretaria?: 'SIM' | 'NAO' | 'NAO_PERGUNTADO'): 'SIM' | 'NAO' {
  if (temSecretaria === 'SIM') return 'SIM';
  return 'NAO'; // Default to NAO for undefined or NAO_PERGUNTADO
}

// Convert PipelineClient to AgendamentoLead format
export function pipelineToAgendamento(
  client: Omit<PipelineClient, 'id' | 'createdByUserId'> | PipelineClient
): AgendamentoLeadInsert {
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  const faturamentoValue = PIPELINE_TO_AGENDAMENTO_FATURAMENTO[client.faturamento];
  
  // Map to valid faturamento value with explicit type
  type AgendamentoFaturamento = '0_A_15K' | '15K_A_30K' | '30K_A_50K' | '50K_A_100K' | '100K_PLUS';
  
  // Default mapping from Pipeline to Agendamento faturamento
  let validFaturamento: AgendamentoFaturamento = '0_A_15K';
  if (faturamentoValue === '15K_A_30K' || faturamentoValue === '15K_30K') validFaturamento = '15K_A_30K';
  else if (faturamentoValue === '30K_A_50K' || faturamentoValue === '30K_50K') validFaturamento = '30K_A_50K';
  else if (faturamentoValue === '50K_A_100K' || faturamentoValue === '50K_100K') validFaturamento = '50K_A_100K';
  else if (faturamentoValue === '100K_PLUS') validFaturamento = '100K_PLUS';

  const result: AgendamentoLeadInsert = {
    data: dateStr,
    nome: client.clientName,
    telefone: client.telefone || '',
    horario: 'MANHA',
    tem_socio: mapTemSocioToAgendamento(client.temSocio),
    tem_mkt: mapTemMktToAgendamento(client.temMkt),
    tem_secretaria: mapTemSecretariaToAgendamento(client.temSecretaria),
    salao_ou_clinica: 'NAO_INFORMADO',
    faturamento: validFaturamento,
    funil: client.criativo || 'NÃO IDENTIFICADO',
    status: PIPELINE_STAGE_TO_AGENDAMENTO_STATUS[client.stage] || 'ENTRAR EM CONTATO',
  };
  
  return result;
}
