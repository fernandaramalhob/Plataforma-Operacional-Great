# Checklist de Execucao do Projeto

Este checklist foi montado com base no codigo atual e no documento do projeto.

Legenda:

- `[x]` ja existe ou ja esta funcional
- `[~]` existe parcialmente
- `[ ]` ainda precisa ser feito

## 1. Base do produto

- `[x]` Projeto em Next.js com frontend e rotas de API no mesmo repositorio
- `[x]` TypeScript configurado
- `[x]` Prisma configurado
- `[x]` Banco PostgreSQL conectado
- `[x]` Estrutura geral de pastas do app definida
- `[x]` Providers globais com NextAuth e React Query
- `[~]` Estrutura modular planejada (`components`, `hooks`, `types`, `lib`)
- `[ ]` Preencher arquivos vazios da arquitetura planejada
- `[ ]` Consolidar padrao de organizacao interna para evitar logica espalhada em paginas grandes

## 2. Identidade e consistencia do produto

- `[x]` Nome `GreatGo` aplicado nas telas principais
- `[~]` Branding parcialmente aplicado
- `[x]` Resolver conflito de naming para `GreatGo`
- `[x]` Padronizar logo, metadata, sidebar e naming interno

## 3. Autenticacao e acesso

- `[x]` Login com NextAuth
- `[x]` Login com Google configurado na aplicacao
- `[x]` Tela de login pronta
- `[~]` Login por credenciais funcionando apenas com credencial hardcoded
- `[ ]` Autenticar credenciais pelo banco de dados
- `[ ]` Remover credenciais fixas do codigo
- `[ ]` Definir papeis e permissoes reais (`ADMIN`, `MANAGER`)
- `[ ]` Implementar protecao centralizada de rotas com `middleware.ts` ou estrategia equivalente robusta

## 4. Seguranca

- `[x]` `NEXTAUTH_SECRET` previsto no ambiente
- `[~]` Token META validado antes de salvar
- `[ ]` Criptografar token META antes de persistir
- `[ ]` Descriptografar token apenas no momento de uso
- `[ ]` Evitar armazenamento sensivel em texto puro
- `[ ]` Revisar logs para nao expor token ou dados sensiveis
- `[ ]` Revisar `.env`, `.env.local` e README para padrao seguro

## 5. Banco e modelo de dominio

- `[x]` Modelos `User`, `Client`, `ClientCampaign`, `Report` e `SendLog` definidos no Prisma
- `[x]` Campos importantes do cliente modelados (`adAccountId`, `whatsappGroupId`, `managerId`)
- `[~]` Estrutura de relatorio e log modelada, mas ainda pouco usada no fluxo real
- `[ ]` Passar a usar `Report` como entidade principal de relatorio gerado
- `[ ]` Passar a usar `SendLog` como trilha real de envio
- `[ ]` Revisar integridade relacional e regras de negocio
- `[ ]` Garantir migrations reais e versionadas no projeto

## 6. Gestao de clientes

- `[x]` Listagem de clientes
- `[x]` Cadastro de cliente
- `[x]` Edicao de cliente
- `[x]` Detalhe de cliente
- `[x]` Campo para grupo de WhatsApp no cliente
- `[x]` Importacao de conta de anuncio como cliente
- `[~]` Filtros da tela de clientes existem visualmente
- `[ ]` Conectar filtros de clientes com backend de forma real
- `[ ]` Exportacao CSV real da listagem de clientes
- `[ ]` Regras de validacao mais fortes no cadastro

## 7. Integracao com META Graph API

- `[x]` Validacao de token META
- `[x]` Salvamento de token META no usuario
- `[x]` Busca de contas de anuncio
- `[x]` Importacao de conta para cliente
- `[x]` Busca de campanhas por cliente
- `[x]` Busca de insights da conta
- `[x]` Busca de insights diarios
- `[~]` Filtro por objetivo implementado no relatorio
- `[ ]` Revisar cobertura de metricas para o que o negocio realmente precisa
- `[ ]` Tratar melhor expiracao de token
- `[ ]` Criar rotina de verificacao preventiva de token
- `[ ]` Criar camada `lib/meta-api.ts` real para centralizar chamadas

## 8. Relatorios

- `[x]` Tela dinamica de relatorio com dados reais da META
- `[x]` Filtro por cliente
- `[x]` Filtro por periodo
- `[x]` Filtro por objetivo
- `[x]` Selecao de campanhas
- `[x]` KPIs principais na tela
- `[x]` Graficos e tabela por campanha
- `[x]` Insights simples na interface
- `[~]` Existe uma tela de preview/PDF separada
- `[~]` Existe exportacao PDF em tela com dados mockados
- `[ ]` Unificar relatorio dinamico e preview final
- `[ ]` Fazer a tela `/dashboard/reports/[id]` consumir dados reais
- `[ ]` Definir formato oficial unico do relatorio
- `[ ]` Persistir relatorios gerados no banco
- `[ ]` Salvar payload do relatorio em `payloadJson`
- `[ ]` Permitir reabertura de relatorio historico por ID

## 9. PDF e exportacao

- `[x]` Geracao de PDF com `html2canvas` + `jsPDF`
- `[~]` Fluxo existe, mas ligado a uma tela mockada
- `[ ]` Gerar PDF a partir do relatorio real
- `[ ]` Padronizar nome, layout e metadata do arquivo PDF
- `[ ]` Garantir qualidade visual desktop/mobile/print
- `[ ]` Validar pagina multipla e quebra correta

