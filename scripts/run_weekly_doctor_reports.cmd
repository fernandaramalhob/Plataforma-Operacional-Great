@echo off
setlocal
if "%~1"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_weekly_doctor_reports.ps1"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_weekly_doctor_reports.ps1" -AdditionalArgs %*
)
exit /b %ERRORLEVEL%
