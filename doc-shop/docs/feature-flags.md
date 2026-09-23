# Quản Lý Cờ Tính Năng (Feature Flags) - DkDocShop 2.0

DkDocShop 2.0 tích hợp kiến trúc Feature Flags cho phép Quản trị viên kích hoạt hoặc tạm dừng các phân hệ tính năng mà không cần phải can thiệp trực tiếp vào mã nguồn hay triển khai lại ứng dụng.

---

## 1. Cấu Hình Mặc Định (`src/app/constants.js`)

```javascript
export const DefaultFeatureFlags = {
  aiEnabled: true,           // Trợ lý học tập DkAI
  sellerEnabled: true,       // Kênh người bán & tác giả tài liệu
  flashcardsEnabled: true,   // Hệ thống Flashcard lặp lại ngắt quãng
  quizEnabled: true,         // Động cơ thi thử trắc nghiệm
  gamificationEnabled: true, // Điểm XP, cấp bậc, huy hiệu & chuỗi học
  darkModeEnabled: true,     // Chế độ nền tối (Dark Mode)
  reviewsEnabled: true,      // Đánh giá & nhận xét từ học sinh
  promotionsEnabled: true,   // Mã giảm giá coupon & chiến dịch khuyến mãi
};
```

---

## 2. Chi Tiết Từng Cờ Tính Năng

### 2.1. `aiEnabled` (Trợ lý DkAI)
* **Mục đích**: Bật/tắt phân hệ gia sư học tập DkAI.
* **Hành vi khi tắt**: Ẩn mục DkAI trên thanh điều hướng bên và thanh điều hướng đáy mobile; hiển thị thông báo "Trợ lý AI đang được bảo trì nâng cấp dữ liệu".

### 2.2. `sellerEnabled` (Kênh Người Bán)
* **Mục đích**: Bật/tắt cổng đăng ký tác giả và gian hàng cá nhân.
* **Hành vi khi tắt**: Chặn đăng tải tài liệu mới từ người dùng ngoài; chỉ quản trị viên mới có thể đăng tài liệu lên hệ thống.

### 2.3. `flashcardsEnabled` & `quizEnabled`
* **Mục đích**: Bật/tắt các công cụ tự học và luyện thi thử trắc nghiệm.

### 2.4. `gamificationEnabled`
* **Mục đích**: Tạm dừng tích lũy điểm thưởng XP hoặc xếp hạng tuần khi hệ thống đang trong giai đoạn chuyển mùa hoặc chuẩn bị tổng kết năm học.

### 2.5. `promotionsEnabled`
* **Mục đích**: Tắt nhanh toàn bộ các mã giảm giá trong các đợt cao điểm hoặc bảo trì chương trình khuyến mãi.
