@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Lutfen Node.js kurun veya VS Code Live Server kullanin.
  pause
  exit /b 1
)

node server.js

if errorlevel 1 pause
