@echo off
setlocal
title ShineCraft

rem Starts ShineCraft. Installs anything missing on first run.
rem Press Ctrl+C or close this window to stop the application.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" run
set EXIT=%ERRORLEVEL%

echo.
if "%EXIT%"=="0" (
    echo ShineCraft stopped.
) else (
    echo ShineCraft exited with errors ^(exit code %EXIT%^).
)
pause
exit /b %EXIT%