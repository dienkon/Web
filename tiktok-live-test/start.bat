@echo off
chcp 65001 >nul
title TikTok Live Interactive - Thien Canh

echo ========================================================
echo   TIKTOK LIVE INTERACTIVE: THẮP ĐÈN SEN - THIỀN CẢNH
echo ========================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

echo [1/3] Đã tìm thấy Node.js:
node -v
echo.

if not exist node_modules goto INSTALL_DEPS
goto START_SERVER

:NO_NODE
echo [LỖI] Máy tính của bạn CHƯA CÀI ĐẶT Node.js hoặc chưa nhận PATH!
echo.
echo - Đang tự động mở trang web https://nodejs.org trên trình duyệt...
echo - Hãy tải bản LTS và bấm Next liên tục để cài đặt.
echo - Cài đặt xong, hãy TẮT cửa sổ này và bấm đúp lại vào start.bat.
echo.
start https://nodejs.org/
pause
exit /b

:INSTALL_DEPS
echo [2/3] Lần đầu chạy: Đang tự động cài thư viện npm install...
call npm install
echo.

:START_SERVER
echo [3/3] Đang khởi động hệ thống...
echo 👉 Giao diện sẽ tự động mở tại: http://localhost:3000
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3000

node index.js
pause
