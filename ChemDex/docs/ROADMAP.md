# Lộ Trình Phát Triển ChemDex (Roadmap)

Dự án ChemDex đã trải qua nhiều giai đoạn tiến hóa. Dưới đây là các cột mốc đã hoàn thành và những dự định trong tương lai để đưa ChemDex trở thành Siêu Ứng Dụng Hóa Học (Super App) hàng đầu.

---

## 🟢 Đã Hoàn Thành (Tháng 8/2026)

### 1. Nâng cấp Giao diện & Kiến trúc
- [x] Chuyển đổi từ dự án HTML tĩnh đơn lẻ sang Hệ sinh thái 5 phân hệ chạy chung 1 server Node/Express (Port 5500).
- [x] Áp dụng kiến trúc Micro-frontend qua Vite SPAs.
- [x] Xây dựng UI/UX cực kỳ cao cấp, sử dụng Glassmorphism, Tailwind, và Dark Mode chuẩn xác.

### 2. Đấu Trường Hóa Học (ChemArena)
- [x] Ra mắt hệ thống thi đấu thời gian thực qua Firebase Firestore.
- [x] Tính năng "Phòng chờ", "Ghép trận tự động", tính điểm xếp hạng, và Luyện tập.

### 3. Tích hợp Siêu Trí Tuệ (Gemini AI)
- [x] Chatbot ngữ cảnh ẩn API Key ở Backend, hỗ trợ LaTeX cho Toán và Hóa.
- [x] Tích hợp AI kiểm duyệt (Moderation) các bài đăng độc hại trên Diễn Đàn.
- [x] Công cụ AI Nhận diện & Giải phương trình hóa học.

### 4. Bảng Tuần Hoàn 3D
- [x] Xây dựng đồ họa Hạt nhân 3D (Protons/Neutrons) tương tác vật lý cực mượt bằng WebGL.
- [x] Mô phỏng cấu trúc mạng tinh thể 3D (BCC, FCC, HCP).

---

## 🟡 Đang Thực Hiện (Current Focus)

- Cập nhật kho dữ liệu (Database): Bổ sung đủ dữ liệu chi tiết cho 118 nguyên tố thay vì chỉ vài chục nguyên tố phổ biến.
- Tối ưu hóa SEO: Triển khai Server-Side Rendering (SSR) hoặc Meta Tags động cho các bài viết diễn đàn.
- Tích hợp đăng nhập bằng Google/Facebook (Social Auth) qua Firebase thay vì chỉ đăng nhập tài khoản tự do.

---

## 🔴 Kế Hoạch Tương Lai (Future Vision)

### Giai đoạn 1: Mô phỏng Vật lý Hóa học Cao cấp (Q4/2026)
- Xây dựng Module **Phòng Thí Nghiệm Ảo (Virtual Lab)**. Người dùng có thể kéo thả bình chứa hóa chất (Ví dụ: Cho HCl vào NaOH) và xem phản ứng vật lý (màu sắc, nhiệt độ, bọt khí) mô phỏng qua Three.js và Shader.

### Giai đoạn 2: Tương tác Đa nền tảng (Q1/2027)
- Đóng gói ChemDex thành ứng dụng **Mobile App** (React Native hoặc PWA).
- Đồng bộ hóa tài khoản đa thiết bị để lưu trữ lịch sử thi đấu, bài viết yêu thích.

### Giai đoạn 3: Hệ Sinh Thái AI Toàn Diện (Q2/2027)
- Cho phép tải lên (Upload) một tài liệu PDF đề thi, AI sẽ tự động phân tách đề thi thành các trận đấu Arena, trích xuất dữ liệu, và đưa vào kho "Luyện tập".
- Hỗ trợ AR (Thực Tế Ảo Tăng Cường): Soi camera điện thoại vào không gian để xem hạt nhân nguyên tử 3D lơ lửng trong không khí.
