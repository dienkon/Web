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


## Bổ sung Nâng cấp Kiến trúc 1.9.1

1. **Ba chế độ thu phí tách bạch (`CourseAccessMode = "free" | "per_video" | "paid"`)**:
   - `free`: Vào khóa và xem mọi video miễn phí 100%.
   - `per_video`: **Vào khóa học miễn phí (`priceVnd = 0`) — Tính phí theo từng video**. Không hiển thị nút mua khóa `0đ`; vẫn hỗ trợ cấu hình `freePreviewCount` (`0` = thu phí từ video đầu) + giá mặc định/giá riêng từng video. Cả Firestore Rules và API `POST /api/courses/:courseId/unlock` đều khóa chặt để không thể bypass qua mua khóa 0đ.
   - `paid`: Thu phí trọn khóa (`priceVnd > 0`) kèm chính sách `unlock_all_videos` / `unlock_course_only`, `freePreviewCount` và tùy chọn mua lẻ từng bài.
2. **Cây phân cấp 3 tầng (`buildCourseHierarchy`) & Tối ưu Mobile**:
   - Nhóm/Môn tầng 1 (`groupTitle`) -> Chương tầng 2 (`chapters`) -> Chuyên đề tầng 3 (`topicTitle` gom nhóm) kèm 2 tab `Videos (N)` & `Tài liệu (M)` và thanh tiến độ `%`.
3. **Ẩn URL gốc kho lưu & Bảo vệ Player**:
   - `lessonOutline` chỉ lưu nhãn máy chủ an toàn (`videoHostLabel`) và metadata tài liệu không chứa `url`.
   - Admin UI dùng `maskVideoUrlDisplay` tự ẩn đường dẫn ngay khi dán/lưu; Student UI dùng `youtube-nocookie.com`, chuẩn hóa Google Drive `/preview?rm=minimal`, che nút `[↗]` góc trên phải bằng security shield (`z-20`), chặn chuột phải và tắt nút download `<video>`.
4. **Tối ưu Firestore Read Budget**:
   - Client cache `sessionStorage` + RAM (`FirestoreCache`) 5 phút + pre-hydrate `doc:courses:${id}` khi tải danh sách + cache bài giảng unlocked 3 phút trong RAM.
   - Bỏ listener `onSnapshot` ví dư thừa ở `CourseDetail`, short-circuit 0 entitlement/wallet reads với khóa miễn phí, server cache 60s cho doc khóa học và 30s cho entitlement.
