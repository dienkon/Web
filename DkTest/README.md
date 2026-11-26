# DkTEST - Exam Management System

DkTEST is a modern, clean, and minimalist examination system built with React, Vite, Tailwind CSS, and Firebase.

## Ứng dụng Android (APK), iOS và đề thi offline

Phiên bản hiện tại: **2.0.4**, Android `versionCode=28`. Xem [changelog](CHANGELOG.md) và [audit phiên bản](docs/audits/2.0.4.md). Xem trước lời giải chỉ nằm ở màn hình trước khi bắt đầu (cả luồng Online lẫn Offline qua `ExamIntro` / `OfflineExamSetup`), không xuất hiện trong lúc làm bài trên web/app.

Chạy `npm run android:apk` để tạo `releases/DkTEST-2.0.4-debug.apk`. Đối với **iOS (iPhone / iPad)**, người dùng có thể cài đặt ngay ứng dụng toàn màn hình qua hồ sơ Apple Web Clip 1 chạm (`/api/app-download?platform=ios`, `.mobileconfig`), chế độ Safari "Thêm vào MH chính" (PWA Standalone), hoặc đóng gói tệp `.ipa` native từ Capacitor iOS bằng workflow GitHub Actions macOS (`.github/workflows/dktest-ios-release.yml`; bản `.ipa` chưa ký Apple Developer cần AltStore / Sideloadly / TrollStore hoặc tự ký Xcode). Giao diện người dùng mới luôn mặc định **chế độ Sáng (Light)** và hỗ trợ **chế độ Tối (Dark)** chuẩn tương phản toàn hệ thống (4 mức độ sâu tối). Có mạng: app mặc định ở Online với giao diện trang chủ giống website, chỉ tải 5 đề đã phát hành vừa chỉnh sửa lúc mở; nút điều hướng web được gộp chung vào một tab **Đề thi**; thanh sidebar trên di động hỗ trợ cuộn dọc mượt mà đầy đủ mọi mục; ứng dụng Android tự động kiểm tra bản phát hành mới qua `/api/app-download?format=json` và hiện hộp thoại gợi ý cập nhật (cho phép **Để sau** hoặc **Bỏ qua bản này**); banner tải app & hộp thoại `AppInstallModal` hỗ trợ tải trực tiếp cả **iOS** lẫn **Android APK** kèm số phiên bản qua `/api/app-download`. Hệ thống **loại bỏ hoàn toàn `alert()` mặc định của trình duyệt** bằng hộp thoại popup riêng đồng bộ toàn hệ thống (`AppDialogHost`), tích hợp **Thông báo trực tiếp Web & Điện thoại Android** (`NotificationPermissionController`, `DkNotificationsPlugin`, `NotificationPollWorker`, Service Worker `/sw-notifications.js`) tự xin quyền thông báo khi lần đầu mở web/app và phát thông báo thật tới điện thoại (tối ưu chỉ tải 5 thông báo & 5 yêu cầu nạp tiền gần nhất để tiết kiệm Firestore READ). Bấm mã đề ở thông tin bài để sao chép; ô mã đề nhận cả link mời và tự mở trang thông tin đề khi dán. Trong thông tin đề, nút tải xuất hiện khi có quyền (đề trả phí phải được mua/cấp quyền). Offline: chỉ đọc đề đã tải trên máy, có thiết lập đề con, tệp đính kèm và xem trước đề gốc tương đương online trước khi bắt đầu làm bài, tự đồng bộ bài nộp khi nối mạng. Hệ thống hỗ trợ **Cửa hàng Acc AI & Quản lý Khách hàng / Công nợ** (`/student/ai-shop` chia gọn 6 nhóm dịch vụ, bắt buộc SĐT Zalo mọi đơn, bắt buộc Email nâng cấp cho Add Fam / Yt Pre / Verify Student, khách có thể **tự hủy / bật lại gia hạn gói slot theo tháng**, báo Discord Admin kèm link xử lý trực tiếp, nhận thông báo + ghi chú + ảnh/file từ Admin và xem lịch sử giao dịch; `/admin/ai-shop` đầy đủ 7 mục quản lý công nợ & nhập/xuất Excel), **Minigame Sự kiện Phúc lợi 100% Miễn phí** (`/student/minigame`, `/minigame/:eventId`, `/admin/minigames`: có **hình ảnh minh họa 1200×630 thiết kế riêng, khung xem trước hướng dẫn chi tiết & thẻ chia sẻ mạng xã hội (Zalo/Facebook/Discord)** cho từng trò chơi cụ thể; Đua Ngựa & Đua Ong hỗ trợ từ **2 người chơi (1v1)** đến **64 người** với preset `2 / 4 / 8 / 16 / 32` hoặc số tùy ý và `2 / 4 / 8` con/lượt, tùy chỉnh **số lượng giải thưởng linh hoạt từ 1 đến 32 giải** và **số tiền thưởng bất kỳ từng đồng**, hiệu ứng sân vận động parallax, bình luận trực tiếp & photo-finish, Tài Xỉu nắp bát lắc rung, Bầu Cua nắp sơn mài, Đoán Số May Mắn chỉ lấy người trúng chính xác con số, chế độ **chạy Bot ảo mô phỏng** an toàn không cộng tiền thật cho Admin xem thử hiệu ứng, cổ vũ Live qua API và trao thưởng tự động + Tiền Ví / Voucher / Quà tùy chỉnh), **Khóa học** (`/student/courses`, `/admin/courses`), **Hành trình học tập** (`/journey`), **Voucher chuẩn cơ chế Shopee** (kèm ảnh preview tối giản, hiện đại `/images/voucher-banner.jpg`), **Giới thiệu bạn bè (Ref)** (`/ref/:code`), **Bản quyền & Pháp lý chi tiết 8 điều khoản** (mở popup trực tiếp tại trang Đăng ký), và **Đấu Trường (Arena)** chạy trên Firebase Realtime Database (`rtdb`, 0 Firestore reads/writes). Xem [hướng dẫn](docs/android-offline.md) và [kế hoạch Khóa học](docs/courses-feature-plan.md). Mọi cải tiến tiếp theo cần tăng version, cập nhật changelog và có audit chi tiết theo [AGENTS.md](AGENTS.md).

