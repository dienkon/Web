# DkTEST changelog

## 1.9.2 — 2026-11-17 (Android versionCode 8)

- Fix lỗi `403 Bạn không có quyền quản trị` khi đăng nhập Admin bằng "Mã quản trị nhanh" (`AdminLogin.tsx`, `AuthContext.tsx`, `RequireAuth.tsx`, `POST /api/auth/admin-password-login`): yêu cầu và cấp phiên Firebase Auth thật (`customToken` / email-password admin) cho mọi route `/admin/*`, xóa cơ chế giả lập `admin_local` chỉ nằm ở `localStorage`.
- Fix lỗi YouTube `Error 153 (Video player configuration error)` bằng việc bỏ `referrerPolicy="no-referrer"`, dùng `strict-origin-when-cross-origin` kèm `enablejsapi=1` + `origin`, đồng thời xây dựng trình phát video tùy biến **`DkCourseVideoPlayer`** của DkTEST (thanh tua, `-10s/+10s`, tốc độ `0.75x..2x`, âm lượng, toàn màn hình) cho MP4/Cloudinary & YouTube (`YT.Player` `controls: 0`) và thay hộp đen che góc trên Drive bằng lớp khiên trong suốt chỉ hiện khi hover (không che khuất slide bài giảng).
- Tự động đo và cập nhật thời lượng video chuẩn từng giây (`durationSeconds` & `durationMinutes`) ngay khi dán/tải lên URL video (MP4/Cloudinary qua `<video>` / HTTP Range `mvhd` atom, YouTube watch HTML, Google Drive via `/api/admin/courses/probe-video` có SSRF guard) + nút `"Đo thời lượng"` hàng loạt và lưu tiến độ xem thực tế theo giây (`watchedSecondsMap`).
- Đồng bộ giao diện Khóa học (`CoursesList`, `CourseDetail`, `CourseManager`, `CourseEditor`) về màu **Xanh dương chủ đạo DkTEST** (`blue-600` / `indigo-600`), thay cây phân cấp 3 tầng trực quan (`Tầng 1 Nhóm -> Tầng 2 Chương -> Tầng 3 Chuyên đề -> Video`) ngay trong `CourseEditor` Admin để thêm/chỉnh sửa bài giảng nhanh chóng.
- Thêm tính năng chia sẻ Khóa học và Video bài giảng cụ thể (`?lesson=<lessonId>`) kèm thẻ xem trước Open Graph / Zalo `1200x630` chuẩn trên `socialMetadata.ts` & `api/social-meta.ts` (không làm lộ `videoUrl` nguồn).
- Audit: [1.9.2](docs/audits/1.9.2.md).

## 1.9.1 — 2026-11-17 (Android versionCode 7)

- Fix lỗi không thể cuộn dọc trên trang chỉnh sửa khóa học Admin (`/admin/courses/:courseId/edit`) trong `AdminLayout` khi thu hẹp điều kiện khung cố định chỉ dành cho trình soạn đề thi.
- Viết lại cơ chế thu phí Khóa học hỗ trợ 3 chế độ rõ ràng (`free`, `per_video`, `paid`): cho phép tạo khóa vào cửa miễn phí hoàn toàn (`priceVnd = 0`) nhưng thu phí theo từng video bài giảng (`per_video`) với số video đầu học thử tùy chỉnh (`freePreviewCount`); xóa lỗi hiển thị nút `"Mở khóa khóa học • 0đ"` và siết `firestore.rules` + API backend ngăn bypass mua khóa 0đ.
- Nâng cấp giao diện Khóa học Học sinh (`CourseDetail`) với cây phân cấp 3 tầng có thu gọn/mở rộng (`Nhóm/Môn -> Chương -> Chuyên đề` kèm bộ đếm video/tài liệu, thanh tiến độ `%` và chuyển tab `Videos` / `Tài liệu`), đồng thời tối ưu bố cục mobile (`CourseDetail`, `CoursesList`) ưu tiên trình phát video lên đầu và không bị cắt chữ dưới header.
- Tự động ẩn URL gốc khi nhúng link kho lưu (Google Drive, YouTube, Cloudinary, OneDrive...) trên cả UI Admin (`maskVideoUrlDisplay`) và trang Học sinh; dùng `youtube-nocookie.com`, chuẩn hóa Drive `?rm=minimal`, che nút `[↗]` bật tab ngoài góc trên phải iframe, chặn chuột phải và tắt tải xuống trên HTML5 `<video>`.
- Tối ưu Firestore Read Budget: thêm `queryOrderedFirestoreRestDocs` giới hạn đọc tối đa `pageSize = 5` (tối đa `25` khi thiếu composite index thay vì `100`) và cache metadata học sinh cho Lịch sử chi tiêu toàn server; cache `sessionStorage` + pre-hydrate cache danh mục khóa học, loại bỏ `onSnapshot` ví dư thừa ở `CourseDetail`, bỏ qua đọc quyền cho khóa miễn phí và nâng cấp cache 120s cho thư mục gốc + Top 5 trên `Home`.
- Audit: [1.9.1](docs/audits/1.9.1.md).

