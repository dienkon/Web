# DkTEST changelog

## 1.8.29 — 2026-11-08 (Android versionCode 4)

- Online trong app dùng trực tiếp trang chủ web: banner, công cụ, countdown, bộ lọc, thư mục và thẻ đề; giữ tab Offline riêng. Khi mở Online vẫn chỉ truy vấn 5 đề vừa chỉnh sửa, cache theo UID 5 phút; các kho/thư mục chỉ tải khi chọn.
- Bấm mã đề ở trang chuẩn bị thi để sao chép, dùng chung cho web/app và thiết lập offline; có phản hồi sao chép và fallback WebView.
- Ô mã đề nhận mã hoặc link mời; dán link hợp lệ tự tách ID/mã rồi mở thông tin đề nội bộ. Hỗ trợ URL đề, query invitation và hash route; chặn input không hợp lệ, không điều hướng tới website bên ngoài.
- Link chia sẻ tạo từ app dùng địa chỉ website thật thay vì `localhost`.
- Kiểm tra gọn và audit: [1.8.29](docs/audits/1.8.29.md).

## 1.8.28 — 2026-11-08 (Android versionCode 3)

- Bỏ nút, state và modal xem trước lời giải khỏi màn hình đang làm bài dùng chung cho web và Android, kể cả khi giáo viên bật `allowPreviewSolutionBeforeExam`.
- Giữ xem trước đề/lời giải tại màn hình trước khi bắt đầu; quyền xem chi tiết kết quả sau khi nộp vẫn theo cấu hình riêng của đề.
- Kiểm tra gọn theo yêu cầu: TypeScript, build web/APK và hồi quy UI liên quan; không chạy lại toàn bộ test hoặc emulator.

Audit: [1.8.28](docs/audits/1.8.28.md).

## 1.8.27 — 2026-11-08 (Android versionCode 2)

- Mặc định mở Online khi có mạng; danh sách 5 đề published theo `updatedAt DESC`, cache theo UID 5 phút, không quét toàn kho. Làm mới chủ động khi cần dữ liệu mới ngay.
- Offline chỉ hiển thị đề đã tải, không tải catalogue; thêm trang thiết lập đề con dùng chung thành phần và engine với online. Giữ cấu hình/đồng hồ khi tiếp tục bài.
- Chuyển nút tải sang trang thông tin đề, xác minh entitlement trực tiếp từ máy chủ và kiểm tra lại lúc tải; số dư ví không thay thế việc mua đề.
- Tải đề bỏ truy vấn ngân hàng đã nhúng; bài không giới hạn lượt không đọc lịch sử, bài giới hạn chỉ truy vấn UID + examId có limit.
- Bỏ lượt tải avatar/thông báo/subscribe ví không cần thiết trên Android. Bổ sung indexes cho truy vấn giới hạn.
- Siết xác thực API: Firebase token được kiểm chứng, không tin UID/role header, token local hay JWT chỉ decode. Chặn tự cấp admin, tự ghi ví/entitlement và sửa điểm đã nộp trong rules.
- Thêm migration đề trả phí nhúng với dry-run, backup, giao dịch atomic và dừng khi xung đột; rules ngăn nhúng lại. Đã kiểm thử bằng emulator, chưa chuyển dữ liệu production.
- Cập nhật DOMPurify 3.4.17 để bỏ cảnh báo critical trong dependency audit; các cảnh báo còn lại ghi trong audit, không nâng major hoặc nới kiểm tra quyền.
- Version Android/Vite lấy từ `release.json`, tên APK có version, SHA-256, kiểm tra release và quy định changelog/audit cho mỗi cải tiến.

Audit chi tiết và các bước triển khai bắt buộc: [1.8.27](docs/audits/1.8.27.md).

## 1.8.26 — 2026-11-08 (Android versionCode 1)

- APK đầu tiên đóng gói giao diện, kho đề/media offline, lưu nháp IndexedDB, hàng đợi Android AtomicFile + WorkManager, tạo bài nộp có ID cố định và chống gửi trùng.
- Bản debug cài thử; chưa được xác nhận trên điện thoại thật.