Trước khi phân phối rộng, cần triển khai backend, rules/indexes và chuyển câu hỏi nhúng của đề trả phí legacy theo [audit](docs/audits/1.8.27.md#deployment-prerequisites). Các bước production này chưa thực hiện vì Firebase CLI chưa đăng nhập. Có công cụ dry-run/backup `npm run migrate:paid-content`, đã kiểm tra bằng emulator. APK hiện là bản debug; chưa kiểm thử trên điện thoại thật.

App Links Android: cài APK 1.8.30 trở lên để hệ điều hành mở link website bằng app sau khi xác minh domain/chứng chỉ. Nếu trình duyệt nhúng giữ link trong web, bấm **Mở trong app**; máy chưa cài tiếp tục web. Xem điều kiện triển khai và kiểm tra thiết bị trong [audit](docs/audits/1.8.30.md).

## JSON Format

DkTEST features a robust **JSON Exam Import/Export Engine** designed to handle full exam data, question banks, and individual sections safely and efficiently. The JSON format is considered a primary exchange format for DkTEST.

### Schema Version

The current schema version is **V3**. The system uses a strict versioning mechanism to ensure backward and forward compatibility.

```json
{
  "version": 3,
  "exportType": "exam",
  ...
}
```

### Import JSON

You can import JSON files in the following ways:
- **Admin Dashboard**: Import an entire exam (creates a new exam or updates an existing one).
- **Exam Editor**: Import a Question Bank directly into a specific section.

Features of the Import Engine:
- **Validation**: Strict validation of schemas using `zod`.
- **Normalization**: Automatic conversion of legacy formats (like `mcq`, `short`) to V3 standard (`single_choice`, `short_answer`).
- **Preview**: Displays a summary of the exam, question count, and any validation warnings before committing to the database.
- **Batched Uploads**: Questions are mapped to their respective sections and uploaded efficiently.
- **Safety**: Re-generates unique IDs for questions if importing as a new copy to avoid Firestore conflicts.

### Export JSON

Exporting is highly granular. You can export:
1. **Full Exam**: In the Exam Editor, click "Export Full JSON" to download the exam metadata, sections, and all questions.
2. **Specific Section**: In the section menu, click the download icon to export only that section and its questions.
3. **Question Bank**: Select specific questions and export them.

### Migration & Legacy Compatibility

The engine guarantees backward compatibility with older exam structures (V1 and V2).
- If you import a V2 file without sections, the system will automatically create a default "Phần I" section and place all questions there.
- Legacy `originalOptions` and `optionOrder` fields are correctly interpreted to retain the originally intended correct answers without randomizing them incorrectly.

### Example JSON

For a detailed example of the V3 Schema, please see:
- Schema Definition: `docs/schemas/exam-v3.schema.json`
- Example Data: `docs/exam-json-example.json`

## Local Development

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Thiết lập Biến môi trường (.env)
Sao chép `.env.example` thành `.env` và điền cấu hình Firebase của bạn:
```bash
cp .env.example .env
```
Các biến cần thiết:
- **Client (Frontend)**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, v.v.
- **Server (Backend Admin SDK)**: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

### 3. Thiết lập Tài khoản Super Admin đầu tiên
Sử dụng script bootstrap để cấp quyền Super Admin cho tài khoản của bạn:
```bash
npm run bootstrap:admin admin@dktest.edu.vn --password=AdminSecure#2026
```
Hoặc nếu tài khoản đã đăng ký trên Firebase Auth:
```bash
npm run bootstrap:admin admin@dktest.edu.vn
```

### 4. Khởi chạy Ứng dụng
```bash
# Khởi chạy Express Backend + Vite Frontend (Cổng 3636)
npm run dev

# Nếu gặp lỗi cổng 3636 đang bận (EADDRINUSE), giải phóng cổng bằng lệnh:
npm run kill:port

# Kiểm tra kiểu dữ liệu TypeScript
npm run lint

# Build cho Production
npm run build
```

---

## Hệ thống Tài khoản & Phân quyền (Account & Auth System)

DkTEST cung cấp hệ sinh thái tài khoản toàn diện với Firebase Authentication và Firebase Admin SDK:

### 1. Vai trò Người dùng (User Roles)
- **Học sinh (`student`)**:
  - Đăng ký / Đăng nhập bằng Email/Mật khẩu hoặc Google Sign-In.
  - Tạo mã mời phụ huynh ngẫu nhiên định dạng `DK-XXXXX` (hiệu lực 7 ngày).
  - Làm bài thi trắc nghiệm & tự luận, xem lại kết quả thi, bảng thành tích cá nhân và tiến độ hoàn thiện hồ sơ.
- **Phụ huynh (`parent`)**:
  - Đăng ký / Đăng nhập, liên kết tài khoản con qua mã mời `DK-XXXXX`.
  - Theo dõi tiến độ học tập, điểm thi và lịch sử làm bài của con.
- **Quản trị viên (`admin`) / Super Admin (`super_admin`)**:
  - Đăng nhập bảo mật tại `/admin/login`.
  - **Students Management** (`/admin/students`): Danh sách học sinh với tìm kiếm debounced, bộ lọc lớp/trạng thái, sắp xếp `createdAt DESC`, bulk actions (phê duyệt/đình chỉ/xóa), xuất CSV UTF-8 BOM.
  - **Parents Management** (`/admin/parents`): Quản lý tài khoản phụ huynh và mối liên kết gia đình.
  - **User Detail** (`/admin/users/:uid`): Xem chi tiết hồ sơ đa tab: Tổng quan, Hồ sơ, Gia đình, Lịch sử thi, Nhật ký hoạt động, Cấu hình bảo mật.
  - **Data Health & Reconciliation** (`/admin/data-health`): Quét lỗi toàn vẹn dữ liệu (hồ sơ mồ côi, tài khoản treo), hỗ trợ Dry-run và Tự động sửa chữa an toàn.
  - **Audit Logs** (`/admin/audit-logs`): Lưu vết mọi hành động quản trị viên có đầy đủ IP, User-Agent và Timestamp.
  - **Classes Analytics** (`/admin/classes`): Thống kê theo lớp học và xem danh sách học sinh theo khối.
  - **System Health** (`/admin/system-health`): Giám sát trạng thái hoạt động và độ trễ của Firebase Auth, Firestore và RTDB.

### 2. Bảo mật & Quy tắc Firestore (Security Rules)
Hệ thống sử dụng quy tắc Firestore phân quyền nhiều lớp (`firestore.rules`):
- Không lưu mật khẩu dạng plain-text ở Firestore hay Client.
- Chặn người dùng tự ý thay đổi `role` hoặc `status` của chính mình.
- Bảo vệ dữ liệu bài nộp (`submissions`), chỉ học sinh sở hữu, phụ huynh liên kết hoặc quản trị viên mới có quyền xem.
- Xác thực Token ID phía server qua Middleware `requireAuth`, `requireAdmin`, `requireSuperAdmin`.

