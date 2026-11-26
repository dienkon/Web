# DkTEST changelog

## 2.0.4 — 2026-11-26 (Android versionCode 28)

- **Thiết kế mới hình ảnh minh họa chi tiết & khung xem trước cho từng Minigame cụ thể**:
  - Tạo mới 5 bộ hình minh họa 1200×630 sắc nét riêng biệt cho từng trò chơi (`public/images/minigames/horse-race.jpg`, `bee-race.jpg`, `tai-xiu.jpg`, `bau-cua.jpg`, `lucky-number.jpg`) cùng bảng cấu hình chi tiết hướng dẫn 3 bước (`src/services/minigame/minigameAssets.ts`, `src/components/minigame/MinigamePreviewCard.tsx`).
  - Hiển thị ảnh minh họa trên toàn bộ thẻ sự kiện của Học sinh (`StudentMinigame.tsx`) và Quản trị viên (`MinigameManagement.tsx`), bổ sung khu vực **Xem trước & Minh họa 5 Minigame Phúc Lợi** có thể chuyển đổi tương tác ở sảnh chờ, khung xem trước hướng dẫn trong phòng chơi, và **Thẻ xem trước trực tiếp (Zalo / Facebook / Sảnh chờ)** cập nhật tức thì ngay trong hộp thoại Admin tạo sự kiện.
  - Bổ sung hỗ trợ Open Graph / Social Meta (`src/services/server/socialMetadata.ts`, `api/social-meta.ts`, `vercel.json`) cho các đường dẫn `/minigame`, `/student/minigame`, `/minigame/:eventId`, `/student/minigame/:eventId` để khi gửi link lên Zalo / Facebook / Discord hiển thị đúng ảnh minh họa của trò chơi đó cùng tên sự kiện, số người tham gia và cơ cấu giải thưởng.
- **Thiết kế lại ảnh preview Voucher tối giản, tinh tế & đáng tin cậy (`public/images/voucher-banner.jpg`)**:
  - Thay thế hoàn toàn banner neon cũ nhiều chi tiết rối mắt bằng phong cách tối giản hiện đại (nền sáng lưới hình học thanh lịch, thẻ voucher trắng mờ viền xanh DkTEST, chữ tiếng Việt chuẩn dấu `DkTEST — VOUCHER ƯU ĐÃI`, dung lượng tối ưu 41.7 KB chuẩn 1200×630), giữ nguyên đường dẫn `/images/voucher-banner.jpg` tương thích 100% mọi link cũ.
- **Phiên bản Ứng dụng chuẩn cho iOS (iPhone / iPad)**:
  - Triển khai luồng cài đặt App iOS 1 chạm chuẩn Apple Web Clip (`.mobileconfig`) tại `/api/app-download?platform=ios` (`Content-Type: application/x-apple-aspen-config`, `FullScreen: true`, `IsRemovable: true`, nhúng sẵn biểu tượng 180×180 `public/images/ios-app-icon-180.png`) kèm trang hướng dẫn 3 bước trực quan và tự động nhận diện iPhone/iPad khi truy cập `/api/app-download`.
  - Hoàn thiện bộ thẻ PWA iOS Standalone (`index.html`, `public/manifest.json`), tạo hộp thoại cài đặt đa nền tảng `AppInstallModal.tsx` (chuyển tab **iOS (iPhone / iPad)** & **Android (APK)**), cập nhật `OpenInAppBanner.tsx` và `StudentLayout.tsx` để người dùng iPhone/iPad có thể tải & cài ứng dụng DkTEST trực tiếp trên điện thoại.
  - Bổ sung cấu hình native Capacitor iOS (`capacitor.config.ts`) và GitHub Actions workflow trên macOS (`.github/workflows/dktest-ios-release.yml`) tự động build & đính kèm gói `DkTEST-<version>-ios-unsigned.ipa` lên GitHub Releases (ghi chú rõ bản `.ipa` chưa ký Apple Developer dành cho AltStore / Sideloadly / TrollStore hoặc tự ký Xcode, trong khi `.mobileconfig` và Safari "Thêm vào MH chính" hoạt động ngay trên mọi iPhone/iPad).
- Audit: [2.0.4](docs/audits/2.0.4.md).

## 2.0.3 — 2026-11-26 (Android versionCode 27)

