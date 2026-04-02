@echo off
setlocal
call "%~dp0run_weekly_doctor_reports.cmd" --allow-duplicate-week
exit /b %ERRORLEVEL%