## 10. Historico e auditoria

- `[x]` Tela de historico existe
- `[~]` UI do historico pronta, mas backend nao ligado
- `[ ]` Implementar `/api/history`
- `[ ]` Popular historico a partir de `Report` e `SendLog`
- `[ ]` Exibir status real: `PENDING`, `SENT`, `FAILED`
- `[ ]` Exibir tentativas reais de envio
- `[ ]` Exibir mensagem de erro real
- `[ ]` Permitir abrir relatorio do historico
- `[ ]` Permitir reenvio real de relatorio com falha

## 11. WhatsApp / Evolution API

- `[x]` Campo `whatsappGroupId` existe no cadastro do cliente
- `[~]` Ambiente local sugere configuracao de Evolution API
- `[ ]` Criar camada de integracao real com Evolution API
- `[ ]` Montar payload de envio para grupo
- `[ ]` Enviar relatorio formatado para grupo
- `[ ]` Tratar resposta de sucesso e falha
- `[ ]` Registrar tudo em `SendLog`
- `[ ]` Implementar reenvio manual
- `[ ]` Implementar mensagens de erro operacionais para o time

## 12. Automacao e agendamento

- `[ ]` Implementar fila de jobs
- `[ ]` Adicionar Redis ao projeto
- `[ ]` Adicionar BullMQ ou estrategia equivalente
- `[ ]` Criar job semanal de envio
- `[ ]` Buscar todos os clientes ativos no job
- `[ ]` Processar clientes em lote/paralelo com controle
- `[ ]` Retry com backoff
- `[ ]` Dead-letter queue ou tratamento equivalente
- `[ ]` Health checks do job
- `[ ]` Alertas quando job falhar

## 13. Observabilidade e operacao

- `[ ]` Logs estruturados para integracoes
- `[ ]` Alertas para falha de token META
- `[ ]` Alertas para falha de envio WhatsApp
- `[ ]` Painel de status operacional
- `[ ]` Indicador de ultimo envio por cliente
- `[ ]` Indicador de clientes sem token ou sem grupo configurado

## 14. Qualidade de codigo

- `[x]` ESLint configurado
- `[~]` Base tipada, mas com muitos `any`
- `[ ]` Reduzir `any` nas telas e APIs principais
- `[ ]` Criar tipos reais em `types/`
- `[ ]` Criar schemas Zod reais em `lib/validations/`
- `[ ]` Extrair logica repetida de fetch/processamento
- `[ ]` Reaproveitar componentes hoje vazios
- `[ ]` Cobrir fluxos criticos com testes

## 15. Ordem recomendada de execucao

### Fase 1. Fechar a fundacao critica

1. `[x]` Padronizar naming do produto para `GreatGo`
2. `[ ]` Remover login hardcoded e autenticar credenciais pelo banco
3. `[ ]` Implementar protecao de rotas de forma centralizada
4. `[ ]` Criptografar token META antes de salvar
5. `[ ]` Organizar camada real de integracao com META em `lib/meta-api.ts`

### Fase 2. Consolidar o relatorio real

6. `[ ]` Unificar tela de relatorio dinamico com preview final
7. `[ ]` Persistir relatorios em `Report`
8. `[ ]` Salvar payload do relatorio em `payloadJson`
9. `[ ]` Fazer PDF sair do relatorio real, nao de mocks
10. `[ ]` Padronizar formato oficial do relatorio

### Fase 3. Fechar historico e rastreabilidade

11. `[ ]` Implementar `/api/history`
12. `[ ]` Popular `SendLog` com eventos reais
13. `[ ]` Exibir historico funcional no dashboard
14. `[ ]` Permitir abrir relatorio salvo
15. `[ ]` Permitir reenvio manual de falhas

### Fase 4. Implementar envio operacional

16. `[ ]` Criar integracao real com Evolution API
17. `[ ]` Enviar relatorio para WhatsApp com `whatsappGroupId`
18. `[ ]` Tratar sucesso, erro e retorno da API
19. `[ ]` Registrar tentativas e erros em `SendLog`

### Fase 5. Automatizar

20. `[ ]` Adicionar Redis
21. `[ ]` Adicionar fila de jobs com BullMQ ou equivalente
22. `[ ]` Criar job semanal de envio
23. `[ ]` Implementar retries com backoff
24. `[ ]` Implementar alertas e health checks

### Fase 6. Endurecimento

25. `[ ]` Tipar melhor o projeto
26. `[ ]` Preencher `hooks`, `types`, `validations` e componentes vazios
27. `[ ]` Adicionar testes para fluxos criticos
28. `[ ]` Melhorar observabilidade operacional
29. `[ ]` Revisar performance e escalabilidade

## 16. Prioridade objetiva

Se precisar resumir em prioridade maxima:

- `[ ]` login real + seguranca dos tokens
- `[ ]` relatorio real persistido
- `[ ]` historico funcional
- `[ ]` envio real via WhatsApp
- `[ ]` automacao semanal

## 17. Definicao de pronto do produto

O projeto pode ser considerado realmente pronto para a proposta original quando estes cinco pontos estiverem fechados:

- `[ ]` usuario autentica com fluxo seguro e sem credenciais hardcoded
- `[ ]` relatorio e gerado com dados reais e salvo no banco
- `[ ]` historico mostra envios e falhas reais
- `[ ]` envio por WhatsApp funciona para grupos configurados
- `[ ]` job semanal executa sozinho com log, retry e alerta