- **Nâng cấp toàn diện Minigame Phúc lợi — Hỗ trợ đua từ 2 người chơi, số lượng giải thưởng tùy ý (1–32 giải) & số tiền thưởng bất kỳ**:
  - **Hỗ trợ Đua Ngựa & Đua Ong từ 2 người chơi (`1 vs 1`) đến 64 người**: mở rộng `createMinigameEvent` (`server/services/minigameService.ts`) và giao diện tạo phòng (`MinigameManagement.tsx`) hỗ trợ các mức chọn nhanh `2 / 4 / 8 / 16 / 32` người chơi hoặc nhập số tùy ý (`2–64`), cùng lựa chọn `2 / 4 / 8` con/lượt; nâng cấp `raceEngine.ts` bảo đảm không bao giờ sinh lượt đua lẻ 1 con (ví dụ 6 người chạy 2 con/lượt tự gộp 3 người thắng vào Chung kết 3 làn).
  - **Cơ cấu giải thưởng tùy biến hoàn toàn (ít hơn 3, bằng 3, hoặc nhiều hơn 3 — tối đa 32 giải)**: thêm nút **+ Thêm giải xếp hạng**, **+ Thêm giải chung**, chọn thứ hạng (`#1..#32` hoặc `Chung`) và nút xóa giải (chỉ cần tối thiểu 1 giải); nâng cấp `advanceRaceTournamentIfReady` trả về đầy đủ `rankedUids` toàn giải và `buildRaceWinners` / `evaluateTaiXiuWinners` / `evaluateBauCuaWinners` / `evaluateLuckyNumberWinners` trao thưởng chính xác theo mọi hạng đã cấu hình; cập nhật `WinnersPodiumCard.tsx` và `RaceTrackStage.tsx` hiển thị gọn đẹp với 1, 2, 3 hay 4+ giải.
  - **Nhập số tiền thưởng bất kỳ từng đồng (không ép bước nhảy 1.000đ)**: thay ô nhập tiền ở `MinigameManagement.tsx` bằng ô số nguyên tự do `inputMode="numeric"` (nhập được mọi con số từ `0` tới `1.000.000.000đ`, kể cả số lẻ như `1đ`, `777đ`, `12.345đ`, `250.000đ`) kèm hiển thị định dạng VNĐ tức thì, các nút điền nhanh (`1K–50K`) và tổng ngân sách dự kiến; nâng trần Zod `amountVnd` lên `1_000_000_000` và `prizes` lên tối đa `32` giải.
  - **Kiểm thử tự động**: bổ sung các test case mới trong `tests/minigameEngine.test.ts` cho đua 2 người 1v1 (1 giải lẻ `7.777đ` & 2 giải `12.345đ` / `1.111đ`), giải 6 người 2 con/lượt với 5 giải (`>3` giải), Bầu Cua giải xếp hạng tùy chỉnh, và xác thực Zod `createMinigameSchema`.
- Audit: [2.0.3](docs/audits/2.0.3.md).

## 2.0.2 — 2026-11-23 (Android versionCode 26)

- **Chuẩn hóa toàn diện Giao diện Tối (Dark Mode) & Mặc định Giao diện Sáng cho người dùng mới (`index.html`, `ThemeContext.tsx`, `src/index.css`, `ExamIntro.tsx`)**:
  - Người dùng truy cập lần đầu (`dktest_theme` chưa thiết lập) luôn khởi động ở **chế độ Sáng (Light Mode)** kèm màn hình chờ khởi động sáng đồng bộ (không còn tự chuyển sang giao diện tối theo hệ điều hành khi mới vào lần đầu).
  - Loại bỏ lỗi ghi đè `--color-slate-50: #ffffff` gây nền xám bệch ở `bg-slate-50/70` (`ExamIntro`) và tiêu đề trắng chói ở `bg-white/95` (`CourseOnboardingGuideModal`); bổ sung hệ thống quy tắc thích ứng tối toàn hệ thống cho mọi bề mặt trung tính, pastel callout (`blue/indigo/purple/emerald/amber/rose-50/100`), gradient sáng, viền, chữ tối màu, hover, input/select và `.latex-preview` với độ tương phản đạt chuẩn WCAG AA+.
- **Loại bỏ hoàn toàn tính năng Phòng Mật Mã (`escape-room`)**:
  - Gỡ khỏi thanh điều hướng máy tính, menu di động, danh mục dưới cùng (`StudentLayout.tsx`), danh sách App Links (`appLinks.ts`, `AndroidManifest.xml`), và chuyển hướng `/escape-room` / `/student/escape-room` về trang chủ `/` (`router/index.tsx`).
- **Sửa lỗi thanh Sidebar di động không cuộn được (`StudentLayout.tsx`, `AdminLayout.tsx`)**:
  - Thiết lập khung drawer cố định `h-dvh max-h-dvh flex flex-col overflow-hidden` với vùng danh sách điều hướng `flex-1 min-h-0 overflow-y-auto overscroll-contain` và nút đăng xuất ghim gọn ở đáy (có `safe-area-bottom`), đảm bảo cuộn chạm mượt mà tới toàn bộ các mục trên mọi cỡ màn hình điện thoại.
