@echo off
cd /d "%~dp0"
title TikTok Live Interactive

echo ===================================================
echo   TikTok Live Interactive - Thien Canh
echo ===================================================

:: 1. Kiem tra node trong PATH
set NODE_CMD=node
where node >nul 2>nul
if %errorlevel% equ 0 goto FOUND_NODE

:: 2. Tu dong do tim trong cac thu muc cai dat mac dinh cua Windows
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files\nodejs\node.exe"
    set "PATH=%PATH%;C:\Program Files\nodejs"
    goto FOUND_NODE
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files (x86)\nodejs\node.exe"
    set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
    goto FOUND_NODE
)
if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
    set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"
    goto FOUND_NODE
)
if exist "D:\Apps\nodejs\node.exe" (
    set "NODE_CMD=D:\Apps\nodejs\node.exe"
    set "PATH=%PATH%;D:\Apps\nodejs"
    goto FOUND_NODE
)
if exist "D:\nodejs\node.exe" (
    set "NODE_CMD=D:\nodejs\node.exe"
    set "PATH=%PATH%;D:\nodejs"
    goto FOUND_NODE
)

:: 3. Neu khong tim thay thi may tinh chua cai Node.js
echo.
echo ========================================================
echo   [CHUA CAI DAT NODE.JS] MAY TINH CUA BAN CHUA CO NODE.JS!
echo ========================================================
echo.
echo Du an nay can phan mem Node.js de chay may chu.
echo.
echo Dang tu dong mo link tai truc tiep file cai dat tren trinh duyet...
echo.
echo 1. Trinh duyet se tu dong tai file: node-v20.18.0-x64.msi
echo 2. Ban hay mo file .msi vua tai len va bam: Next -^> Next -^> Install
echo 3. Cai xong, hay tat cua so nay va bam dup lai vao start.bat la xong!
echo.
start https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi
pause
exit /b

:FOUND_NODE
:: Tu dong giai phong port 3000 neu bi ket
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>nul

echo.
echo [1/2] Da tim thay Node.js:
"%NODE_CMD%" -v
echo.
echo [2/2] Dang khoi dong may chu va mo trinh duyet...
echo 👉 Web se tu dong mo tai: http://localhost:3000
echo.

start http://localhost:3000
"%NODE_CMD%" index.js
pause
