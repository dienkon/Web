# ĐẤU TRƯỜNG HÓA HỌC (Chemdex Arena)

Nền tảng đấu trí hóa học trực tuyến nhiều người chơi thời gian thực dành cho học sinh THCS – THPT.

## Công nghệ sử dụng
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, React Router 7, Motion, Recharts
- **Backend / Realtime:** Node.js Express, Firebase Authentication & Cloud Firestore
- **Ngân hàng câu hỏi:** Cân bằng PTHH, Điền khuyết, Danh pháp hợp chất, Đoán nguyên tố, Số oxi hóa

## Cài đặt & Chạy ứng dụng

### Yêu cầu tiên quyết
- Node.js >= 18
- npm >= 9

### Hướng dẫn chạy
1. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
2. Cấu hình biến môi trường:
   Sao chép `.env.example` thành `.env` và điền thông tin cấu hình Firebase, Discord Webhook, Cloudinary nếu cần:
   ```bash
   cp .env.example .env
   ```
3. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại `http://localhost:3000` (hoặc cổng cấu hình).

4. Kiểm tra kiểu và đóng gói:
   ```bash
   npm run lint
   npm run build
   ```
