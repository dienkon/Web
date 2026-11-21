# DkTEST changelog

## 1.9.13 — 2026-11-21 (Android versionCode 19)

- **Nâng cấp Quản lý Khóa học — Hiển thị Tổng tiền phải chi toàn bộ khóa (`CourseManager.tsx`, `CourseEditor.tsx`, `src/services/courseService.ts`, `src/types/course.ts`)**:
  - Bổ sung hàm thuần `computeCourseTotalCostSummary` và lưu trường `totalPaidLessonsPriceVnd`, `totalFullCourseCostVnd` khi lưu khóa học (tương thích ngược với khóa học cũ qua `lessonOutline`).
  - **Màn hình danh sách ngoài (`CourseManager.tsx`)**: thêm thẻ thống kê **Tổng học phí các khóa** và dòng nổi bật **`Tổng chi toàn bộ khóa`** ngay trên từng thẻ khóa học (tính đúng cả 3 chế độ: Miễn phí `0đ`, Theo video cộng dồn toàn bộ video trả phí, Trọn khóa kèm cộng thêm bài VIP ngoài gói nếu chọn `unlock_course_only` và so sánh giá mua lẻ).
  - **Bên trong trình chỉnh sửa (`CourseEditor.tsx`)**: hiển thị badge `Tổng chi cả khóa` trực tiếp ở thanh trên cùng, bổ sung bảng **Tổng chi phí toàn bộ khóa học** chi tiết ở Tab 1 (số bài trả phí/free, tổng mua lẻ, mức tiết kiệm combo) và tổng chi phí từng chương ngay trên cây phân cấp ở Tab 2.
- **Đa dạng tùy chọn mua khóa học tối ưu cho học sinh (`CourseDetail.tsx`, `server/services/courseService.ts`, `server/routes/walletRoutes.ts`, `src/services/walletClientService.ts`)**:
  - Bổ sung endpoint giao dịch nguyên tử **`POST /api/courses/:courseId/unlock-bundle`** (`unlockCourseBundle`) hỗ trợ 4 loại gói: **`chapter`** (mua theo chương), **`topic`** (mua theo chuyên đề), **`all_remaining`** (mua hết toàn bộ video còn lại), và **`selected`** (mua nhóm video học sinh tự tick chọn). Máy chủ tự động loại trừ các bài miễn phí / đã sở hữu để không bao giờ trừ tiền trùng, hỗ trợ áp mã voucher và ghi quyền chuẩn `course_entitlements/${uid}_${courseId}__${lessonId}` tương thích hoàn toàn với `firestore.rules`. Đồng thời truyền bổ sung `courseId` trong `/api/vouchers/validate`.
  - **Giao diện học sinh (`CourseDetail.tsx`)**: thêm thanh **Tùy chọn mở khóa nhanh** (Mua trọn khóa kèm mức tiết kiệm, **Mua hết N video còn lại**, chế độ **Chọn nhiều video** với thanh thanh toán nổi, hàng nút **Mua nhanh theo từng chương**), nút **`Mua chương`** trực tiếp trên tiêu đề mỗi chương (cả Tổng quan & Sidebar Theater), nút **`Mua chuyên đề`** khi chuyên đề có từ 2 video trả phí trở lên, và nút mua chương / mua hết ngay trên màn hình khóa video. Hộp thoại xác nhận hiển thị danh sách chi tiết từng video trong gói mua kèm giá.
- **Tự động nhận diện thông minh tiêu đề bài giảng khi Admin dán link YouTube / Google Drive (`CourseEditor.tsx`, `server/services/courseService.ts`, `server/routes/adminRoutes.ts`, `src/services/courseService.ts`, `src/utils/videoSourceHelper.ts`)**:
  - Nâng cấp `probeVideoDuration` trên backend: bổ sung **YouTube oEmbed** chính thức (vượt tường consent, giữ nguyên tiếng Việt UTF-8), giải mã tiêu đề Google Drive qua Drive API v3 / `get_video_info` / HTML `/preview` & `/view` / header `Content-Disposition`, và **luôn trả về tiêu đề ngay cả khi không đo được thời lượng**.
  - Bổ sung `cleanDetectedVideoTitle` (giải mã HTML entities, lọc hậu tố `- YouTube` / `- Google Drive`, bỏ đuôi `.mp4`/`.mkv`/`.mov` và chặn tiêu đề lỗi) và `isPlaceholderLessonTitle`.
  - Trong `CourseEditor.tsx`: khi Admin dán (`onPaste`) link YouTube/Drive (hoặc upload file video), hệ thống tự động điền ngay tiêu đề nếu ô tiêu đề đang để trống/mặc định; nếu Admin đã tự đặt tên riêng, hiển thị chip **Gợi ý từ link** với nút **Áp dụng** 1 chạm để không ghi đè ngoài ý muốn.
