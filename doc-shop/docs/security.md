# Tài Liệu An Ninh & Bảo Mật — DkDocShop 2.0

## 1. Tổng Quan Kiến Trúc An Ninh (Security Model)

DkDocShop 2.0 được thiết kế tuân thủ nguyên tắc **Phòng thủ đa tầng (Defense in Depth)** và **Zero Trust** cho các giao dịch tài chính và quyền sở hữu tài liệu số.

```
+-------------------------------------------------------------+
| Tầng 1: Client Sanitization (DOMPurify, Input Escaping)     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Tầng 2: Access Guards & Auth State (Firebase Auth + Admin)  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Tầng 3: Firebase RTDB Security Rules (Schema & Ownership)   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Tầng 4: Audit Logging & Rate Limiting (AI & Transactions)   |
+-------------------------------------------------------------+
```

---

## 2. Loại Bỏ Hoàn Toàn Lỗ Hổng Native Popups (Zero Browser Popups)

* Toàn bộ mã nguồn loại bỏ 100% các lệnh `window.alert()`, `window.confirm()`, và `window.prompt()`.
* **Rủi ro của Native Popups**:
  1. Gây UI blocking (treo luồng xử lý UI).
  2. Dễ bị khai thác clickjacking hoặc giả mạo thông báo hệ thống của trình duyệt.
  3. Không kiểm soát được kiểu dáng, phông chữ, khả năng truy cập (A11y), và phím tắt.
* **Giải pháp thay thế**:
  - `Toast.js`: Hiển thị thông báo trạng thái không chặn màn hình.
  - `ConfirmDialog.js`: Hộp thoại xác nhận thao tác nhạy cảm (Đăng xuất, Xóa tài liệu, Tạm dừng mã...) với phím ESC/Enter, bẫy tiêu điểm (focus trap), và kiểm soát aria.
  - `Modal.js`: Hộp thoại biểu mẫu tùy biến `openForm` và `promptDialog` bất đồng bộ trả về `Promise<string | null>`.

---

## 3. Bảo Vệ Nội Dung Tài Liệu & Ngăn Chặn Rò Rỉ Link Tải (Document Protection)

1. **Phân Tách Link Xem Thử và Link Chính Thức**:
   - `previewUrl`: Link công khai chứa các trang xem trước đã được làm mờ (watermark) hoặc giới hạn trang.
   - `driveUrl` / `downloadUrl`: Link truy cập tài liệu đầy đủ chỉ được trả về và hiển thị khi người dùng đã sở hữu tài liệu (`purchased === true`).
2. **Kiểm Tra Quyền Sở Hữu (Ownership Verification)**:
   - Trước khi cấp quyền đọc hoặc tải, hệ thống kiểm tra node `users/{uid}/purchased/{docId}` hoặc `purchases/{purchaseId}`.
3. **Giới Hạn Context AI Cho Tài Liệu Chưa Mua (AI Context Boundary)**:
   - Khi người dùng sử dụng DkAI trên tài liệu chưa mua, AI chỉ nhận tối đa 300 từ từ đoạn tóm tắt hoặc xem trước. Tuyệt đối không nạp toàn bộ nội dung tài liệu có phí vào ngữ cảnh AI của người dùng chưa thanh toán.

---

## 4. Bảo Vệ Giao Dịch Số Dư & Nạp Tiền (Wallet Integrity)

1. **Giao Dịch Nạp Tiền 2 Bước**:
   - Bước 1: Người dùng tạo yêu cầu nạp tiền kèm mã chuyển khoản duy nhất `DKNAP_{timestamp}_{uid}`. Yêu cầu ở trạng thái `pending`.
   - Bước 2: Quản trị viên đối soát tài khoản ngân hàng và bấm duyệt trên Admin Command Center.
2. **Khóa Số Dư (Balance Concurrency & Atomic Deduction)**:
   - Khi mua tài liệu, kiểm tra số dư hiện tại `balance >= price`.
   - Ghi đồng thời bản ghi trừ tiền tại `users/{uid}/balance`, tạo hóa đơn mua tại `purchases/{purchaseId}`, và ghi log tại `transactions/{txId}`.
3. **Phòng Chống Gian Lận Client-Side**:
   - Giá tài liệu được xác thực với dữ liệu gốc của Shop, không nhận giá gửi từ phía client.

---

## 5. An Ninh DkAI & Phòng Chống Tấn Công Prompt Injection

1. **HTML Sanitization Với DOMPurify**:
   - Mọi kết quả phản hồi từ mô hình AI đều đi qua pipeline: `renderLatexInText` (KaTeX) -> `DOMPurify.sanitize`.
   - Cấm các thẻ nguy hiểm: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`.
   - Cấm các thuộc tính nguy hiểm: `onerror`, `onload`, `onclick`, `onmouseover`.
2. **Quota Tracking & Rate Limiting**:
   - Giới hạn tối đa 30 yêu cầu AI mỗi ngày cho tài khoản thông thường.
   - Khoảng cách giữa 2 yêu cầu liên tiếp tối thiểu 3 giây.
   - Bộ nhớ đệm AI (TTL 24h) giảm thiểu chi phí và chống spam API.

---

## 6. Nhật Ký An Ninh & Kiểm Toán (Audit Logs)

* Mọi hành động nhạy cảm của Admin đều được tự động ghi vào node `auditLogs`:
  - `USER_SUSPEND`: Khóa hoặc mở khóa tài khoản.
  - `DOC_DELETE` / `DOC_UPDATE`: Sửa đổi tài liệu hoặc giá bán.
  - `DEPOSIT_APPROVE` / `DEPOSIT_REJECT`: Duyệt hoặc từ chối nạp tiền.
  - `PROMO_CREATE` / `PROMO_TOGGLE`: Thay đổi cấu hình coupon.
  - `BANNER_CREATE` / `BANNER_DELETE`: Thay đổi banner marketing.
