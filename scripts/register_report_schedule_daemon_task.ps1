[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$TaskName = "GreatGo Report Schedule Daemon",
  [string]$TaskPath = "\",
  [string]$RepoRoot = "",
  [string]$EnvFile = "",
  [string]$NodePath = "",
  [switch]$Force,
  [switch]$StartNow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $RepoRoot) {
  $RepoRoot = Join-Path $scriptDirectory ".."
}

if (-not $EnvFile) {
  $EnvFile = Join-Path (Join-Path $scriptDirectory "..") ".env.local"
}

function Resolve-AbsolutePath {
  param([Parameter(Mandatory = $true)][string]$Path)

  $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
  return $resolved.Path
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  throw "Execute este comando em um PowerShell aberto como Administrador. A tarefa roda como NT AUTHORITY\SYSTEM e exige permissao elevada."
}

$resolvedRepoRoot = Resolve-AbsolutePath -Path $RepoRoot
$resolvedEnvFile = Resolve-AbsolutePath -Path $EnvFile
$runnerScript = Join-Path $resolvedRepoRoot "scripts\run_report_schedule_daemon.ps1"

if (-not (Test-Path -LiteralPath $runnerScript)) {
  throw "Runner PowerShell nao encontrado em $runnerScript"
}

$description = "Mantem o worker continuo de agendamentos do GreatGo executando no Windows."
$arguments = @(
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  ('"' + $runnerScript + '"'),
  '-RepoRoot',
  ('"' + $resolvedRepoRoot + '"'),
  '-EnvFile',
  ('"' + $resolvedEnvFile + '"')
)

if ($NodePath) {
  $arguments += @('-NodePath', ('"' + $NodePath + '"'))
}

$argumentString = [string]::Join(' ', $arguments)

if ($PSCmdlet.ShouldProcess("$TaskPath$TaskName", "Registrar tarefa agendada do daemon")) {
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentString
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 3650)
  $principal = New-ScheduledTaskPrincipal `
    -UserId 'NT AUTHORITY\SYSTEM' `
    -LogonType ServiceAccount `
    -RunLevel Highest

  if ($Force) {
    $existingTask = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
    if ($existingTask) {
      Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
    }
  }

  Register-ScheduledTask `
    -TaskName $TaskName `
    -TaskPath $TaskPath `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description $description `
    -Force | Out-Null

  if ($StartNow) {
    Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
  }

  Write-Host "Tarefa registrada com sucesso."
  Write-Host "Task: $TaskPath$TaskName"
  Write-Host "Usuario: NT AUTHORITY\SYSTEM"
  Write-Host "Disparo: ao iniciar o Windows"
  Write-Host "Runner: powershell.exe $argumentString"
}