- **Fix triệt để lỗi hệ thống tự logout liên tục (`src/services/firebase/config.ts`, `src/context/AuthContext.tsx`, `src/services/apiClient.ts`, `src/services/authService.ts`, `AdminLogin.tsx`, `CourseDetail.tsx`, `StudentHistory.tsx`, `Community.tsx`, `TakingExam.tsx`, `ParentDashboard.tsx`)**:
  - Khởi tạo Firebase Auth bằng `initializeAuth` với chuỗi lưu trữ dự phòng `[indexedDBLocalPersistence, browserLocalPersistence]` thay vì rơi âm thầm về `inMemoryPersistence` khi IndexedDB bị khóa/lỗi trên WebView hoặc đa tab.
  - Sửa `AuthContext.tsx`: đợi `auth.authStateReady()` trước khi coi trạng thái `null` là đã đăng xuất; tăng watchdog từ `4.5s` lên `12s` không xóa session; cache hồ sơ `dktest_cached_profile_${uid}` cho mọi vai trò (Admin, Phụ huynh, Học sinh) để không mất vai trò khi Firestore chậm/rớt mạng thoáng qua; giữ nguyên kết quả Firestore khi hoàn tất sau timeout thay vì vứt bỏ; sửa lỗi `setUser({ ...auth.currentUser })` làm mất prototype `getIdToken()`; thêm cơ chế tự gia hạn phiên (`focus` / `visibilitychange` / `online` và chu kỳ 45 phút).
  - Sửa `apiClient.ts`: khi gặp HTTP `401` do token quá hạn 60 phút, tự động `getIdToken(true)` và thử lại request 1 lần.
  - Sửa `clearAdminSession` / `clearParentSession` / `clearStudentSession` chỉ xóa `auth_role` khớp vai trò tương ứng (không xóa nhầm phiên học sinh/phụ huynh).
  - Cập nhật `AdminLogin`, `CourseDetail`, `StudentHistory`, `Community`, `TakingExam`, `ParentDashboard` đợi `useAuth()` khởi tạo xong trước khi kiểm tra quyền/chuyển hướng.
- Audit: [1.9.13](docs/audits/1.9.13.md).

## 1.9.12 — 2026-11-18 (Android versionCode 18)

- **Hoàn thiện giao diện khung phát Drive chuẩn 1 hàng đáy, ẩn khiên bảo vệ khi không trỏ chuột & chuyển nút phóng to xuống góc dưới phải (`DkCourseVideoPlayer.tsx`, `src/utils/videoSourceHelper.ts`, `StudentLayout.tsx`)**:
  - **Khôi phục khung ảo desktop `1024×576` (`VIRTUAL_IFRAME_THRESHOLD_WIDTH = 1024`)**: chấm dứt tình trạng khung `800×450` ở `1.9.11` kích hoạt lại thanh tua `-|` trên đỉnh & 2 hàng pill tách rời của Drive. Khung `1024×576` đảm bảo Drive hiển thị **1 hàng điều khiển gọn gàng kèm thanh tua nằm dưới đáy** ở cả chế độ xem thường lẫn toàn màn hình ngang (`732×412`, không còn footer `40px`).
  - **Khiên bảo vệ góc trên phải chỉ hiện khi di chuột vào (`bg-transparent hover:bg-slate-950/90`)**: loại bỏ khối hộp đen vướng mắt trên màn hình cảm ứng/khi đang xem video mà vẫn chặn toàn bộ `click / touchstart / pointerdown / mousedown / contextmenu` lên biểu tượng mở tab ngoài `[↗]`.
  - **Đưa nút icon Phóng to / Thu nhỏ (và nút Xoay ngang khi dọc) xuống góc dưới phải** (`bottom-3 right-3` khi có viền đen ngang rộng; `bottom-8 right-2 sm:bottom-[68px] sm:right-3` không đè lên `[⚙]`/`[🔊]` khi xem inline) chuẩn thói quen YouTube.
  - **Chống cắt chữ `T` ở logo `DkTEST` trên mobile hẹp (`StudentLayout.tsx`)**: giữ `shrink-0` cho cụm logo và ẩn chữ tên hiển thị cạnh avatar khi chiều rộng màn hình `< 420px`.
