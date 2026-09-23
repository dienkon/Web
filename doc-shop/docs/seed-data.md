# Dữ Liệu Khởi Tạo Thực Tế — DkDocShop 2.0 Seed Data

## 1. Mục Đích & Nguyên Tắc Thiết Kế Dữ Liệu Seed

Để đảm bảo hệ thống luôn hoạt động đầy đủ, sinh động ngay cả khi cơ sở dữ liệu Firebase còn trống hoặc trong môi trường phát triển ngoại tuyến, DkDocShop 2.0 cung cấp bộ dữ liệu mẫu **thuần Việt, chuẩn sư phạm và thực tế 100%**:
- Không sử dụng văn bản giả "Lorem Ipsum".
- Tiêu đề tài liệu, giá bán, chuyên đề, môn học và cấp lớp bám sát thực tế chương trình giáo dục phổ thông Việt Nam (THPT 2018 & Luyện thi ĐGNL).
- Dữ liệu được tổ chức độc lập trong `src/data/seed/` và tự động nạp vào Store khi kho dữ liệu rỗng.

---

## 2. Thống Kê Chi Tiết Bộ Dữ Liệu Seed

| Đối Tượng | Tệp Nguồn | Số Lượng | Đặc Điểm Dữ Liệu |
| :--- | :--- | :---: | :--- |
| **Danh Mục (Categories)** | `categories.seed.js` | **12** | Đủ các môn: Toán, Lý, Hóa, Sinh, Văn, Anh, Sử, Địa, GDCD, Tin học, ĐGNL HCM, TSA Bách Khoa. |
| **Môn Học (Subjects)** | `subjects.seed.js` | **8** | Môn học trọng tâm kèm icon và màu nhận diện thương hiệu. |
| **Tài Liệu (Documents)** | `documents.seed.js` | **30** | 10 tài liệu nổi bật (`featured: true`), 8 tài liệu miễn phí (`price: 0`), đầy đủ mục lục, số trang, dung lượng file và link xem trước. |
| **Banner Quảng Cáo** | `banners.seed.js` | **10** | Banner Hero, DkAI, Combo, Khuyến mãi, Kỳ thi ĐGNL với phân loại độ ưu tiên. |
| **Gói Combo (Bundles)** | `bundles.seed.js` | **6** | Combo Toán 12, Combo KHTN 12, Gói ĐGNL HCM, Bộ TSA Bách Khoa... chiết khấu từ 20% đến 40%. |
| **Mã Giảm Giá (Promotions)** | `promotions.seed.js` | **8** | Mã giảm % (DKDOCSHOP 20%, THPT2027 15%) và giảm tiền cố định (TIETKIEM10K, HOCSINHGIOI 50K). |
| **Đánh Giá (Reviews)** | `reviews.seed.js` | **25** | Đánh giá chân thực từ học sinh kèm huy hiệu "Đã mua tài liệu" (`verified: true`), số sao 4-5. |
| **Người Dùng Demo** | `users.seed.js` | **20** | Tài khoản Admin, thành viên VIP, học sinh lớp 10-12 các trường THPT Chuyên toàn quốc. |
| **Lịch Sử Giao Dịch** | `transactions.seed.js`| **20** | Giao dịch nạp tiền qua QR VietQR, cộng tiền khuyến mãi, trừ tiền mua combo. |
| **Hóa Đơn Mua** | `purchases.seed.js` | **15** | Lịch sử mua tài liệu thành công kèm mã giao dịch và thời gian mở khóa. |
| **Thông Báo Người Dùng** | `notifications.seed.js`| **20** | Thông báo biến động số dư, quà tặng chào mừng, tài liệu mới phát hành. |
| **Thông Báo Hệ Thống** | `announcements.seed.js`| **10** | Thông báo bảo trì, lịch thi THPT, sự kiện ưu đãi đầu năm học. |
| **Nhật Ký Kiểm Toán** | `audit-logs.seed.js` | **20** | Nhật ký thao tác của quản trị viên phục vụ kiểm toán an ninh. |

---

## 3. Cách Thức Hoạt Động & Cơ Chế Fallback Trong Runtime

1. **Khi khởi động (`src/app/bootstrap.js`)**:
   - Hệ thống tải danh mục và tài liệu từ Firebase RTDB.
   - Nếu dữ liệu trả về rỗng (hoặc Firebase offline), hệ thống lập tức nạp `SEED_DOCUMENTS`, `SEED_CATEGORIES`, `SEED_BANNERS`, `SEED_BUNDLES` vào `store`.
2. **Không bao giờ hiển thị màn hình trống**:
   - Trang chủ luôn hiển thị đầy đủ 11 sections.
   - Trang Khám phá luôn có sẵn 30 tài liệu để lọc và tìm kiếm.
   - Người dùng mới trải nghiệm mượt mà không gặp màn hình trống trơn.
