# Kế Hoạch Chi Tiết Tính Năng Khóa Học (DkTEST Courses)

## 1. Mục tiêu & Yêu cầu nghiệp vụ
- **Quản trị viên (Admin)**:
  - Tạo, chỉnh sửa, nhân bản, xuất bản (`published`) hoặc lưu nháp (`draft`) và xóa khóa học.
  - Cấu hình **học phí khóa học** (`free` hoặc `paid` với `priceVnd`, giá gốc tham khảo `originalPriceVnd`, bật/tắt bán `salesEnabled`).
  - Cấu hình **chi tiết cơ chế mở khóa**:
    1. **Mở khóa trọn khóa (`unlockFullPolicy`)**: mặc định `unlock_all_videos` — khi học sinh Unlock khóa học sẽ mở khóa toàn bộ video bài giảng trong khóa (bao gồm các video trả phí). Hỗ trợ thêm tùy chọn `unlock_course_only` để tách riêng video đặc biệt nếu cần.
    2. **Miễn phí vài video đầu (`freePreviewCount`)**: Admin nhập số lượng `N` video đầu miễn phí (VD: `0`, `1`, `2`, `3`...). Các bài giảng có thứ tự toàn cục `< N` ở chế độ `"inherit_first_n"` tự động trở thành **Học thử miễn phí**.
    3. **Tùy chỉnh chi tiết từng video bài giảng**:
       - Ghi đè quyền truy cập từng video: `"inherit_first_n"` (theo quy tắc `N` video đầu), `"free"` (luôn miễn phí), hoặc `"paid"` (luôn trả phí).
       - Cài đặt giá mua lẻ cho từng video trả phí (`priceVnd`) khi bật `allowSingleLessonPurchase`.
       - Cài đặt cờ `includedInCourseUnlock` (mở khóa tự động khi mua trọn khóa).
       - Nguồn video đa dạng: YouTube URL, Google Drive/iframe, MP4 URL trực tiếp hoặc tải video lên Cloudinary.
       - Quản lý chương/phần (`chapters`), tài liệu đính kèm và gắn mã đề thi thực hành (`linkedExamId`).
- **Học sinh (Student)**:
  - Duyệt danh sách khóa học theo môn học, cấp thi, miễn phí/trả phí và từ khóa.
  - Xem đề cương chi tiết, nhận biết bài học thử miễn phí, bài đã mở khóa và bài trả phí.
  - Xem video bài giảng, tải tài liệu đính kèm, đánh dấu hoàn thành bài học và mở đề thi liên kết.
  - Mở khóa trọn khóa hoặc mua lẻ từng video trả phí bằng **Ví DkTEST** và **Voucher giảm giá**.

## 2. Mô hình Dữ liệu & Ngân sách đọc Firestore
1. `courses/{courseId}`: metadata công khai và `lessonOutline` (không chứa `videoUrl`). Đọc 1 document khi mở trang khóa học, tránh rò rỉ video trả phí.
2. `courses/{courseId}/lessons/{lessonId}`: nội dung chi tiết bài giảng (`videoType`, `videoUrl`, `materials`, `accessType`, `priceVnd`, `includedInCourseUnlock`). Chỉ đọc được khi được quyền.
3. `course_entitlements/{entitlementId}`: `${uid}_${courseId}` (trọn khóa) hoặc `${uid}_${courseId}__${lessonId}` (mua lẻ). Chỉ Server/Admin được ghi.

## 3. Bảo mật & API
- `firestore.rules` chặn đọc subcollection `lessons` nếu không thuộc khóa miễn phí, bài học thử, hoặc không có `course_entitlements` hợp lệ đang `active`.
- Backend (`server/services/courseService.ts`, `server/routes/walletRoutes.ts`, `server/routes/adminRoutes.ts`) thực thi giao dịch nguyên tử (`runTransaction`) khi trừ ví, kiểm tra voucher, cấp entitlement và ghi `wallet_transactions` (`course_unlock_debit`, `course_lesson_unlock_debit`).