- Audit: [1.9.12](docs/audits/1.9.12.md).

## 1.9.11 — 2026-11-18 (Android versionCode 17)

- **Tối ưu gọn nhẹ khung phát Google Drive chuẩn phong cách YouTube & tăng kích thước UI ngang (`DkCourseVideoPlayer.tsx`, `src/utils/videoSourceHelper.ts`, `src/services/courseService.test.ts`)**:
  - **Loại bỏ hoàn toàn thanh footer `40px` phía dưới video**: Trả lại 100% chiều cao khung màn hình khi toàn màn hình ngang (`fsAvailH = viewportSize.height`) và giữ nguyên khung `aspect-video` gọn gàng khi xem nhúng inline.
  - **Thu nhỏ khung ảo về `800×450` (tỷ lệ chuẩn 16:9, `VIRTUAL_IFRAME_THRESHOLD_WIDTH = 800`)**: Tăng độ lớn & độ rõ của thanh nút Drive hơn **~42% khi xoay ngang** (đạt ~`91.5%` kích thước thật trên màn hình điện thoại ngang `890×412` thay vì bị thu nhỏ xuống `0.64x` từ `1024×576`) và **~28% khi xem dọc**, vẫn đảm bảo chiều cao logic `450px` không bị cắt nút điều khiển.
  - **Gom nút điều khiển Toàn màn hình / Xoay ngang thành cụm icon tối giản ở góc trên phải**: Hợp nhất nút icon **`Toàn màn hình / Thu nhỏ`** (`Maximize2`/`Minimize2`), nút icon **`Xoay ngang`** (`RotateCw`, chỉ hiện khi toàn màn hình đang dọc) và khiên tối che kín biểu tượng `[↗]` thành **một pill icon gọn nhẹ duy nhất** (`rounded-bl-xl bg-slate-950/85`), không chiếm diện tích chiều dọc và không che cụm nút phát/tốc độ của Drive.
- Audit: [1.9.11](docs/audits/1.9.11.md).

## 1.9.10 — 2026-11-18 (Android versionCode 16)

- **Fix triệt để lỗi tràn layout trên điện thoại ở đầu trang & khung video Google Drive (`DkCourseVideoPlayer.tsx`, `StudentLayout.tsx`, `CourseDetail.tsx`, `src/utils/videoSourceHelper.ts`)**:
  - **Fix tràn ngang header & trang trên mobile (`StudentLayout.tsx`, `CourseDetail.tsx`)**: Thêm `min-w-0` / `overflow-hidden` cho thanh tiêu đề trên `StudentLayout`, thu gọn badge `Lv.` & tên hiển thị (`max-w-[54px] sm:max-w-[120px] truncate`) trên màn hình hẹp `< 640px` để không bị cắt mất phần avatar/tên ở mép phải, đồng thời bật `overflow-x-hidden` cho vùng cuộn nội dung.
  - **Nâng khung ảo Google Drive lên `1024×576` (`VIRTUAL_IFRAME_THRESHOLD_WIDTH = 900`) & chặn tràn toàn màn hình dọc (`DkCourseVideoPlayer.tsx`, `videoSourceHelper.ts`)**:
    - Thay khung `640×360` bằng khung `1024×576` tỷ lệ chuẩn `16:9` (vượt ngưỡng mobile/compact của trình phát Google Drive 2026) giúp các nút `Play / Tạm dừng / -10s / +10s` không bị cắt đôi ở đáy khung phát.
    - Chuyển khiên chặn góc trên phải `[↗]` sang nền tối đặc `bg-slate-950/95` kèm biểu tượng bảo vệ DkTEST (ẩn hoàn toàn biểu tượng mở tab ngoài `[↗]` trên cảm ứng thay vì `bg-transparent`).
    - Gỡ `allowFullScreen` / `fullscreen` khỏi chính thẻ `<iframe>` nhúng (ngăn trình phát Drive tự phóng to trần ở chế độ dọc gây tràn cụm nút `[🔊][CC][1x][⚙][⛶]` ra ngoài mép phải như lỗi trước) và thay bằng **thanh điều khiển Toàn màn hình & Xoay ngang của DkTEST** ngay dưới khung phát (`Toàn màn hình` / `Thu nhỏ` + nút **`Xoay ngang`** CSS 90° khi ở màn hình dọc + thử khóa xoay ngang `screen.orientation.lock("landscape")` + tính toán kích thước `computeFittedVideoBox` vừa khít trong mọi khung màn hình).
