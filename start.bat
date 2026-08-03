@echo off
chcp 65001 >nul
title codexU-web Launcher
cd /d "%~dp0"

echo ============================================
echo   codexU-web  Codex / Claude usage dashboard
echo ============================================
echo.

rem ---- 1. kill stale process on port 8787 ----
echo [1/3] Checking port 8787 ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8787" ^| findstr "LISTENING"') do (
  echo   port 8787 occupied by PID %%p, killing it ...
  taskkill /F /PID %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

rem ---- 2. start server ----
echo [2/3] Starting server ...
start "codexU-web" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

rem ---- 3. open browser ----
echo [3/3] Opening browser ...
start "" http://localhost:8787
echo.
echo Server is running at http://localhost:8787
echo (also reachable from your phone on the same WiFi - see console output)
echo Close this window to stop the server? No - the server runs in its own window.
echo To stop: close the "codexU-web" console window.
pause >nul
