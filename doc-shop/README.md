# DkDocShop 2.0 — Shop Tài Liệu Số & Trợ Lý Học Tập Thông Minh DkAI

<p align="center">
  <strong>Nền tảng Shop Tài Liệu Số Chuẩn Hóa • Thư Viện Học Tập Cá Nhân • Document Reader • Ví Điện Tử • DkAI Gemini 3.5 Flash Lite • Admin CMS</strong>
</p>

---

## 1. Giới Thiệu Sản Phẩm (Overview)

**DkDocShop 2.0** là phiên bản nâng cấp toàn diện và chuẩn hóa của DkDocShop — nền tảng thương mại tài liệu số giáo dục chất lượng cao dành cho học sinh THPT (Lớp 10, 11, 12), ôn thi tốt nghiệp THPT Quốc Gia, Đánh Giá Năng Lực (ĐGNL ĐHQG-HCM, ĐHQG Hà Nội) và Đánh Giá Tư Duy (TSA Bách Khoa).

### Định Hướng Cốt Lõi:
* **Shop-First Paradigm**: Tập trung tuyệt đối vào trải nghiệm mua sắm tài liệu nhanh chóng, phân loại chuyên đề rõ ràng, xem thử minh bạch và đọc tài liệu tiện lợi.
* **100% Zero Native Browser Popups**: Tuyệt đối không dùng `alert()`, `confirm()`, hay `prompt()`. Toàn bộ thông báo và hộp thoại đều là custom UI components cao cấp: `Modal`, `ConfirmDialog`, `Toast`, `Drawer`, `ProfileMenu`.
* **DkAI Gemini 3.5 Flash Lite**: Trợ lý gia sư đồng hành tích hợp công thức toán học LaTeX (KaTeX) chuẩn mực, đa phương thức (Ảnh/PDF), tóm tắt tài liệu và chuyển đổi lời giải thành ghi chú hoặc thẻ ghi nhớ Flashcard.
* **Bộ Dữ Liệu Thực Tế (Vietnamese Educational Seed Data)**: Đầy đủ 30 tài liệu, 12 môn học, 8 mã khuyến mãi, 6 gói combo tiết kiệm, 25 đánh giá đã mua hàng, 20 người dùng demo.

---

## 2. Cài Đặt & Khởi Chạy Nhanh (Quick Start)

### Yêu cầu hệ thống:
* **Node.js**: Phiên bản 18+ (Khuyến nghị LTS v20+).
* **npm**: Phiên bản 9+. Trên Windows PowerShell, sử dụng `npm.cmd`.

### Các lệnh thực thi:
```powershell
# 1. Cài đặt các gói thư viện
npm.cmd install

# 2. Khởi chạy máy chủ phát triển (Vite Dev Server)
npm.cmd run dev

# 3. Biên dịch đóng gói sản phẩm (Production Build)
npm.cmd run build

# 4. Xem trước bản đóng gói
npm.cmd run preview
```

---

## 3. Bản Đồ Phân Hệ Tính Năng (Feature Highlights)

### 🏪 Phân Hệ Cửa Hàng (Shop & Marketplace)
1. **Compact Hero Banner (360–450px)**: Bố cục SaaS hiện đại với thẻ tài liệu xếp lớp (stacked cards), bộ đếm tài liệu và carousel tự động.
2. **Trang Chủ 11 Sections**:
   - Hero Banner Carousel
   - Tìm kiếm & Category Pills cuộn mượt
   - Lưới 12 danh mục môn học
   - Tài liệu nổi bật (Featured Row)
   - Tài liệu phổ biến (Popular Grid)
   - Tài liệu miễn phí 0đ (Free Docs)
   - Mã khuyến mãi đang kích hoạt (Promotions & Coupons)
   - Gói Combo chuyên đề tiết kiệm (Bundles & Combos)
   - Tài liệu mới cập nhật (Recently Added)
   - Giới thiệu trợ lý học tập DkAI
   - Footer thông tin & chính sách
3. **Khám Phá Tài Liệu (`#/explore`)**: Bộ lọc đa tiêu chí theo môn học, khối lớp, khoảng giá (Miễn phí / Có phí), sắp xếp theo độ mới, lượt xem và giá bán.
4. **Chi Tiết Tài Liệu (`#/document/:id`)**: Thông tin tác giả, mục lục, số trang, đánh giá đã xác minh (Verified Reviews), đọc thử và modal mua nhanh.
5. **Gói Combo Tiết Kiệm (`#/bundles`)**: Mua combo nhiều chuyên đề với mức giá ưu đãi tiết kiệm đến 40%.
6. **Danh Sách Yêu Thích (`#/favorites`)**: Lưu nhanh tài liệu để theo dõi.

