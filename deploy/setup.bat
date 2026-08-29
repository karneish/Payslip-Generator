@echo off
setlocal
title ShineCraft Setup

rem One-time full setup: installs missing dependencies and starts the app.
rem Safe to re-run; steps already completed are skipped.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" reinstall
set EXIT=%ERRORLEVEL%

echo.
if "%EXIT%"=="0" (
    echo ShineCraft finished. Close this window or press Ctrl+C in it to stop the app.
) else (
    echo ShineCraft finished with errors ^(exit code %EXIT%^).
)
pause
exit /b %EXIT%