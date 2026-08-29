@echo off
setlocal
title ShineCraft - Environment Doctor

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" doctor
exit /b %ERRORLEVEL%