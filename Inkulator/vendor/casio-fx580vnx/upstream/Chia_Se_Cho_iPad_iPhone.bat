@echo off
chcp 65001 >nul
title Chia Sẻ Casio fx-580VN X Cho iPad & iPhone
echo ====================================================================
echo          KẾT NỐI CASIO fx-580VN X TRÊN IPAD / IPHONE / ANDROID
echo ====================================================================
echo.
echo 1. Đảm bảo iPad/iPhone và máy tính này kết nối cùng mạng Wi-Fi.
echo 2. Đang khởi tạo Web Server nội bộ...
echo.
python -c "import socket, os, webbrowser, http.server, socketserver;s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM);try:
    s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0];
except:
    ip = '127.0.0.1';
finally:
    s.close();
port = 8080;
url = f'http://{ip}:{port}/';
print('====================================================================');
print(f'  👉  TRÊN IPAD / IPHONE, MỞ SAFARI VÀ NHẬP ĐỊA CHỈ:');
print(f'      {url}');
print('====================================================================\n');
print('MẸO CHO IPAD/IPHONE:');
print('  - Nhấn nút Chia sẻ (biểu tượng ô vuông mũi tên [^]) trên Safari.');
print('  - Chọn \'Thêm vào MH chính\' (Add to Home Screen).');
print('  - Máy tính sẽ hiện thành 1 App riêng trên iPad, mở toàn màn hình!\n');
print('Đang chạy server... (Bấm Ctrl+C trên cửa sổ này khi muốn dừng)');
os.chdir(r'%~dp0');
handler = http.server.SimpleHTTPRequestHandler;
server = socketserver.TCPServer(('0.0.0.0', port), handler);
server.serve_forever();"
pause
