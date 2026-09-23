# Mô Hình An Ninh & Bảo Mật Hệ Thống DkDocShop 2.0 (Security Model)

Tài liệu này xác định toàn bộ mô hình bảo mật, kiểm soát truy cập phân quyền (RBAC), phòng vệ gian lận tài chính, bảo vệ bí mật hệ thống và cơ chế ghi vết kiểm toán cho nền tảng DkDocShop 2.0.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Zero Trust Client**: Trình duyệt phía người dùng (Client-side) không bao giờ được coi là một ranh giới bảo mật tin cậy. Bất kỳ giá trị nào do Client gửi lên (như số dư ví, giá tài liệu, cờ quyền admin) đều không được tin tưởng mà phải được kiểm tra qua logic máy chủ hoặc các điều kiện kiểm tra nghiêm ngặt trong Firebase Security Rules.
2. **Ngăn Chặn Rò Rỉ Bí Mật (No Secrets in Frontend)**:
   - Webhook Discord URL, API Key của OpenAI/Gemini và Private Keys không được biên dịch trực tiếp vào mã nguồn JavaScript công khai.
   - Các tác vụ nhạy cảm phải được định tuyến qua Serverless Functions hoặc Cloudflare Workers.
3. **Phòng Ngừa XSS Toàn Diện**:
   - Toàn bộ dữ liệu do người dùng hoặc dữ liệu tài liệu nhập vào (tiêu đề, nhận xét, mô tả, nội dung ghi chú) đều được làm sạch thông qua hàm `safe()` và `escapeHtml()` trước khi chèn vào DOM.
4. **Kiểm Soát Tải Tệp (Strict File Validation)**:
   - Giới hạn kích thước tệp tải lên tối đa 5MB.
   - Kiểm tra MIME type nghiêm ngặt: chỉ cho phép định dạng ảnh hợp lệ (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).

---

## 2. Kiểm Soát Truy Cập Phân Quyền (RBAC)

Hệ thống định nghĩa 4 cấp độ quyền hạn rõ ràng:

| Vai trò (Role) | Phạm vi quyền hạn | Cơ chế xác thực |
| :--- | :--- | :--- |
| **Khách vãng lai (Guest)** | Xem trang chủ, xem danh mục tài liệu công khai, xem đánh giá, làm thử các câu hỏi trắc nghiệm demo, tương tác cơ bản với DkAI. | Không yêu cầu đăng nhập. |
| **Học sinh (Student)** | Mua tài liệu, nạp tiền vào ví, mở tài liệu & key đã mua, viết ghi chú, ôn flashcard, lưu tiến độ đọc, đánh giá tài liệu đã mua. | Firebase Authentication (Google OAuth). |
| **Người bán (Seller)** | Đăng tải tài liệu, theo dõi doanh số, quản lý đơn hàng của tài liệu mình bán, gửi yêu cầu rút tiền đối soát. | Tài khoản học sinh được duyệt tư cách Tác giả. |
| **Quản trị viên (Admin)** | Toàn quyền kiểm duyệt tài liệu, phê duyệt/từ chối nạp tiền, nạp tiền mặt trực tiếp, quản lý người dùng, cấu hình kho key, xem audit logs. | Xác minh quyền qua bản ghi bảo mật `users/{uid}/role === 'admin'`. |

---

## 3. Bảo Vệ Giao Dịch & Ví Tiền (Financial Integrity)

1. **Quy trình nạp tiền 3 bước minh bạch**:
   - Bước 1: Chọn mệnh giá nạp tiền.
   - Bước 2: Hệ thống sinh mã giao dịch duy nhất kèm cú pháp chuyển khoản và mã QR VietQR.
   - Bước 3: Học sinh bấm xác nhận đã chuyển khoản; trạng thái được tạo ở dạng `pending` (Chờ duyệt). Số dư ví **chỉ được cộng** sau khi Quản trị viên đối soát với tài khoản ngân hàng và bấm "Phê duyệt" trong Admin Command Center.
2. **Khắc phục lỗi lộ tài liệu đã mua (Legacy Purchase Resolution Bug)**:
   - Ở mã nguồn cũ, truy vấn tìm kiếm đơn mua không lọc theo `userId`, dẫn đến việc tài khoản này có thể nhìn thấy link và key của tài khoản khác.
   - Trong DkDocShop 2.0, `PurchaseService` áp dụng bộ lọc bắt buộc `p.userId === currentUserId && p.docId === docId`.

---

## 4. Chống Gian Lận Kho Key (UniqueKey Integrity)

1. **Phân bổ đơn nhất (Single Allocation)**:
   - Mỗi key trong kho `uniqueKeyPools` sau khi được cấp phát cho một đơn hàng sẽ được đánh dấu `usedCount: 1` và gán thuộc tính `assignedTo: userId`.
   - Các tiến trình mua hàng đồng thời (concurrent purchases) được kiểm tra khóa phân bổ để ngăn chặn việc cấp trùng 1 key cho 2 người khác nhau.
2. **Điều kiện cấp lại key (Reissue Policy)**:
   - Tự động cấp lại key mới chỉ được kích hoạt khi tài khoản đã đăng nhập key cũ ít nhất 1 lần (xác nhận qua `keyUsageLogs`) và gửi báo cáo sự cố hợp lệ.

---

## 5. Nhật Ký Kiểm Toán (Immutable Audit Logs)

Mọi thao tác quản trị nhạy cảm đều tự động sinh ra một bản ghi trong node `auditLogs`:
* Đăng nhập Admin
* Xóa tài liệu hoặc tài khoản
* Điều chỉnh thủ công số dư ví người dùng
* Phê duyệt hoặc từ chối yêu cầu nạp tiền / rút tiền
* Phát thông báo toàn hệ thống
* Thay đổi trạng thái tính năng (Feature Flags)

Bản ghi nhật ký lưu giữ thời gian, định danh quản trị viên, hành vi, đối tượng bị tác động và địa chỉ IP kết nối để phục vụ tra cứu hồi tố khi có tranh chấp.
