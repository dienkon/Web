@echo off
title Build va Chay Server React (Production)
color 0B
echo =======================================
echo       TU DONG BUILD VA CHAY PROJECT
echo =======================================
cd /d "%~dp0"

echo [1/3] Kiem tra va cai dat dependencies root...
call npm install

echo [2/3] Dang Build toan bo project (Vite Build)...
call npm run build

echo [3/3] Dang khoi dong Server (Production)...
echo.
cd trung-tam
set NODE_ENV=production
call npm start
pause
