[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$TaskName = "GreatGo Report Schedule Daemon",
  [string]$TaskPath = "\"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  throw "Execute este comando em um PowerShell aberto como Administrador para remover a tarefa."
}

if ($PSCmdlet.ShouldProcess("$TaskPath$TaskName", "Remover tarefa agendada do daemon")) {
  $task = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue

  if (-not $task) {
    Write-Host "Tarefa nao encontrada: $TaskPath$TaskName"
    return
  }

  Stop-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false

  Write-Host "Tarefa removida com sucesso: $TaskPath$TaskName"
}
