@echo off
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" --env-file ./.env.local --experimental-strip-types --loader ./tests/alias-loader.mjs ./scripts/run_weekly_doctor_reports_daemon.mts
