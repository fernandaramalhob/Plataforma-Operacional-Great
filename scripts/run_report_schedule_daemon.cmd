@echo off
cd /d "%~dp0.."
set "DAEMON_OUT_LOG=.codex-report-daemon.out.log"
set "DAEMON_ERR_LOG=.codex-report-daemon.err.log"

:loop
echo [launcher] Reiniciando daemon em %date% %time%>>"%DAEMON_OUT_LOG%"
"C:\Program Files\nodejs\node.exe" --env-file ./.env.local --experimental-strip-types --loader ./tests/alias-loader.mjs ./scripts/run_weekly_doctor_reports_daemon.mts 1>>"%DAEMON_OUT_LOG%" 2>>"%DAEMON_ERR_LOG%"
set "DAEMON_EXIT_CODE=%ERRORLEVEL%"
echo [launcher] Daemon encerrado com codigo %DAEMON_EXIT_CODE% em %date% %time%. Reiniciando em 5 segundos...>>"%DAEMON_ERR_LOG%"
timeout /t 5 /nobreak >nul
goto loop