- **Viết mới văn bản Bản quyền & Pháp lý chi tiết (8 Điều khoản) + Mở Popup trực tiếp tại trang Đăng ký (`LegalPolicyContent.tsx`, `LegalPolicy.tsx`, `Register.tsx`)**:
  - Soạn chi tiết 8 điều khoản pháp lý chuẩn Việt Nam (Luật SHTT 2022, Nghị định 13/2023/NĐ-CP bảo vệ dữ liệu cá nhân, Quy chế thi chống gian lận, Ví DkTEST / Khóa học / Acc AI, Minigame Phúc lợi 0đ không cờ bạc, Gia sư AI & Cộng đồng, Miễn trừ trách nhiệm & Quy trình gỡ bỏ bản quyền trong 24h) kèm thanh nhảy nhanh từng điều khoản.
  - Trên trang Đăng ký (`Register.tsx`), bấm vào liên kết điều khoản sẽ mở ngay **Popup Modal (`LegalPolicyModal`)** ngay tại chỗ kèm nút **Tôi đã đọc & Đồng ý toàn bộ Điều khoản** (tự đánh dấu checkbox mà không làm mất dữ liệu người dùng đang nhập).
- **Sửa lỗi vỡ/phóng đại bản đồ trang Hành trình (`/journey`) & Gỡ bỏ Pet Sparky (`World3DViewport.tsx`, `LearningJourney.tsx`)**:
  - Loại bỏ nguyên nhân gây vỡ khung & phóng to nhòe 10× ở các màn giữa/cuối (`perspective: 1200px` kết hợp `rotateX(18deg)` trên bản đồ cao ~7000px đẩy các màn từ Màn 25 trở đi vượt mặt phẳng camera); chuyển sân khấu cuộn về mặt phẳng sắc nét theo tỷ lệ phần trăm responsive đồng khớp 100% giữa đường nối SVG và các đảo màn chơi.
  - Gỡ bỏ hoàn toàn widget thú cưng nổi (`StudyCompanionWidget` / Sparky) vướng tầm nhìn khỏi trang Hành trình.
- Audit: [2.0.2](docs/audits/2.0.2.md).

## 2.0.1 — 2026-11-22 (Android versionCode 25)

- **Sửa triệt để lỗi API tải App (`/api/app-download`) và App vẫn hiển thị/tải bản cũ `1.9.14`**:
  - Nguyên nhân gốc: trên Vercel serverless, `readCurrentReleaseJson()` không tìm thấy `release.json` ở `process.cwd()` nên rơi về giá trị dự phòng gán cứng `"1.9.14"` (`androidVersionCode: 20`), kéo theo việc truy vấn đúng tag cũ `dktest-v1.9.14` trên GitHub Releases dù bản `2.0.0` đã được GitHub Actions phát hành.
  - Tự động sinh `src/services/server/generatedReleaseMeta.ts` từ `release.json` mỗi lần chạy `scripts/generate-html-template.js` (`npm run build`), để cả Vercel serverless (`appDownload.ts`) lẫn fallback client (`appLinks.ts`) luôn đóng gói chính xác số phiên bản mới nhất, không bao giờ còn chuỗi gán cứng `1.9.14`.
  - Nâng cấp `resolveAndroidApkDownload()` trong `src/services/server/appDownload.ts` kiểm tra nhiều đường dẫn `release.json` đồng thời luôn so sánh semver chọn bản phát hành có tệp `.apk` cao nhất trên GitHub Releases.
- Audit: [2.0.1](docs/audits/2.0.1.md).

## 2.0.0 — 2026-11-22 (Android versionCode 24)

- **Phiên bản lớn DkTEST 2.0.0 — Chuẩn hóa Popup riêng toàn hệ thống (không dùng `window.alert`)**:
  - Xây dựng hệ thống hộp thoại popup riêng toàn cục (`src/services/appDialogService.ts` + `src/components/common/AppDialogHost.tsx`, gắn tại `src/App.tsx`), hỗ trợ `showAppAlert`, `showAppConfirm`, `showAppPrompt` với giao diện DkTEST chuẩn (Dark/Light mode, phím tắt `Esc`/`Enter`) và tự động chặn/chuyển hướng mọi lời gọi `window.alert()` trên toàn ứng dụng sang popup riêng.
