@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_weekly_doctor_reports.ps1" -RepoRoot "%~dp0.." -EnvFile "%~dp0..\.env.local"
exit /b %ERRORLEVEL%
