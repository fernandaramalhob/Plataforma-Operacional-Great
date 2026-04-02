# GreatGo

O GreatGo foi criado para **automatizar a geracao e o envio de relatorios de campanhas de trafego pago da META Ads** para clientes.

O objetivo e substituir processos manuais e ferramentas terceirizadas, permitindo que a equipe tenha **mais controle sobre os dados, mais eficiencia operacional e maior capacidade de escala** no atendimento de clientes.

---

# Contexto

Agencias que gerenciam campanhas de trafego pago frequentemente precisam enviar **relatorios periodicos de desempenho** para seus clientes.

Esse processo normalmente envolve:

- acessar manualmente os dados das campanhas
- organizar as metricas
- montar relatorios
- enviar os resultados para os clientes

Quando o numero de clientes cresce, esse processo se torna **repetitivo, demorado e sujeito a erros**.

Esta plataforma foi criada para resolver esse problema.

---

# Proposito da Plataforma

A plataforma centraliza todo o processo de relatorios em um unico sistema que:

- coleta os dados das campanhas de anuncios
- organiza as metricas de desempenho
- gera relatorios padronizados por cliente
- envia automaticamente esses relatorios para os clientes

Com isso, o processo passa a ser **automatico, confiavel e escalavel**.

---

# Beneficios

A adocao da plataforma traz algumas vantagens importantes:

- reducao de tarefas operacionais manuais
- padronizacao dos relatorios enviados aos clientes
- maior controle sobre historico de relatorios
- maior eficiencia da equipe
- possibilidade de escalar a operacao para muitos clientes

---

# Funcionamento Geral

De forma simplificada, a plataforma funciona assim:

1. As campanhas de cada cliente sao conectadas ao sistema
2. O sistema coleta periodicamente os dados de desempenho
3. As metricas sao organizadas em um relatorio
4. O relatorio e enviado automaticamente para o cliente

Todo o processo ocorre de forma automatizada, reduzindo a necessidade de intervencao manual da equipe.

---

# Visao de Longo Prazo

Alem da automacao basica de relatorios, a plataforma pode evoluir para incluir:

- comparacoes de desempenho entre periodos
- diferentes formatos de relatorio
- integracoes com outras plataformas de anuncios
- dashboards internos de analise de performance
- personalizacao de relatorios por cliente

O objetivo final e transformar a plataforma em uma **ferramenta central de acompanhamento de desempenho de campanhas para a operacao da agencia**.

---

# Uso

Este projeto e destinado ao **uso interno da operacao da empresa**, com foco na automacao de relatorios e melhoria da eficiencia operacional.

---

# Ambiente

Use os arquivos `.env.example` e `.env.local.example` como referencia e mantenha os segredos reais apenas em `.env.local` ou no provedor de ambiente do deploy.

Padrao recomendado:

- `.env`: apenas defaults nao sensiveis
- `.env.local`: segredos locais de desenvolvimento
- `.env.example`: placeholders e documentacao dos campos esperados

Regras de seguranca:

- nunca commitar `.env`, `.env.local` ou qualquer arquivo com segredos reais
- nao reutilizar token da META, API key, senha de usuario ou qualquer credencial externa como `NEXTAUTH_SECRET`
- usar valores aleatorios e distintos para `NEXTAUTH_SECRET` e `META_TOKEN_ENCRYPTION_KEY`
- manter `SEED_USER_PASSWORD` vazio por padrao e preencher apenas quando for executar `npm run user:create`
- rotacionar imediatamente qualquer segredo que ja tenha sido exposto em arquivo local, print, log ou commit

Exemplo de setup local:

1. copie `.env.example` para `.env.local`
2. preencha as credenciais necessarias
3. gere um `NEXTAUTH_SECRET` forte
4. gere uma chave independente para `META_TOKEN_ENCRYPTION_KEY`
5. defina `ADMIN_PASSWORD` para permitir o bootstrap automatico do primeiro administrador ou deixe vazio e execute `npm run user:create`
6. suba um Redis local ou remoto e configure `REDIS_URL`

Bootstrap inicial de autenticacao:

- `ADMIN_EMAIL` e `ADMIN_PASSWORD` controlam o administrador inicial criado automaticamente no primeiro login
- se `ADMIN_PASSWORD` estiver vazio, nenhum admin e criado automaticamente
- `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` e `SEED_USER_ROLE` continuam disponiveis para o script `npm run user:create`

---

# Filas e Redis

O processamento pesado de relatorios agora roda em fila usando Redis + BullMQ.

- `POST /api/reports` enfileira a geracao do relatorio
- `POST /api/reports/:id/send` enfileira o envio por WhatsApp
- o status permanece em `PENDING` enquanto o worker processa o job
- falhas de geracao ficam salvas no proprio registro do relatorio

Variaveis de ambiente:

- `REDIS_URL`: conexao principal com o Redis
- `REPORT_QUEUE_PREFIX`: prefixo das chaves BullMQ
- `REPORT_GENERATION_CONCURRENCY`: concorrencia da fila de geracao
- `REPORT_SEND_CONCURRENCY`: concorrencia da fila de envio
- `REPORT_WEEKLY_CRON`: agenda semanal do disparo automatico
- `REPORT_WEEKLY_TZ`: timezone usada pelo agendamento semanal
- `REPORT_WEEKLY_BATCH_SIZE`: quantidade de clientes ativos processados por lote
- `REPORT_WEEKLY_OBJECTIVE`: objetivo padrao usado no job semanal
- `REPORT_ALERTS_RETENTION`: quantidade de alertas operacionais mantidos no Redis

Operacao:

- jobs que esgotam tentativas vao para a dead letter queue `report-dead-letter`
- alertas operacionais recentes ficam persistidos no Redis
- `GET /api/jobs/health` retorna scheduler, filas, dead letter e alertas recentes para administradores
- para rodar a automacao semanal sem depender do Windows, use `npm run report:weekly:daemon` em um host Linux/container sempre ligado