- **Sửa triệt để lỗi Admin xóa sự kiện Minigame không được**:
  - Sửa `cancelOrDeleteMinigameEvent` trong `server/services/minigameService.ts` để khi `hardDelete === true` luôn xóa thẳng document sự kiện khỏi Firestore (kể cả khi đã có bot ảo hoặc thí sinh tham gia) và dọn sạch bộ đệm cổ vũ Live; cập nhật `MinigameManagement.tsx` dùng popup xác nhận riêng `showAppConfirm` và gọi xóa trực tiếp (`hardDelete = true`).
- **Tối ưu mạnh Firestore READ (chỉ tải 5 mục gần nhất)**:
  - **Thông báo (`notificationService.ts`, `NotificationPermissionController.tsx`, `notificationPushService.ts`)**: giảm mặc định tải từ `15`–`25` (và fallback `50`–`120`) xuống chỉ còn **5 thông báo gần nhất** (`limit(5)` phía client, `limit(15)` có cache 10s phía server), đồng thời bỏ hẳn truy vấn composite index thừa trên `notifications`.
  - **Yêu cầu nạp tiền & Lịch sử ví (`server/services/walletService.ts`)**: giảm giới hạn mặc định của `getDepositRequests` (`50` → **`5`**), `getStudentDepositRequests` (`30` → **`5`**), và `getStudentTransactions` (`30` → **`5`**), cắt giảm đáng kể số lượt đọc Firestore khi mở trang Ví & Quản trị Ví.
- Audit: [2.0.0](docs/audits/2.0.0.md).

## 1.9.17 — 2026-11-22 (Android versionCode 23)

- **Sửa triệt để 3 lỗi thực tế (Firestore Index, RTDB Permission & Minigame 400 Bad Request)**:
  - **Sửa cảnh báo `[RecentExamsQuickSlots]` Firestore composite index fallback (`RecentExamsQuickSlots.tsx`)**: bỏ `orderBy("submittedAt", "desc")` khỏi truy vấn Firestore `where("studentId", "==", user.uid)`, lấy tối đa 15 bản ghi theo single-field index tự động rồi sắp xếp giảm dần trong bộ nhớ để lấy 3 đề gần nhất — hết hoàn toàn cảnh báo thiếu index.
  - **Sửa lỗi `@firebase/database: set at /minigame_cheers/... failed: permission_denied`**: chuyển luồng thả emoji cổ vũ Live sang REST API xác thực phía server (`POST /api/minigames/:id/cheer` & `GET /api/minigames/:id/cheers` với bộ đệm vòng trên RAM — 0 Firestore reads/writes và không còn lỗi quyền RTDB).
  - **Sửa lỗi `POST /api/admin/minigames/... 400 (Bad Request)`**: chuyển `launchRaceHeat` và `completeRaceHeat` sang xử lý idempotent (trả về trạng thái sự kiện hiện tại thay vì ném 400 khi có yêu cầu hoàn tất/chạy lượt bị gọi trùng).
- **Cập nhật luật Đoán Số May Mắn (`lucky_number`) — Chỉ chọn người trúng chính xác con số**:
  - Sửa `evaluateLuckyNumberWinners` (`src/services/minigame/gameLogic.ts`) chỉ lấy các thí sinh dự đoán trùng khớp tuyệt đối (`Number(prediction) === luckyNumber`), trả về danh sách trống nếu không ai đoán trúng; cập nhật hiển thị ở `LuckyNumberStage.tsx` và unit test.
- **Nâng cấp hiệu ứng Minigame & thêm chế độ Bot ảo mô phỏng cho Admin**:
  - **Bot ảo thử hiệu ứng (`server/services/minigameService.ts`, `minigameAdminRoutes.ts`, `MinigameManagement.tsx`)**: Admin có thể bấm `+1 Bot`, `Điền đầy Bot`, `Xóa Bot`, và `Chạy lại Demo` để xem trước toàn bộ vòng đua / lắc xúc xắc / quay số ngay cả khi chưa có học sinh vào phòng; khóa bảo vệ tuyệt đối trong `distributeMinigamePrizes` đảm bảo bot ảo (`isBot: true`) **không bao giờ được cộng tiền Ví DkTEST thật**.
  - **Nâng cấp đồ họa sân khấu trực tiếp**: `RaceTrackStage.tsx` bổ sung khăn choàng nài ngựa bay theo nhịp phi, nền khán đài/mây/đường chạy cuộn parallax, bảng bình luận thể thao trực tiếp và chớp đèn photo-finish khi cán đích; `TaiXiuStage.tsx` thêm nắp bát gốm rung lắc & hiệu ứng mở bát; `BauCuaStage.tsx` thêm nắp sơn mài lễ hội rung lắc; `LuckyNumberStage.tsx` nâng cấp lồng quay số phát sáng và banner báo kết quả trúng chính xác.