- Bổ sung unit test cho `computeFittedVideoBox` & tỷ lệ khung `1024×576` trong `src/services/courseService.test.ts`.
- Audit: [1.9.10](docs/audits/1.9.10.md).

## 1.9.9 — 2026-11-18 (Android versionCode 15)

- **Fix triệt để lỗi quay vòng tải video mãi không phát (`DkCourseVideoPlayer.tsx`, `CourseDetail.tsx`, `src/services/courseService.ts`, `server/services/courseService.ts`)**:
  - **Fix lỗi mất trạng thái Drive Stream khi cập nhật tiến độ xem (`DkCourseVideoPlayer.tsx`)**: Effect reset trước đây phụ thuộc vào `initialSeconds` và `knownDurationSeconds`, khiến mỗi khi tiến độ xem `watchedSecondsMap` hoặc thời lượng tự đo cập nhật sau 1–3 giây phát, `driveStreamResolving` bị đặt lại `true` nhưng Effect lấy stream không chạy lại → màn hình bị khóa vĩnh viễn ở vòng xoay `"Đang chuẩn bị trình phát DkTEST..."`. Nay đã gom quản lý trạng thái stream Drive vào một Effect thống nhất chỉ phụ thuộc nguồn bài học (`[parsed.isDrive, courseId, lessonId, videoUrl]`), lưu callback/giá trị khởi tạo qua `useRef`, tách đồng bộ `knownDurationSeconds` không phá trạng thái phát, bỏ `isPlaying` khỏi Effect `autoPlay` (tránh tự phát lại khi học sinh bấm Tạm dừng), rút ngắn timeout dự phòng về iframe `2400ms` (API `/stream`) / `3500ms` (metadata `<video>`) và hiển thị vòng đệm nhẹ không chặn nút điều khiển khi buffering.
  - **Fix kẹt `loadingLesson` vô hạn trong `CourseDetail.tsx`**: Gỡ `authorizedLessonsCache` khỏi mảng dependencies của `useEffect` nạp bài giảng (đọc qua `authorizedLessonsCacheRef`), đảm bảo `setLoadingLesson(false)` luôn chạy ở mọi nhánh cache/lỗi/thoát sớm và bổ sung timer bảo vệ `12s` cho `getAuthorizedCourseLesson`.
  - **Tối ưu fallback luồng phát Drive**: `getAuthorizedLessonStreamUrl` thêm `{ timeoutMs: 2500 }` và cache lỗi/miss ngắn 2 phút; `resolveDriveDirectStreamUrl` (`server/services/courseService.ts`) yêu cầu máy chủ hỗ trợ HTTP Byte-Range (`206` hoặc `Accept-Ranges: bytes`), timeout `2500ms`/hop và đóng body stream ngay sau khi kiểm tra magic bytes (ngăn treo socket & fallback nhanh sang Google Drive `/preview` co giãn `640×360`).
- Bổ sung unit test từ chối luồng `200 OK` không hỗ trợ Range trong `tests/courseDurationProbe.test.ts`.
- Audit: [1.9.9](docs/audits/1.9.9.md).

## 1.9.8 — 2026-11-18 (Android versionCode 14)

