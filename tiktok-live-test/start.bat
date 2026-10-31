@echo off
cd /d "%~dp0"
title TikTok Live Interactive

:: Tu dong giai phong port 3000 neu bi ket
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>nul

echo ===================================================
echo   TikTok Live Interactive - Thien Canh
echo ===================================================
echo.
echo Dang khoi dong may chu va mo trinh duyet...

start http://localhost:3000
node index.js
pause
