@echo off
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\run_report_schedule_daemon.ps1" %*
exit /b %ERRORLEVEL%