- **Khôi phục màn hình Tổng quan Khóa học chuẩn `1.9.5` khi mới vào khóa & chỉ chuyển vào Tab chi tiết (Theater 2 cột) khi bấm chọn video cụ thể (`CourseDetail.tsx`, `StudentLayout.tsx`, `src/services/courseService.ts`)**:
  - Bổ sung hàm dùng chung `isCoursePlayerTheaterUrl(pathname, search)` kiểm tra xem URL đang mở tổng quan (`/student/courses/:courseId`) hay đang xem video chi tiết (`?lesson=...` / `?video=...` / `?watch=1`).
  - **Khi mới bấm vào Khóa học (`/student/courses/:courseId`)**: giữ nguyên thanh điều hướng của `StudentLayout` và hiển thị **đúng giao diện tổng quan `1.9.5`** (Compact Header khóa học + nút `Hướng dẫn` / `Chia sẻ` / `Mở khóa FULL khóa`, khung xem trước tích hợp `DkCourseVideoPlayer` đã sửa lỗi mobile, cây **`Danh sách bài học`** 3 tầng xanh dương với tab `Videos (N)` / `Tài liệu (M)` / `Bài kiểm tra (K)` và phần giới thiệu khóa).
  - **Khi học sinh bấm vào một video cụ thể** (bấm nút `Xem Video`, bấm dòng/tiêu đề bài giảng, bấm `Mở tab chi tiết`, bấm `Mở tài liệu` gắn video hoặc sau khi mở khóa lẻ video): tự động đẩy query `?lesson=<id>&watch=1` và chuyển sang **Tab chi tiết xem video (bố cục Theater 2 cột trắng sáng DkTEST của `1.9.6` + player mobile `1.9.7`)**; nút **`Đóng`** (hoặc phím Back trên điện thoại) đưa học sinh quay trở lại màn hình tổng quan `1.9.5` của khóa học thay vì thoát ra danh sách khóa học.
- Bổ sung unit test cho `isCoursePlayerTheaterUrl` trong `src/services/courseService.test.ts`.
- Audit: [1.9.8](docs/audits/1.9.8.md).

## 1.9.7 — 2026-11-18 (Android versionCode 13)

- **Fix triệt để lỗi hiển thị nút phát/tua & thanh điều khiển video trên điện thoại (`DkCourseVideoPlayer.tsx`, `server/services/courseService.ts`, `server/routes/walletRoutes.ts`, `src/services/courseService.ts`, `src/pages/student/CourseDetail.tsx`)**:
  - **Phát luồng gốc (Native Stream) cho video Google Drive công khai**: Bổ sung endpoint xác thực `GET /api/courses/:courseId/lessons/:lessonId/stream` (qua `resolveDriveDirectStreamUrl`, kiểm soát SSRF nghiêm ngặt chỉ cho phép host Google Drive, hỗ trợ cả tệp `>100MB` có form xác nhận `download-form`, cache 15 phút) kết hợp `getAuthorizedLessonStreamUrl`. Khi Drive trả về luồng MP4/WebM hợp lệ, `DkCourseVideoPlayer` tự động phát bằng `<video>` chuẩn của DkTEST có đủ cụm chạm nhanh **`-10s / Play / +10s`**, thanh tua chạm rộng `h-6`, tốc độ phát `0.5x–2x`, toàn màn hình ngang và loại bỏ hoàn toàn khung điều khiển bị cắt của Google Drive (có cơ chế timeout `3.5s` / fallback tự động sang iframe Drive nếu tệp bị giới hạn quyền).
  - **Khung co giãn `640×360` (Virtual Desktop Stage) cho mọi iframe fallback trên màn hình `< 640px`**: Khi video Drive hoặc nguồn ngoài rơi về chế độ `<iframe>`, không ép khung chiều cao cố định `h-[268px]` khiến trình phát Drive cắt mất cụm Play/Tua/Tốc độ/Toàn màn hình; thay vào đó giữ tỷ lệ `aspect-video`, dựng khung logic `640×360` và thu phóng tỷ lệ theo `ResizeObserver` trên mobile, đồng thời mở rộng khiên chặn nút mở tab ngoài `[↗]` thành `w-[124px] h-[96px]` theo tỷ lệ khung `640×360`.
  - **Tinh gọn thanh điều khiển & toàn màn hình trên mobile**: Tự co kích thước nút/nhãn giờ (`px-2`, `text-[11px]`), đặt dropdown tốc độ/chất lượng `max-h-[116px] overflow-y-auto` để không tràn khỏi khung `aspect-video` trên màn hình dọc, và bổ sung chế độ **giả lập toàn màn hình (`isFallbackFullscreen`)** bằng CSS cố định khi `requestFullscreen()` không được trình duyệt/Android WebView hỗ trợ.
