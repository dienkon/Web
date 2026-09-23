# DkTEST - Exam Management System

DkTEST is a modern, clean, and minimalist examination system built with React, Vite, Tailwind CSS, and Firebase.

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