## 1.9.0 — 2026-11-17 (Android versionCode 6)

- Gộp tab điều hướng **Đề thi** và **Đề thi Online** thành một tab **Đề thi** duy nhất trong `StudentLayout`, giữ điều hướng Online/Offline riêng cho ứng dụng Android bản địa và redirect `/student/online` trên web về `/`.
- Cập nhật mốc đếm ngược kỳ thi **ĐGNL V-ACT** sang **28/03/2027** trên bảng đếm ngược trang chủ và Bản đồ Hành trình học tập.
- Bổ sung bảng **Lịch sử chi tiêu toàn server** trong trang Admin **Ví & Công nợ** với phân trang cursor mặc định `limit = 5` (Base = 5 giao dịch gần nhất mỗi lần bấm **Tải thêm**).
- Tối ưu giao diện Mobile trang chủ (`< 768px`): ẩn banner quảng bá Hero, `StudentTutorialBanner`, banner Hành trình học tập và cụm 4 thẻ Không gian Học tập & Đổi mới sáng tạo, giữ form nhập mã đề / link mời gọn nhẹ.
- Hoàn thiện giao diện thiết lập thi Offline (`OfflineExamSetup`) tương đương bản Online: hiển thị thông số đề, lịch thi, nội quy, tệp đính kèm trước giờ thi (`resolveOfflineUrl`), nút xem trước đề gốc & lời giải chi tiết khi giáo viên bật `allowPreviewSolutionBeforeExam` (giữ nguyên chặn xem lời giải trong lúc đang thi tại `TakingExam`), và bổ sung modal tệp đính kèm trong `TakingExam`.
- Ra mắt tính năng **Khóa học** (Courses) kèm tài liệu kế hoạch chi tiết (`docs/courses-feature-plan.md`): Admin quản lý tạo khóa học, học phí, cấu hình số video đầu học thử miễn phí (`freePreviewCount`), chính sách Unlock full khóa (`unlock_all_videos`) vs phân tách thành phần (`unlock_course_only`), tùy chỉnh miễn phí / trả phí / giá mua lẻ cho từng video bài giảng, hỗ trợ YouTube/MP4/Cloudinary/Drive, quy tắc bảo mật Firestore `courses` & `course_entitlements`, API Ví DkTEST + Voucher atomic transactions và giao diện học video cho học sinh.
- Audit: [1.9.0](docs/audits/1.9.0.md).

## 1.8.30 — 2026-11-08 (Android versionCode 5)

- Thêm Android App Links cho domain `dk-test-v3.vercel.app`, liên kết package và SHA-256 chứng chỉ ký APK qua `/.well-known/assetlinks.json`. Máy cài bản app hỗ trợ có thể mở link bằng app sau khi Android xác minh domain.
- Nhận link khi mở app từ đầu hoặc khi app đang chạy; chờ khôi phục Auth, chỉ nhận domain/route hợp lệ, chuyển link đề offline sang gói đã tải, ưu tiên bài đang làm.
- Web Android có nút “Mở trong app” bằng package intent, có fallback tiếp tục web nếu chưa cài; tránh vòng lặp và không tự bật app bằng timer bị trình duyệt chặn.
- Cần cập nhật APK 1.8.30 trở lên; bản cũ chưa có intent filter. Trình duyệt nhúng/lựa chọn mở link của người dùng có thể yêu cầu bấm nút dự phòng.
- Audit: [1.8.30](docs/audits/1.8.30.md).

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