- **Tùy chọn Hủy / Bật lại gia hạn gói Slot hàng tháng cho khách (`StudentAiShop.tsx`, `aiShopService.ts`, `aiShopStudentRoutes.ts`)**:
  - Thêm các trường `autoRenewCancelled`, `autoRenewCancelledAt`, `autoRenewCancelReason` và 2 endpoint xác thực chính chủ `POST /api/ai-shop/orders/:orderId/cancel-renewal` & `POST /api/ai-shop/orders/:orderId/resume-renewal`.
  - Khi hủy gia hạn, hệ thống chốt `stopDate` vào cuối kỳ hiện tại đang dùng/đã trả tiền để không phát sinh thêm kỳ thu mới sau kỳ này; khách có thể bật lại gia hạn bất kỳ lúc nào trước `stopDate`. Mọi thao tác đều ghi nhật ký kiểm toán `ai_audit_logs`.
- **Hệ thống Thông báo Thật tới Điện thoại & Trình duyệt (Web + Android App) + Đóng gói APK chuẩn `v1.9.17`**:
  - **Xin quyền thông báo khi lần đầu mở Web/App (`NotificationPermissionController.tsx`, `deviceNotificationService.ts`)**: hiển thị hộp thoại thân thiện xin quyền thông báo hệ điều hành (Android 13+ `POST_NOTIFICATIONS` / Web `Notification` + Service Worker `public/sw-notifications.js`), kết hợp banner heads-up trong ứng dụng có thể bấm mở thẳng đúng trang.
  - **Plugin Android Native & Chạy nền (`DkNotificationsPlugin.java`, `NotificationPollWorker.java`, `MainActivity.java`, `AndroidManifest.xml`)**: tạo kênh thông báo ưu tiên cao `dktest_alerts`, hiện thông báo thanh trạng thái & rung/chuông kèm deep-link mở thẳng app tới `/minigame/...` hoặc `/student/ai-shop`, và lập lịch WorkManager kiểm tra thông báo định kỳ 15 phút khi có mạng (kèm chống bắn trùng nhờ đồng bộ `KEY_LAST_MS`).
  - **Tự động phát & Phát tay từ Admin (`notificationPushService.ts`, `GET /api/notifications/feed`, `POST /api/admin/notifications/broadcast`)**: tự động gửi thông báo thiết bị khi Admin tạo sự kiện Minigame mới, trao thưởng cho người thắng thật, hoàn tất đơn Acc AI, tạo Thông báo hệ thống đang hoạt động, hoặc bấm nút **Gửi thông báo Web/App** để thông báo tính năng / sự kiện mới; sử dụng ID đảo ngược thời gian (`00_<invTs>_...`) giúp đọc mới nhất trước mà không cần composite index Firestore.
- Audit: [1.9.17](docs/audits/1.9.17.md).

## 1.9.16 — 2026-11-22 (Android versionCode 22)

- **Tinh chỉnh toàn diện quy trình mua Acc AI (`/student/ai-shop` & `/admin/ai-shop`)**:
  - **Gom nhóm 6 dịch vụ gọn gàng trên mặt tiền Cửa hàng Học sinh**: chỉ hiển thị 6 thẻ chính (`CHAT GPT`, `Gemini Pro 3M`, `Gemini Plus 6M`, `Gemini Pro (Add Fam)`, `Yt Pre`, `Verify Student`); bấm vào mỗi thẻ mở hộp thoại chọn gói con cụ thể (ví dụ CHAT GPT → `Sài riêng` / `Dùng chung`; Gemini Pro 3M & Plus 6M → `Link Offer` / `Pay hộ`; Gemini Pro Add Fam → `Slot Lỏm` / `Slot Ngon`).
  - **Bắt buộc thông tin liên hệ & nâng cấp chuẩn xác (Client + Server Zod)**: mọi đơn hàng bắt buộc nhập **SĐT Zalo** (`contactPhoneZalo`); riêng `Gemini Pro (Add Fam)`, `Yt Pre`, và `Verify Student` bắt buộc nhập **Email cần nâng cấp (`targetUpgradeEmail`)**.
  - **Thông báo Discord tự động tới Admin kèm Link xử lý trực tiếp**: ngay khi học sinh xác nhận mua, server gửi Discord Embed chứa mã đơn, khách hàng, SĐT Zalo, email cần up, tổng tiền đã thanh toán và link bấm thẳng tới `/admin/ai-shop?tab=orders&orderId=<id>` (tự động mở đúng ngăn kéo xử lý đơn hàng).
  - **Admin hoàn tất đơn kèm Ghi chú & Hình ảnh/File đính kèm → Thông báo phía User**: Admin nhập ghi chú bàn giao (`adminDeliveryNote`) và tải lên hình ảnh/tệp qua Cloudinary (`adminAttachments`); khi lưu hoàn tất sẽ bật thông báo nổi bật phía học sinh (`studentNotificationUnread`) kèm xem ảnh phóng to (lightbox), tải file đính kèm, nút đánh dấu đã đọc (`POST /api/ai-shop/orders/:orderId/ack-notification`), và bổ sung tab **Lịch sử giao dịch** đầy đủ cho học sinh.