### 📚 Phân Hệ Thư Viện Cá Nhân & Trình Đọc
1. **Thư Viện Thông Minh (`#/library`)**: Quản lý toàn bộ tài liệu đã mua theo thư mục môn học cá nhân.
2. **Kho Tài Liệu Đã Sở Hữu (`#/purchased`)**: Mở khóa link Google Drive / OneDrive tốc độ cao và mã bản quyền duy nhất.
3. **Document Reader Toàn Màn Hình**: Trình đọc tích hợp chế độ đọc ban đêm, chuyển trang mượt mà, ghi chú nhanh và đánh dấu trang.
4. **Sổ Tay Ghi Chú (`#/notes`)**: Ghi chú kiến thức có màu sắc, gắn thẻ môn học, tìm kiếm nhanh và liên kết với lời giải của DkAI.
5. **Thẻ Ghi Nhớ Flashcard (`#/flashcards`)**: Ôn tập kiến thức lặp lại ngắt quãng (Spaced Repetition System) với hiệu ứng lật thẻ 3D.

### 🤖 Phân Hệ Trợ Lý DkAI Learning Studio (`#/ai`)
* Tích hợp mô hình `gemini-3.5-flash-lite` thế hệ mới.
* **Chế độ đa dạng**: Gia sư lý thuyết, Giải bài tập chi tiết, Tóm tắt trọng tâm, Tự động tạo thẻ Flashcard.
* **Kết xuất công thức toán học KaTeX**: Công thức LaTeX `$$...$$` và `\(...\)` sắc nét, tự động căn giữa và hiển thị đẹp mắt.
* **Hỗ trợ đính kèm tệp**: Tải lên ảnh chụp đề bài hoặc tệp PDF để DkAI phân tích.
* **Hành động 1 chạm**: Sao chép lời giải, Lưu vào Ghi chú, Tạo Flashcard.

### 💳 Phân Hệ Ví & Giao Dịch (`#/wallet`)
1. **Số Dư Trực Quan**: Quản lý tiền nạp an toàn, minh bạch.
2. **Nạp Tiền VietQR**: Mã QR ngân hàng kèm nội dung chuyển khoản tự động duy nhất `DKNAP_{timestamp}_{uid}`.
3. **Lịch Sử Giao Dịch (`#/transactions`)**: Tra cứu chi tiết từng biến động số dư nạp và chi tiêu mua tài liệu.

### 🛡️ Phân Hệ Quản Trị (Admin Command Center — `#/admin`)
* **Tổng quan**: Dashboard KPI doanh thu, số lượng học sinh, tài liệu và giao dịch.
* **Tài liệu**: Thêm mới, chỉnh sửa, ghim nổi bật, tải lên ảnh bìa.
* **Người dùng**: Tra cứu, phân quyền Admin, khóa/mở tài khoản.
* **Giao dịch**: Phê duyệt yêu cầu nạp tiền, từ chối giao dịch sai cú pháp.
* **Banners**: Quản lý banner Hero, cấu hình thứ tự ưu tiên, xem trước giao diện.
* **Combos**: Quản lý gói tài liệu chuyên đề, thiết lập giá gốc và giá combo.
* **Khuyến mãi**: Cấu hình mã coupon chiết khấu phần trăm hoặc số tiền cố định.
* **Thông báo**: Phát tin tức toàn sàn đến học sinh.
* **Báo cáo**: Xử lý phản ánh chất lượng tài liệu từ người mua.
* **Nhật ký an ninh (Audit Logs)**: Ghi vết toàn bộ thao tác nhạy cảm của quản trị viên.
* **Sao lưu dữ liệu**: Xuất và nạp dữ liệu hệ thống an toàn.

---

## 4. Danh Mục Tài Liệu Kỹ Thuật (Documentation Index)

| Tài Liệu | Đường Dẫn | Nội Dung |
| :--- | :--- | :--- |
| **Kiến Trúc Hệ Thống** | [`docs/architecture.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/architecture.md) | Phân tầng kiến trúc, cấu trúc thư mục, định tuyến SPA và flow dữ liệu |
| **Bảo Mật & An Ninh** | [`docs/security.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/security.md) | Triệt tiêu native popups, xác thực quyền sở hữu, phòng chống gian lận số dư |
| **Tài Liệu DkAI** | [`docs/ai.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/ai.md) | Chi tiết tích hợp Gemini 3.5 Flash Lite, KaTeX rendering, DOMPurify |
| **Dữ Liệu Khởi Tạo** | [`docs/seed-data.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/seed-data.md) | Thống kê và cấu trúc bộ dữ liệu mẫu giáo dục Việt Nam chuẩn hóa |
| **Hướng Dẫn Triển Khai** | [`docs/deployment.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/deployment.md) | Cấu hình biến môi trường, đóng gói bản build, triển khai Firebase Hosting |
| **Firebase Schema** | [`docs/firebase-schema.md`](file:///d:/VsCode/Web/MyWeb/doc-shop/docs/firebase-schema.md) | Cấu trúc dữ liệu chi tiết các node Realtime Database |

---

## 5. Giấy Phép & Bản Quyền
Dự án được bảo vệ bản quyền thuộc về **DkDocShop — Hệ Sinh Thái Tài Liệu Số 2.0**.
Mọi hành vi sao chép trái phép đều bị nghiêm cấm.
