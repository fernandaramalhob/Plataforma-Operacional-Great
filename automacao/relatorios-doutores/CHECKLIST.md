# Checklist da Automacao

Objetivo:

- enviar os relatorios para cada Doutor(a) toda quinta-feira as 09h00
- manter o projeto atual como fonte principal de regras de negocio
- usar Python apenas para orquestracao, sem duplicar a logica central

Agenda:

- recorrencia semanal
- dia: quinta-feira
- horario: 09:00
- timezone: `America/Sao_Paulo`

## Checklist Funcional

- [x] definir quem representa cada Doutor(a) no sistema atual
- [x] confirmar quais clientes devem participar da automacao
- [x] confirmar o canal de envio de cada Doutor(a)
- [x] definir a janela de dados do relatorio semanal
- [x] definir se o envio sera individual ou em grupo

## Checklist Tecnico

- [x] criar script Python de orquestracao em `scripts/`
- [x] criar arquivo de configuracao Python sem segredos versionados
- [x] autenticar o script no sistema atual com usuario tecnico
- [x] listar Doutores(as) ativos antes do disparo
- [x] gerar relatorio para cada Doutor(a) usando a API atual
- [x] aguardar conclusao quando a geracao for assincrona
- [x] disparar o envio usando a API atual
- [x] registrar sucesso e falha por destinatario

## Checklist de Seguranca

- [x] ler segredos por variaveis de ambiente
- [x] nao salvar tokens da Meta em texto puro no Python
- [x] nao duplicar credenciais no codigo
- [x] usar usuario tecnico com permissao adequada
- [x] proteger contra reenvio duplicado na mesma semana

## Checklist de Operacao

- [x] escolher o agendador do ambiente de execucao
- [x] configurar o job para quinta as 09h00
- [x] validar comportamento com poucos destinatarios primeiro
- [x] adicionar retries para falhas temporarias
- [x] gerar resumo final da execucao
- [x] registrar logs em arquivo ou destino centralizado

## Checklist de Validacao

- [x] validar auth no ambiente real
- [x] validar acesso ao banco via backend atual
- [ ] validar leitura de dados da Meta
- [ ] validar um envio completo ponta a ponta
- [ ] validar historico do relatorio apos envio
- [ ] validar que a automacao nao envia duas vezes o mesmo periodo

## Criterios de Pronto

- [x] script Python executa sem alterar a arquitetura do projeto atual
- [ ] relatorios sao enviados toda quinta-feira as 09h00
- [x] falhas ficam rastreaveis por Doutor(a)
- [x] existe mecanismo para evitar duplicidade
- [x] existe documentacao suficiente para operacao e manutencao

## Status Atual

- runner automatico principal implementado em `scripts/run_weekly_doctor_reports.mts`
- wrapper PowerShell em `scripts/run_weekly_doctor_reports.ps1`
- tarefa agendada via `scripts/run_weekly_doctor_reports_task.cmd` com retorno real de sucesso ou falha
- registro do agendamento Windows em `scripts/register_weekly_doctor_reports_task.ps1`
- segredos documentados em `.env.example` e `.env.local.example`
- validacao de lote reduzido suportada via `--max-clients` ou `--client-id`
- logs locais em `automacao/relatorios-doutores/logs/`
- tarefa agendada registrada no Windows Task Scheduler como `GreatGo Weekly Doctor Reports`
- pendencias atuais: validacao completa dos tokens Meta de todos os clientes e confirmacao do proximo disparo semanal com a tarefa atualizada







