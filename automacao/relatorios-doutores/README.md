# Automacao de Relatorios para Doutores(as)

Esta pasta concentra o plano operacional da automacao que deve enviar relatorios para cada Doutor(a) toda quinta-feira as 09h00.

Configuracao alvo:

- frequencia: semanal
- dia: quinta-feira
- horario: 09:00
- timezone: `America/Sao_Paulo`
- responsabilidade do Python: orquestrar agendamento, disparo, retry e logs
- responsabilidade do sistema atual: auth, Prisma, Meta Ads, historico e envio

Arquivo principal:

- `CHECKLIST.md`: checklist de implementacao e validacao da automacao

Arquivos de execucao:

- `scripts/run_weekly_doctor_reports.mts`: runner principal da automacao. Usa as bibliotecas internas do projeto diretamente, sem depender de login HTTP, CSRF ou `localhost`
- `scripts/run_weekly_doctor_reports_daemon.mts`: daemon cross-platform que observa `REPORT_WEEKLY_CRON`, processa os agendamentos pendentes e dispara o runner sem depender do Task Scheduler do Windows
- `scripts/run_weekly_doctor_reports.ps1`: wrapper PowerShell para executar o runner TypeScript com logs locais
- `scripts/run_weekly_doctor_reports_task.cmd`: ponto de entrada da tarefa agendada; agora aguarda o fim real da automacao e devolve o exit code correto ao Windows
- `scripts/register_weekly_doctor_reports_task.ps1`: registra ou atualiza a tarefa no Windows Task Scheduler para toda quinta-feira as 09h00
- `scripts/run_weekly_doctor_reports.py` e `scripts/report_automation_config.py`: legado de validacao anterior, mantidos apenas como referencia

Fluxo operacional:

1. preencher `REPORT_AUTOMATION_EMAIL` ou `ADMIN_EMAIL`
2. garantir que `.env.local` tenha `DATABASE_URL`, credenciais da META e credenciais da Evolution API
3. executar `node --experimental-strip-types --loader ./tests/alias-loader.mjs ./scripts/run_weekly_doctor_reports.mts --dry-run --env-file ./.env.local` para validar acesso ao banco e listagem
4. executar `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/run_weekly_doctor_reports.ps1"` para gerar e enviar
4. consultar os logs JSONL em `automacao/relatorios-doutores/logs/`

Destino configurado:

- grupo padrao da automacao: `Teste GreatGo`
- variavel usada no envio: `REPORT_AUTOMATION_GROUP_ID`
- comportamento: quando essa variavel estiver preenchida, a automacao envia para esse grupo mesmo que o cliente tenha outro `whatsappGroupId`
- comportamento sem override: quando `REPORT_AUTOMATION_GROUP_ID` estiver vazio, cada cliente usa seu proprio `whatsappGroupId`

Validacao com poucos destinatarios:

- use `--max-clients 3` para limitar a execucao aos primeiros 3 clientes ativos
- use `--client-id <uuid>` repetido para testar clientes especificos
- opcionalmente defina `REPORT_AUTOMATION_MAX_CLIENTS=3` no ambiente para manter o lote reduzido ate a validacao inicial
- por padrao, a automacao processa somente clientes conectados com `adAccountId`

Agendamento padrao:

- agendador escolhido: Windows Task Scheduler
- recorrencia configurada no script de registro: toda quinta-feira as 09:00
- comando para registrar a tarefa:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/register_weekly_doctor_reports_task.ps1" -NodePath "C:\Program Files\nodejs\node.exe" -Force
```

- comando para validar sem registrar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/register_weekly_doctor_reports_task.ps1" -NodePath "C:\Program Files\nodejs\node.exe" -WhatIf
```

Modo sem Windows:

- rode `npm run report:weekly:daemon` em um servidor Linux, container Docker ou VM sempre ligada
- o daemon usa `REPORT_WEEKLY_CRON` e `REPORT_WEEKLY_TZ`
- se a execucao da semana falhar, ele tenta novamente apos `REPORT_AUTOMATION_DAEMON_RETRY_MINUTES`
- o health check grava alerta automatico se o worker parar de responder
- estado local do daemon: `automacao/relatorios-doutores/state/weekly-report-daemon-state.json`
- dry-run de validacao imediata: `npm run report:weekly:daemon:dry-run`

Exemplo com systemd:

- arquivo de exemplo: `ops/systemd/greatgo-weekly-report-daemon.service`
- ajuste `WorkingDirectory` para o diretorio real do projeto
- depois habilite com `sudo systemctl enable --now greatgo-weekly-report-daemon`







