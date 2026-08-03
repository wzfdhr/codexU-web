@echo off
chcp 65001 >nul
title codexU-web Stopper
echo Stopping codexU-web ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8787" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
  echo   killed PID %%p
)
echo Done. Port 8787 released.
timeout /t 2 /nobreak >nul
exit