- Audit: [1.9.7](docs/audits/1.9.7.md).

## 1.9.6 — 2026-11-18 (Android versionCode 12)

- Nâng cấp toàn diện **Giao diện xem video Khóa học** (`CourseDetail.tsx`, `DkCourseVideoPlayer.tsx`, `StudentLayout.tsx`, `courseService.ts`) theo bố cục 2 cột trực quan (desktop) và ngăn xếp tối ưu thao tác một tay (mobile) với tông màu **trắng sáng chuẩn DkTEST** (`bg-white` / `bg-slate-50` / `blue-600`):
  - **Thanh đầu trang rạp học chuyên dụng**: hiển thị tên khóa học, nút **`Bài học`** (mobile mở drawer danh sách, desktop mở lại thanh bên khi đã thu gọn), nút **`Hướng dẫn`** và nút **`Đóng`** quay về danh sách khóa học (ẩn sidebar/bottom bar trùng lặp của `StudentLayout` khi đang vào phòng học video).
  - **Cột Danh sách bài học có nút `Thu gọn`** (desktop) & **Slide-Over Drawer** (mobile): giữ nguyên cây phân cấp 3 tầng (`Nhóm/Môn → Chương → Chủ đề`), thanh tiến độ `%` và đánh dấu nổi bật chủ đề đang học bằng màu xanh DkTEST.
  - **3 Tab thao tác ngay dưới trình phát video**: **`Video (N)`** (trạng thái `Đang phát`, `Xem video`, `Đã xem`, `Mở khóa`), **`Tài liệu (M)`** (tự động chuẩn bị link tài liệu đã mở khóa chống chặn popup trên mobile WebView) và **`Bài kiểm tra (K)`** (liên kết trực tiếp đề thi luyện tập theo từng chuyên đề).
  - Bổ sung cụm nút chạm nhanh **`-10s` / `Play` / `+10s`** giữa màn hình chờ của `DkCourseVideoPlayer`.
- Bổ sung **Hướng dẫn chi tiết lần đầu vào tab Khóa học** (`src/components/course/CourseOnboardingGuideModal.tsx`, `CoursesList.tsx`, `CourseDetail.tsx`): tự động hiển thị hướng dẫn 4 bước minh họa trực quan khi học sinh mở tab Khóa học lần đầu (lưu trạng thái theo UID trong `localStorage`) và có nút **`Hướng dẫn`** để xem lại bất kỳ lúc nào.
- Tích hợp **tự động kiểm tra & thông báo cập nhật ứng dụng Android (APK)** (`src/components/student/AppUpdateController.tsx`, `src/services/appUpdateService.ts`, `src/services/server/appDownload.ts`, `api/app-download.ts`, `src/App.tsx`): tự động kiểm tra bản phát hành mới khi mở app / quay lại nền / có mạng, đối chiếu cả `version` lẫn `exactReleaseFound` để tránh nhắc tải trùng khi CI đang build, hiển thị modal trắng sáng DkTEST với 3 lựa chọn rõ ràng: **`Cập nhật ngay`**, **`Để sau`** (nhắc lại lần mở app sau) và **`Bỏ qua bản này`** (lưu phiên bản đã bỏ qua). Bổ sung header CORS + `OPTIONS` cho `/api/app-download` để WebView Android (`https://localhost`) gọi API ổn định.
- **Fix triệt để lỗi Arena (Đấu Trường) gây tốn Firestore reads (`301` reads/lần quét dù không có người chơi)** (`src/services/arenaService.ts`, `src/pages/student/ArenaLobby.tsx`, `src/pages/student/ArenaRoom.tsx`, `firestore.rules`, `database.rules.json`, `scripts/cleanup-legacy-arena-rooms.ts`):
  - Chuyển toàn bộ trạng thái phòng Đấu Trường (`arena_rooms` + chỉ mục mã phòng O(1) `arena_room_codes`) từ Firestore sang **Firebase Realtime Database (`rtdb`)** — **0 Firestore reads / 0 Firestore writes** trong suốt vòng đời phòng đấu.
  - Khóa cứng `match /arena_rooms/{roomId} { allow read, write: if false; }` trong `firestore.rules`, bổ sung luật RTDB trong `database.rules.json`, gắn `onDisconnect` tự dọn người chơi rời bất ngờ khi đang chờ, TTL 2 giờ cho phòng treo, đồng bộ `status: "finished"` / `winnerUid` lên RTDB, dọn phòng khi người cuối cùng thoát Podium, bỏ truy vấn Firestore thừa cho đề preset `toan12_standard_01` / `SIEUGIOI_QUESTIONS`, ổn định UID người chơi giữa Lobby & Room và loại bỏ lệnh đọc/ghi `wallets` client lỗi trên màn Podium.