- **Thêm hệ thống Minigame Sự kiện Phúc lợi Thời gian thực — 100% Miễn phí (`/student/minigame`, `/minigame/:eventId`, `/admin/minigames`)**:
  - **Tuyệt đối miễn phí (`entryFeeVnd: 0`) — Không thu phí, không đặt cược**: chỉ dùng để Admin tổ chức sự kiện tặng quà phúc lợi (+ tiền Ví DkTEST qua giao dịch nguyên tử `minigame_reward_credit`, tặng mã Voucher, hoặc quà tùy chỉnh bất kỳ).
  - **5 trò chơi thời gian thực**:
    1. **Đua Ngựa Tranh Cúp** & **Đua Ong Về Tổ** (`RaceTrackStage.tsx`, `raceEngine.ts`): hỗ trợ cấu hình **4, 8, 16, 32** người chơi và số ngựa/ong mỗi lượt (`4` hoặc `8` con/lượt), tự động chia bảng Vòng loại → Bán kết → Chung kết tranh Giải Nhất/Nhì/Ba; model SVG hoạt hình khớp chân phi nước đại / ong vỗ cánh 60fps, bụi vó ngựa, hiệu ứng nước rút bứt tốc, đếm ngược `3-2-1` đồng bộ tất cả màn hình, bảng xếp hạng Live từng giây, pháo hoa chiến thắng và âm thanh Web Audio tổng hợp.
    2. **Tài Xỉu Phúc Lợi** (`TaiXiuStage.tsx`), **Bầu Cua Hội Xuân** (`BauCuaStage.tsx`), và **Đoán Số May Mắn 00–99** (`LuckyNumberStage.tsx`): chọn dự đoán miễn phí, quay/lắc xúc xắc & lồng quay số trực tiếp sinh ngẫu nhiên CSPRNG (`crypto.randomInt`) trên server.
  - **Tham gia 1 chạm qua Link mời (`/minigame/:eventId`) & Cổ vũ Live (`LiveCheerBar.tsx`)**: thả emoji cổ vũ thời gian thực qua Firebase RTDB (`minigame_cheers`, 0 Firestore reads/writes); bảo vệ quyền ghi bằng `firestore.rules` (`minigame_events`) và `database.rules.json`.
- Audit: [1.9.16](docs/audits/1.9.16.md).

## 1.9.15 — 2026-11-22 (Android versionCode 21)

