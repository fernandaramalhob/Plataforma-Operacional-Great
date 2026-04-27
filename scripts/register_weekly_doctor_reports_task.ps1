[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$TaskName = "GreatGo Weekly Doctor Reports",
  [string]$TaskPath = "\",
  [string]$NodePath = "",
  [string]$RepoRoot = "",
  [string]$EnvFile = "",
  [string]$StartTime = "09:00",
  [string]$TaskUser = "$env:USERDOMAIN\$env:USERNAME",
  [switch]$Force
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

$resolvedRepoRoot = Resolve-AbsolutePath -Path $RepoRoot
$resolvedEnvFile = Resolve-AbsolutePath -Path $EnvFile
$runnerScript = Join-Path $resolvedRepoRoot "scripts\run_weekly_doctor_reports.ps1"

if (-not (Test-Path -LiteralPath $runnerScript)) {
  throw "Runner PowerShell nao encontrado em $runnerScript"
}

try {
  $atTime = [DateTime]::ParseExact($StartTime, "HH:mm", [System.Globalization.CultureInfo]::InvariantCulture)
} catch {
  throw "StartTime deve usar o formato HH:mm, por exemplo 09:00."
}

$description = "Executa a automacao semanal de relatorios toda segunda-feira as 09:00."
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

if ($PSCmdlet.ShouldProcess("$TaskPath$TaskName", "Registrar tarefa agendada semanal")) {
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentString
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $atTime
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal `
    -UserId $TaskUser `
    -LogonType S4U `
    -RunLevel Limited

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

  Write-Host "Tarefa registrada com sucesso."
  Write-Host "Task: $TaskPath$TaskName"
  Write-Host "Usuario: $TaskUser"
  Write-Host "Horario: toda segunda-feira as $StartTime"
  Write-Host "Runner: powershell.exe $argumentString"
}