- Audit: [1.9.6](docs/audits/1.9.6.md).

## 1.9.5 — 2026-11-18 (Android versionCode 11)

- Tối ưu **chặn góc mở tab gốc Google Drive** trên `DkCourseVideoPlayer` (`src/components/course/DkCourseVideoPlayer.tsx`, `src/utils/videoSourceHelper.ts`): mở rộng vùng khiên bảo vệ khít góc trên phải (`top-0 right-0`, `w-[84px] h-[58px] sm:w-[92px] sm:h-[64px]`, `rounded-bl-2xl`) che kín nút `[↗]` kể cả khi khung preview có thanh cuộn lệch trái (PDF/Slides) hoặc thanh toolbar mobile/desktop; loại bỏ tooltip trình duyệt `"Link kho..."`, chặn đầy đủ `click/mousedown/pointerdown/touchstart/dblclick/contextmenu` và bổ sung `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"` (không cấp `allow-popups` / `allow-top-navigation` / `allow-downloads`) cho iframe Google Drive / kho lưu. Chuẩn hóa nhận diện mọi biến thể URL Drive (`/file/u/0/d/`, `docs.google.com/file/d/`, `drive.usercontent.google.com/download`).
- Nâng cấp bộ **tự động đo thời lượng video Google Drive** (`server/services/courseService.ts`, `CourseEditor.tsx`): bổ sung giải mã metadata HTML `/preview` & `/view` (chuỗi escape `\u0026`/`\u003d`, `durationMillis`, `length_seconds`, `dur=`), `fmt_stream_map` từ `get_video_info`, tùy chọn Drive API v3 (`GOOGLE_DRIVE_API_KEY`), và đặc biệt là cơ chế **đọc Range byte trực tiếp (`<= 256KB`/chunk)** qua `drive.usercontent.google.com/download` / `drive.google.com/uc` (tự xử lý trang xác nhận virus-scan >100MB, đọc MP4 `mvhd` v0/v1, nhảy thẳng tới `moov` sau `mdat` qua `findMp4MoovOffset`, và đọc Matroska/WebM `extractMatroskaDurationSeconds`), có kiểm soát SSRF ở mọi hop chuyển hướng.
- Tích hợp **Khóa học & Video bài giảng vào Admin AI Agent** (`src/services/ai/aiAdminAssistant.ts`, `src/components/admin/AdminAIAssistant.tsx`, `src/services/courseAgentActions.ts`, `src/utils/courseAiBridge.ts`, `CourseEditor.tsx`, `CourseManager.tsx`): bổ sung bản đồ trang `/admin/courses*`, đồng bộ ngữ cảnh trực tiếp khóa học/chương/bài giảng đang mở trong `CourseEditor`, hỗ trợ các lệnh `LIST_COURSES`, `GET_COURSE_DETAILS`, `CREATE_COURSE`, `UPDATE_COURSE`, `ADD_COURSE_LESSONS` / `CREATE_COURSE_VIDEO`, `UPDATE_COURSE_LESSON` / `UPDATE_COURSE_VIDEO`, `DELETE_COURSE_LESSON`, `MANAGE_COURSE_CHAPTER`, `PROBE_COURSE_DURATIONS`, cấp/thu hồi quyền khóa/video trong `MANAGE_STUDENT` và truyền biến `{{courseId}}` / `{{lessonId}}` trong `WORKFLOW`.
- Bổ sung màn hình **Chi tiết học viên đã mua Khóa học & từng Video cụ thể** trong Quản lý khóa học (`CourseManager.tsx`, `CourseEditor.tsx` Tab 3, `src/components/admin/CoursePurchasesPanel.tsx`, `GET /api/admin/courses/purchases`, `GET /api/admin/courses/:courseId/purchases`, `firestore.indexes.json`): hiển thị rõ ai đã mua trọn khóa hoặc mua lẻ video nào (kèm tên bài, thứ tự, học phí, nguồn Ví/Admin cấp, thời gian, mã giao dịch), hỗ trợ lọc loại mua/trạng thái, gom theo học viên, thu hồi/mở lại quyền nhanh và phân trang giới hạn **tối đa 2 lượt mỗi lần tải (`MAX_COURSE_PURCHASES_PAGE_SIZE = 2`)** để tiết kiệm lượt đọc Firestore.
- Audit: [1.9.5](docs/audits/1.9.5.md).

