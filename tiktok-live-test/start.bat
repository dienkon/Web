@echo off
chcp 65001 >nul
title TikTok Live Interactive - Thiền Cảnh

echo ========================================================
echo   TIKTOK LIVE INTERACTIVE: THẮP ĐÈN SEN - THIỀN CẢNH
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính của bạn CHƯA CÀI ĐẶT Node.js hoặc chưa nhận PATH!
    echo.
    echo 👉 Đang tự động mở trang web tải Node.js trên trình duyệt...
    echo 👉 Bạn hãy bấm tải bản "LTS (Recommended for Most Users)" và bấm Install (Next liên tục).
    echo 👉 Cài xong, hãy TẮT cửa sổ này đi và BẤM ĐÚP LẠI vào file start.bat!
    echo.
    start https://nodejs.org/
    pause
    exit /b
)

echo [1/3] Đã kiểm tra thấy Node.js:
node -v
echo.

if not exist "node_modules\" (
    echo [2/3] Lần đầu chạy: Đang tự động tải thư viện (npm install)...
    call npm install
    echo.
) else (
    echo [2/3] Thư viện (node_modules) đã sẵn sàng!
)

echo [3/3] Đang khởi động hệ thống...
echo 👉 Giao diện sẽ tự động mở tại: http://localhost:3000
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000

node index.js
pause
