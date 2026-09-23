# Firebase Realtime Database Schema Documentation - DkDocShop 2.0

Tài liệu đặc tả toàn diện cấu trúc cơ sở dữ liệu Firebase Realtime Database cho cả Primary Database (`dienkon-doc-shop-default-rtdb`) và Secondary Database (`uniquekey-a0912-default-rtdb`).

---

## 1. Primary Database: `dienkon-doc-shop-default-rtdb`

Root data path prefix:
`artifacts/{appId}/public/data/` (Default `appId`: `default-app-id-uniquekey`)

### 1.1. Collection: `documents`
Lưu trữ danh mục tài liệu học tập, giáo trình, đề thi trắc nghiệm và chuyên đề ôn thi.
* **Path**: `artifacts/{appId}/public/data/documents/{docId}`
* **Read Access**: Public (Khách vãng lai & Học sinh đăng nhập)
* **Write Access**: Admin only (Tăng `views`/`buys` được phép qua transaction)
* **Owner Service**: `src/services/document.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID định danh duy nhất của tài liệu |
| `title` | `string` | Yes | Tiêu đề tài liệu |
| `description` | `string` | No | Mô tả chi tiết nội dung tài liệu |
| `subject` | `string` | Yes | Môn học (Toán Học, Vật Lý, Hóa Học, Tiếng Anh...) |
| `category` | `string` | Yes | Danh mục phân loại |
| `keywords` | `array[string]` | No | Từ khóa tìm kiếm |
| `grade` | `string` | No | Khối lớp ("10", "11", "12", "ĐGNL") |
| `price` | `number` | Yes | Giá bán bằng VND (0 = miễn phí) |
| `thumbnail` | `string` | No | Ảnh bìa tài liệu Cloudinary |
| `previewLink` | `string` | No | Ảnh/PDF xem trước watermark |
| `links` | `array[object]` | No | Danh sách liên kết tải Google Drive |
| `keyPoolId` | `string` | No | ID kho UniqueKey nếu tài liệu yêu cầu key kích hoạt |
| `views` | `number` | Yes | Tổng số lượt xem |
| `buys` | `number` | Yes | Tổng số lượt mua |
| `featured` | `boolean` | No | Ghim lên banner nổi bật đầu trang chủ |

---

### 1.2. Collection: `users`
Hồ sơ học sinh, thông tin trường lớp, vai trò và số dư ví.
* **Path**: `artifacts/{appId}/public/data/users/{uid}`
* **Read Access**: Bản ghi của chính user; Admin có quyền đọc tất cả
* **Write Access**: Học sinh cập nhật họ tên & lớp; Admin cập nhật số dư, vai trò
* **Owner Service**: `src/services/user.service.js`, `src/services/auth.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | Yes | Auth UID |
| `email` | `string` | Yes | Email tài khoản Google |
| `name` | `string` | Yes | Họ và tên học sinh |
| `class` | `string` | Yes | Lớp học (VD: "12A1") |
| `school` | `string` | No | Tên trường THPT |
| `role` | `string` | Yes | `"admin"` hoặc `"user"` |
| `walletBalance` | `number` | Yes | Số dư ví tiền hiện tại (VND) |

---

### 1.3. Collection: `purchases`
Lưu trữ giao dịch mua tài liệu và liên kết mở tài liệu / key bản quyền.
* **Path**: `artifacts/{appId}/public/data/purchases/{purchaseId}`
* **Read Access**: Chủ sở hữu đơn hàng (`userId === auth.uid`); Admin có quyền đọc tất cả
* **Write Access**: Service tạo sau khi trừ số dư thành công
* **Owner Service**: `src/services/purchase.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Mã đơn mua hàng duy nhất |
| `userId` | `string` | Yes | UID học sinh mua |
| `docId` | `string` | Yes | ID tài liệu đã mua |
| `docTitle` | `string` | Yes | Tiêu đề tài liệu |
| `docPrice` | `number` | Yes | Số tiền đã thanh toán sau giảm giá |
| `assignedKey`| `string` | No | Mã key bản quyền cấp phát |
| `redeemUrl` | `string` | No | URL mở key trực tiếp |
| `purchasedAt`| `number` | Yes | Timestamp thời điểm mua |

---

### 1.4. Collection: `notes` (2.0 New)
Sổ tay ghi chú học tập cá nhân của học sinh.
* **Path**: `artifacts/{appId}/public/data/notes/{uid}/{noteId}`
* **Read/Write Access**: Riêng từng người dùng (`auth.uid === uid`)
* **Owner Service**: `src/services/notes.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID ghi chú |
| `title` | `string` | Yes | Tiêu đề ghi chú |
| `text` | `string` | Yes | Nội dung công thức, mẹo giải |
| `docId` | `string` | No | ID tài liệu đính kèm (nếu ghi chú từ tài liệu) |
| `page` | `number` | No | Trang tài liệu tương ứng |
| `color` | `string` | Yes | Mã màu hiển thị (`emerald`, `blue`, `amber`, `purple`) |
| `pinned` | `boolean` | Yes | Có ghim lên đầu hay không |
| `tags` | `array[string]` | No | Nhãn phân loại môn học |

