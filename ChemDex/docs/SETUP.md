# Hướng Dẫn Cài Đặt và Khởi Chạy (Setup Guide)

ChemDex là một dự án Hybrid kết hợp giữa tĩnh (HTML) và động (React/Node). Việc thiết lập môi trường rất đơn giản nhờ các script tự động hóa được tích hợp sẵn.

## 1. Yêu Cầu Hệ Thống (Prerequisites)
Để chạy toàn bộ hệ sinh thái ChemDex, bạn cần đảm bảo máy tính đã cài đặt:
- **Node.js** (Phiên bản >= 18.x)
- **NPM** (Đi kèm với Node.js) hoặc **Yarn** / **Bun**.
- Trình duyệt hiện đại (Chrome, Edge, Firefox, Safari) có hỗ trợ WebGL.

## 2. Thiết Lập Biến Môi Trường (Environment Variables)

Hệ thống AI và Cơ sở dữ liệu yêu cầu các khóa bảo mật. Bạn cần tạo một file `.env` tại thư mục gốc (`/ChemDex/.env`) với nội dung sau:

```env
# Google Gemini API Key (Bắt buộc cho Chatbot và Moderation)
GEMINI_API_KEY="AIzaSy... (Khóa API của bạn)"

# Các biến cho Firebase (Nếu bạn cần chạy tính năng Đấu Trường cục bộ)
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
```
*(Lưu ý: Không bao giờ commit file `.env` lên GitHub).*

---

## 3. Chế Độ Chạy Development (Dành cho Lập trình viên)

Chế độ Dev sẽ bật tính năng **Hot-Reload**. Khi bạn lưu file, giao diện sẽ cập nhật lập tức.
Server Dev sẽ chạy đồng thời 4 phiên bản Vite song song và 1 API server trên cùng **Port 5500**.

**Cách chạy:**
1. Mở cửa sổ Terminal hoặc Command Prompt tại thư mục gốc của dự án.
2. Chạy file batch:
   ```cmd
   run-dev.bat
   ```
   *Trên Mac/Linux, bạn có thể chạy tuần tự: `npm install` -> `cd trung-tam` -> `npm run dev`.*
3. Mở trình duyệt và truy cập: **`http://127.0.0.1:5500/`**

---

## 4. Chế Độ Chạy Production (Đóng Gói & Tối Ưu)

Khi bạn muốn kiểm tra xem web chạy thực tế trên Host (như Vercel hoặc CPanel) sẽ ra sao, hãy dùng chế độ Production.
Quá trình này sẽ dịch toàn bộ code React TypeScript sang HTML/JS thuần và ghép chúng vào thư mục gốc.

**Cách chạy:**
1. Mở Terminal tại thư mục gốc.
2. Chạy file batch:
   ```cmd
   build-and-run.bat
   ```
3. Script sẽ tự động:
   - Cài đặt toàn bộ dependencies (`npm install`).
   - Build 4 dự án Vite (`npm run build`).
   - Copy các file `dist` về đúng thư mục bằng `build.js`.
   - Khởi động Node Server ở chế độ production trên port `5500`.

---

## 5. Xử Lý Lỗi Thường Gặp (Troubleshooting)

### 5.1. Lỗi `EADDRINUSE: address already in use 0.0.0.0:5500`
- **Nguyên nhân**: Port 5500 đang bị chiếm dụng. Khả năng cao là bạn đang bật Extension **Live Server** trong VS Code, hoặc một cửa sổ terminal trước đó vẫn chưa bị đóng hoàn toàn.
- **Cách sửa**: 
  - Tắt Live Server (nhấn vào chữ "Port: 5500" góc phải dưới VS Code).
  - Tắt toàn bộ các cửa sổ terminal (cmd/bash) đang mở rồi chạy lại.

### 5.2. AI Chatbot thông báo lỗi / Không trả lời
- **Nguyên nhân**: Thiếu API Key hoặc Key bị giới hạn quota.
- **Cách sửa**: Kiểm tra lại file `.env` ở thư mục gốc xem biến `GEMINI_API_KEY` đã được đặt chính xác chưa. Đảm bảo API Key còn hiệu lực.

### 5.3. Không chuyển được trang trong Đấu trường (Màn hình trắng)
- **Nguyên nhân**: Lỗi cache của Vite.
- **Cách sửa**: Bấm Ctrl + F5 để hard-refresh trình duyệt. Nếu vẫn lỗi, chạy lệnh `npm run clean` (nếu có) hoặc xóa thủ công thư mục `node_modules/.vite` trong thư mục con tương ứng.