- **Thêm hệ thống Bán Acc AI tự động cho Học sinh & Quản lý Khách hàng / Đơn hàng / Lịch thu / Công nợ cho Admin**:
  - **Tab Học sinh — Cửa hàng Acc AI (`/student/ai-shop`, `/ai-shop`)**: tích hợp vào thanh điều hướng máy tính & menu di động (`StudentLayout.tsx`). Học sinh xem bảng giá các gói dịch vụ AI đang mở bán, thanh toán mua tự động trực tiếp bằng **Ví DkTEST** (giao dịch nguyên tử trên server `POST /api/ai-shop/purchase` tự trừ ví, ghi `wallet_transactions` loại `ai_service_purchase_debit`, tự liên kết/tạo mã khách `KHxxxx`, tạo đơn hàng và giao dịch thu tiền kỳ đầu kèm `idempotencyKey` chống bấm đúp), xem tài khoản/slot đã được Admin giao (chỉ lưu email/mã slot, tuyệt đối không lưu mật khẩu), theo dõi từng kỳ thu & ngày hết hạn dịch vụ, và tự thanh toán/gia hạn kỳ tiếp theo qua Ví DkTEST (`POST /api/ai-shop/orders/:orderId/pay-wallet`).
  - **Tab Admin — Bán Acc AI & Công nợ (`/admin/ai-shop`)**: tích hợp đầy đủ 7 mục tiếng Việt (`Tổng quan`, `Khách hàng`, `Đơn hàng`, `Thu tiền`, `Dịch vụ`, `Báo cáo`, `Cài đặt`) cùng 3 nút thao tác nhanh nổi bật (`+ Thêm khách`, `+ Thêm đơn`, `+ Thu tiền`):
    - **Quản lý Khách hàng**: mã khách `KHxxxx` duy nhất, tìm kiếm theo tên/mã/SĐT/Zalo/email, trang chi tiết tổng hợp toàn bộ đơn đã mua, tài khoản/slot đã giao, phải thu/đã thu/còn nợ/trả trước (cộng riêng từ từng đơn thực tế, không bù trừ), chặn xóa vĩnh viễn khách đã có giao dịch và ưu tiên lưu trữ bảo toàn lịch sử.
    - **Danh mục Dịch vụ**: khởi tạo 10 gói dịch vụ chuẩn theo bảng giá thực tế (ChatGPT Plus 30D riêng/chung, Gemini Plus 6M offer/pay hộ, Gemini Pro 3M offer/pay hộ, Gemini Pro slot lỏm 15k→5k/tháng, Gemini Pro slot ngon 25k/tháng, Verify Student 20k, YouTube Premium slot 25k/tháng) + gói báo giá riêng để trống giá bắt buộc nhập khi tạo đơn; sửa giá bảng sau này không ảnh hưởng các đơn đã chốt; đổi dịch vụ trên đơn yêu cầu xác nhận cập nhật giá rõ ràng.
    - **Động cơ Lịch thu, Phân bổ & Công nợ thuần (`src/services/aiShop/billingEngine.ts`)**: múi giờ `Asia/Ho_Chi_Minh`, số nguyên VNĐ, ngày hiển thị `dd/mm/yyyy`; đơn một lần chỉ sinh đúng 1 kỳ; đơn hàng tháng giữ ngày gốc (ngày 29/30/31 tự kẹp về cuối tháng thiếu ngày rồi bám lại ngày gốc tháng sau); không phát sinh kỳ có `dueDate >= stopDate`; phân biệt rõ ngày hết hạn dịch vụ và ngày đến hạn thanh toán; phân bổ FIFO vào kỳ cũ nhất còn thiếu của chính đơn đó; không bù trừ tiền thừa giữa các đơn; sửa/hủy giao dịch có lý do & nhật ký kiểm toán (`ai_audit_logs`) và tính lại công nợ ngay lập tức; chạy lại/tải lại trang không tạo trùng kỳ thu.
    - **Dashboard, Báo cáo, Xuất/Nhập Excel & Sao lưu**: 7 KPI chuẩn, biểu đồ **tiền thực thu** theo tháng (Recharts — tách bạch tiền thực thu theo ngày nhận tiền với doanh thu kế toán), thống kê theo dịch vụ, danh sách khách nợ / cần thu hôm nay & 7 ngày tới / dịch vụ sắp hết hạn, xuất Excel nhiều sheet (`.xlsx`), xuất CSV UTF-8 BOM, sao lưu JSON, và trình nhập Excel 4 bước (tải file → ánh xạ cột → xem trước/kiểm lỗi/lọc trùng khách & đơn → xác nhận ghi).
  - **Backend & Bảo mật (`server/services/aiShopService.ts`, `aiShopAdminRoutes.ts`, `aiShopStudentRoutes.ts`, `firestore.rules`, `vercel.json`)**: định tuyến `/api/ai-shop/*` qua `/api/wallet` (không tăng số lượng Vercel serverless functions), xác thực `requireAuth`/`requireAdmin`, xác thực đầu vào Zod, chống gửi trùng `ai_idempotency_keys`, và khóa `firestore.rules` cho 6 collection `ai_*` (học sinh chỉ đọc được đơn/giao dịch của chính mình, mọi ghi dữ liệu đi qua server/Admin).
  - **Kiểm thử tự động**: bổ sung `tests/aiShopBillingEngine.test.ts` (12 test bao phủ đủ mọi kịch bản bắt buộc mục 9) và `tests/aiShopExcelAndValidation.test.ts` (4 test cho nhập Excel chống trùng & Zod validation).
- Audit: [1.9.15](docs/audits/1.9.15.md).

## 1.9.14 — 2026-11-21 (Android versionCode 20)