---

### 1.5. Collection: `flashcardDecks` & `flashcards` (2.0 New)
Hệ thống thẻ ghi nhớ ngắt quãng (Spaced Repetition System).
* **Path**: `artifacts/{appId}/public/data/flashcardDecks/{uid}/{deckId}`
* **Read/Write Access**: Riêng từng người dùng (`auth.uid === uid`)
* **Owner Service**: `src/services/flashcard.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID bộ thẻ |
| `title` | `string` | Yes | Tên bộ thẻ (VD: Từ vựng Unit 1) |
| `subject` | `string` | Yes | Môn học tương ứng |
| `cards` | `array[object]` | Yes | Danh sách thẻ con `{ id, front, back, example, interval, reps, status }` |

---

### 1.6. Collection: `quizAttempts` (2.0 New)
Lịch sử làm bài thi thử trắc nghiệm và điểm số đạt được.
* **Path**: `artifacts/{appId}/public/data/quizAttempts/{uid}/{attemptId}`
* **Read/Write Access**: Riêng từng người dùng (`auth.uid === uid`)
* **Owner Service**: `src/services/quiz.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID lượt làm bài |
| `quizId` | `string` | Yes | ID đề thi |
| `quizTitle` | `string` | Yes | Tiêu đề đề thi |
| `correctCount`| `number` | Yes | Số câu trả lời đúng |
| `totalQuestions`| `number`| Yes | Tổng số câu trong đề |
| `scorePct` | `number` | Yes | Điểm số phần trăm (0 - 100%) |
| `timeSpentSeconds`| `number`| Yes | Thời gian làm bài tính bằng giây |

---

### 1.7. Collection: `reviews` (2.0 New)
Đánh giá và bình luận từ học sinh đã mua tài liệu.
* **Path**: `artifacts/{appId}/public/data/reviews/{docId}/{reviewId}`
* **Read Access**: Public (Ai cũng có thể xem đánh giá)
* **Write Access**: Học sinh đã mua tài liệu hoặc Admin kiểm duyệt
* **Owner Service**: `src/services/review.service.js`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID đánh giá |
| `userId` | `string` | Yes | UID người viết đánh giá |
| `userName` | `string` | Yes | Tên hiển thị người đánh giá |
| `userClass`| `string` | No | Lớp học |
| `rating` | `number` | Yes | Số sao đánh giá (1 đến 5 sao) |
| `comment` | `string` | Yes | Nội dung nhận xét |
| `verified` | `boolean` | Yes | Xác nhận đã mua hàng thực tế |

---

### 1.8. Collection: `announcements` & `promotions` (2.0 New)
Thông báo phát sóng toàn sàn và cấu hình mã giảm giá coupon.
* **Path**: `artifacts/{appId}/public/data/announcements` & `promotions`
* **Read Access**: Public
* **Write Access**: Admin only
* **Owner Service**: `src/services/promotion.service.js`

---

### 1.9. Collection: `auditLogs` (2.0 New)
Nhật ký kiểm toán an ninh và thao tác của quản trị viên.
* **Path**: `artifacts/{appId}/public/data/auditLogs/{logId}`
* **Read/Write Access**: Admin only
* **Owner Service**: `src/modules/admin/audit-logs/`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | ID nhật ký |
| `actor` | `string` | Yes | Quản trị viên hoặc hệ thống thực hiện |
| `action` | `string` | Yes | Hành vi thực hiện (Phê duyệt nạp tiền, xóa...) |
| `target` | `string` | Yes | Mã đối tượng bị tác động |
| `timestamp`| `number` | Yes | Thời điểm xảy ra |

---

## 2. Secondary Database: `uniquekey-a0912-default-rtdb`

Root path prefix: `artifacts/{appId}/public/data/`

* `uniqueKeyPools/{poolId}`: Quản lý kho key độc lập.
* `keyAllocations/{allocationId}`: Bản ghi cấp phát key theo tài liệu và người dùng.
