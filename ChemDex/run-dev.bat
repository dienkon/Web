@echo off
title Chay Server React (Dev Mode - Go Live)
color 0A
echo =======================================
echo KHOI DONG TOAN BO DU AN (HTML + REACT + API)
echo =======================================
cd /d "%~dp0"

echo [1/2] Kiem tra va cai dat dependencies...
call npm install

echo [2/2] Dang chay Server tong (Dev Mode)...
echo.
cd trung-tam
call npm run dev
pause
