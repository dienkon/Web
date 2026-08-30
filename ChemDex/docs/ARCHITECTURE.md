# Kiến Trúc Hệ Thống ChemDex (Bản Cập Nhật 2026)

## 1. Tổng Quan Kiến Trúc (Hệ Sinh Thái Hybrid)

ChemDex đã phát triển từ một trang web tĩnh đơn giản (HTML/CSS/JS) thành một **Hệ sinh thái đồ sộ (Hybrid Architecture)**, bao gồm:
- **Core (Lõi Bảng Tuần Hoàn)**: Giao diện thuần tĩnh tối ưu tốc độ.
- **Backend (Node.js/Express)**: Server trung tâm hợp nhất các ứng dụng.
- **Frontend SPAs (React/Vite)**: 4 phân hệ chính đóng vai trò như các Micro-frontend.
- **BaaS (Firebase)**: Quản lý xác thực, cơ sở dữ liệu thời gian thực (Real-time).
- **AI (Gemini SDK)**: Tích hợp AI toàn diện ở cấp độ Server.

---

## 2. Các Khối Chức Năng Chính (Micro-Frontends)

Hệ thống được chia thành 5 phân hệ (modules) hoạt động song song trên cùng một domain (qua port `5500`):

### 2.1. Phân Hệ Core (Bảng Tuần Hoàn & Giao Diện Chính)
- **Vị trí**: Nằm tại thư mục gốc của dự án.
- **Công nghệ**: HTML5, Vanilla JavaScript, CSS, Three.js.
- **Nhiệm vụ**: Tải nhanh chóng bảng tuần hoàn 118 nguyên tố. Render cấu trúc tinh thể (Crystals) và hạt nhân (Protons/Neutrons) bằng WebGL (Three.js) mượt mà không phụ thuộc framework lớn.

### 2.2. Phân Hệ `dau-truong/` (ChemArena - Đấu Trường Hóa Học)
- **Công nghệ**: React, Vite, Zustand (Quản lý state), Tailwind CSS, Firebase.
- **Nhiệm vụ**: Game tương tác thời gian thực. Hỗ trợ tạo phòng (Rooms), ghép trận (Matchmaking), thi đấu đồng bộ realtime qua Firestore, hệ thống bảng xếp hạng, luyện tập.

### 2.3. Phân Hệ `trung-tam/` (Thư Viện Số & Diễn Đàn)
- **Công nghệ**: React, Vite, Tailwind CSS, Firebase, React Markdown.
- **Nhiệm vụ**: 
  - Đọc tài liệu, PDF, hiển thị Markdown phức tạp (có render công thức toán LaTeX).
  - Diễn đàn cộng đồng: Đăng bài, bình luận, chia sẻ file đính kèm.

### 2.4. Phân Hệ `tien-ich/phuong-trinh/` (Bộ Công Cụ AI)
Chứa 2 ứng dụng nhỏ:
- `nhan-dien-pthh-thong-minh`: AI phân tích hình ảnh, text để giải quyết và cân bằng phương trình hóa học.
- `chuoi-phan-ung`: Công cụ gợi ý và tra cứu chuỗi phản ứng liên hoàn.

---

## 3. Kiến Trúc Backend (Node.js/Express)

Toàn bộ hệ sinh thái chạy xoay quanh một **Server Trung Tâm (`server.ts` - nằm tại thư mục trung-tam)**. 

### 3.1. Chế Độ Development (`run-dev.bat`)
- Express Server chạy ở port `5500`.
- 4 **Vite Dev Server Middlewares** được khởi chạy song song (cho 4 SPAs) trên các port HMR độc lập (24678, 24679, 24680, 24681).
- Trả về file tĩnh của Core từ thư mục gốc cho các request không thuộc SPA.
=> Điều này giúp Code ở bất kỳ thư mục nào cũng được **Hot-Reload** ngay lập tức.

### 3.2. Chế Độ Production (`build-and-run.bat`)
- Trình biên dịch (Vite) sẽ `build` cả 4 dự án thành các thư mục `dist/`.
- File `build.js` sẽ tự động sao chép các tệp đã build vào đúng cấu trúc thư mục.
- Express Server sẽ chuyển sang chế độ phục vụ **Static Files**. Các request vào SPAs (`/dau-truong/*`, `/trung-tam/*`) sẽ được Route Fallback trả về đúng `index.html` của phân hệ đó.

### 3.3. API Trí Tuệ Nhân Tạo (Gemini)
Server quản lý trực tiếp Google GenAI SDK thay vì gọi từ Client (để bảo mật API KEY).
- `POST /api/ask`: Trợ lý AI trả lời câu hỏi hóa học tổng quát.
- `POST /api/chat`: Hỗ trợ giao diện Chat.
- `POST /api/moderate`: **AI Kiểm Duyệt Nội Dung** (Tự động quét bài đăng trên diễn đàn xem có vi phạm tiêu chuẩn cộng đồng hay không).
- `POST /api/search-posts`: AI phân tích ngữ nghĩa, so khớp bài đăng diễn đàn với từ khóa tìm kiếm.

---

## 4. Kiến Trúc Dữ Liệu (Data Layer)

### 4.1. Local JSON (Tra Cứu Tốc Độ Cao)
- `data/manifest.json` và `data/elements/*.json`: Lưu cấu hình 118 nguyên tố. Được thiết kế tối giản để tải trong vài mili-giây, phục vụ Core UI.
- Local Storage & Session Storage: Cache dữ liệu bảng tuần hoàn, cấu hình theme.

### 4.2. Firebase Firestore (Cloud Database)
- Database chính cho Đấu Trường và Cộng Đồng.
- Phân tách theo Collections: `users` (Hồ sơ), `rooms` (Phòng thi đấu), `matches` (Lịch sử trận), `posts` (Bài viết).
- Sử dụng **Firestore Listeners (onSnapshot)** để đồng bộ Realtime trạng thái game (người chơi vào phòng, câu hỏi đang hiển thị, điểm số).

---

## 5. Tư Duy Thiết Kế & Ưu Điểm 

1. **Hiệu năng & Khả năng Mở rộng (Scalability)**: Tách các phân hệ nặng (React) ra khỏi Core. Bảng tuần hoàn truy cập tức thì (0 loading screen). Khi vào Đấu trường/Cộng đồng, chỉ tải SPA liên quan.
2. **Bảo mật (Security)**: API Key AI được giấu hoàn toàn ở phía Backend. Firestore được bảo vệ bằng Security Rules mạnh mẽ.
3. **Môi trường Phát triển Thống nhất (Unified Dev Environment)**: Nhờ `server.ts` proxy, toàn bộ Front-end phức tạp cùng Backend API chung sống hòa bình trên đúng một Port (`5500`), không gặp bất kỳ lỗi CORS nào.