- **Nâng cấp toàn diện hệ thống Voucher chuẩn cơ chế Shopee (`savedVoucherService.ts`, `SavedVoucherPicker.tsx`, `server/services/voucherService.ts`, `server/routes/walletRoutes.ts`, `walletClientService.ts`, `StudentWallet.tsx`, `ExamIntro.tsx`, `CourseDetail.tsx`, `WalletManagement.tsx`)**:
  - **Phân tách rạch ròi Voucher tặng tiền thẳng vs Voucher giảm giá / thưởng nạp**: mở link `/voucher/:code` hoặc nhập mã ở trang Ví gọi `GET /api/vouchers/inspect/:code` trước. Với `gift_money` giữ nguyên cơ chế cộng tiền thẳng vào ví + pháo hoa ăn mừng. Với mã giảm giá mở khóa (`discount_percent`, `discount_fixed`) hoặc thưởng nạp (`deposit_bonus_percent`, `deposit_bonus_fixed`), hiển thị hộp thoại **Lưu voucher** vào `localStorage` (hợp nhất tự động nếu lưu trước khi đăng nhập). Nếu đã lưu trên thiết bị, mở lại sẽ báo rõ **Đã lưu trong Kho Voucher** và **không tăng thêm lượt lưu**.
  - **Chỉ tính lượt lưu (`savedCount`), không trừ lượt dùng (`usedCount`)**: bổ sung endpoint `POST /api/vouchers/save` (`recordVoucherSave`) chỉ tăng `savedCount` trên Firestore và từ chối `gift_money`; trang quản trị `WalletManagement.tsx` hiển thị song song lượt sử dụng và lượt đã lưu.
  - **Kho Voucher & Tự động đề xuất theo ngữ cảnh thanh toán (`SavedVoucherPicker.tsx`)**: thêm tab **Kho Voucher** trong Ví DkTEST và nhúng bộ chọn gợi ý thông minh vào cả 3 điểm thanh toán: **Nạp tiền ví** (`deposit`), **Mở khóa đề thi** (`exam_unlock`), **Mở khóa khóa học / gói video** (`course_unlock`). Hệ thống chỉ đề xuất đúng nhóm voucher phù hợp, xếp mã tiết kiệm/thưởng cao nhất lên đầu, hiển thị lý do nếu chưa đủ điều kiện tối thiểu, và tự gỡ khỏi Kho sau khi sử dụng.
  - **Cảnh báo tức thì khi nhập sai loại voucher**: `validateVoucher` (cả server lẫn client fallback) và ô nhập mã nạp tiền kiểm tra tự động ngay khi người dùng nhập/bấm Áp dụng, đồng thời chặn bước xác nhận nạp tiền nếu nhập nhầm voucher giảm giá đề thi hoặc voucher quà tặng trực tiếp kèm thông báo giải thích chính xác.
- **Thêm hệ thống Giới thiệu bạn bè — Mời bạn dùng DkTEST (`server/services/referralService.ts`, `server/routes/walletRoutes.ts`, `referralClientService.ts`, `StudentWallet.tsx`, `Register.tsx`, `router/index.tsx`, `firestore.rules`, `vercel.json`)**:
  - **Thưởng ngẫu nhiên 100đ – 1.000đ sinh phía máy chủ (`crypto.randomInt(100, 1001)`)**: mỗi người dùng có mã giới thiệu riêng (`DKXXXXXX`) và link mời `/ref/:code` (tự động lưu mã và điền sẵn trên trang Đăng ký `/register?ref=...`, tự xác nhận sau khi đăng ký bằng Username, Email hoặc Google).
  - **Rút tiền thưởng vào Ví DkTEST (tối thiểu 1.000đ)**: bổ sung tab **Mời bạn nhận thưởng** trong Ví DkTEST với thanh tiến độ đạt mốc `1.000đ`, lịch sử mời thành công và nút **Rút về Ví DkTEST** gọi `POST /api/referral/withdraw` (giao dịch nguyên tử cộng thẳng vào `wallets/{uid}` kèm lịch sử `referral_withdraw_credit`).
  - **Bảo vệ chống gian lận đa tầng trên server**: kiểm tra chặt chẽ tự giới thiệu, trùng email/username, tuổi tài khoản mới (`<= 7 ngày`), trạng thái tài khoản, mỗi tài khoản chỉ được xác nhận mã 1 lần (`referral_claims/{refereeUid}`), chặn vòng giới thiệu chéo `A ↔ B`, băm HMAC-SHA256 địa chỉ IP & mã định danh thiết bị (`referral_ip_guards`, `referral_device_guards` — chặn trùng IP/thiết bị với người mời, cooldown IP 24 giờ, trần 2 lượt/IP, 1 lượt/thiết bị), và giới hạn trần 20 lượt/ngày cho người mời. Tất cả collection `referral_*` khóa ghi trực tiếp từ client trong `firestore.rules`.
- Audit: [1.9.14](docs/audits/1.9.14.md).

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