## 1.9.4 — 2026-11-18 (Android versionCode 10)

- Fix lỗi hiển thị frame video bị lệch/cắt cạnh trên mobile (`DkCourseVideoPlayer.tsx`, `CourseDetail.tsx`, `BrandLogo.tsx`, `StudentLayout.tsx`): cấp chiều cao tối thiểu hợp lý trên màn hình hẹp cho nhúng Google Drive / iframe (`h-[268px] sm:h-auto sm:aspect-video`), ép wrapper YouTube `YT.Player` canh khít `100% × 100%`, bổ sung `min-w-0 w-full` tránh tràn cột Grid trên mobile và ẩn bớt badge `"Thi Trực Tuyến"` ở `< 640px` giúp header mobile không bị cắt biểu tượng bên phải.
- Tự động chuyển sang bài giảng vừa mở khóa và phát video ngay lập tức (`autoPlay` trên `DkCourseVideoPlayer.tsx` + `handleConfirmUnlock` trên `CourseDetail.tsx`): cập nhật lạc quan quyền truy cập, bung đúng nhánh chuyên đề, tự động đặt làm bài đang phát (`?lesson=`) và cuộn mượt lên trình phát.
- Tích hợp tính năng **tải phần mềm Android (APK) trực tiếp & hiển thị phiên bản** ngay tại banner hỏi mở app (`OpenInAppBanner.tsx`) và trong menu `StudentLayout` (`Tải Ứng Dụng DkTEST Android v1.9.4`): thêm endpoint `/api/app-download` (`api/app-download.ts`, `src/services/server/appDownload.ts`, `server.ts`) tự động chuyển hướng tới APK của phiên bản mới nhất trên `ANDROID_APK_URL` hoặc GitHub Releases (kèm `.github/workflows/dktest-android-release.yml` tự build APK lên GitHub Release mỗi lần push `main`).
- Audit: [1.9.4](docs/audits/1.9.4.md).

## 1.9.3 — 2026-11-17 (Android versionCode 9)

- Nâng cấp trình phát nhúng **`DkCourseVideoPlayer`** (`src/components/course/DkCourseVideoPlayer.tsx`, `src/services/courseService.ts`): thay nút bấm xoay vòng tốc độ đơn điệu thành **2 menu danh sách thả nổi (popover list)** ngay trên thanh điều khiển:
  - **Độ phân giải (Resolution)**: hỗ trợ chọn trực tiếp từ danh sách (`Tự động`, `1080p HD`, `720p HD`, `480p`, `360p`, `240p`), tự đồng bộ `getAvailableQualityLevels()` / `setPlaybackQuality()` + giữ nguyên mốc giây với YouTube `YT.Player`, chuyển luồng transcode động Cloudinary (`buildCloudinaryQualityUrl` giữ đúng vị trí `currentTime` & tốc độ đang phát, tự fallback nếu lỗi), và hiển thị đúng độ phân giải gốc (`videoHeight`) cho file MP4 trực tiếp.
  - **Tốc độ phát (Playback Speed)**: mở danh sách chọn nhanh **`0.5x` → `0.75x` → `1x (Chuẩn)` → `1.25x` → `1.5x` → `1.75x` → `2x`**, đồng bộ trạng thái xuyên suốt khi chuyển chất lượng hoặc sang video kế tiếp, cuộn mượt trên màn hình mobile chiều cao hẹp và đóng gọn khi nhấn ra ngoài / phím `Escape`.
- Audit: [1.9.3](docs/audits/1.9.3.md).

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
