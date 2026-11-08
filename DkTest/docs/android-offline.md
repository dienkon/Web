# DkTEST Android và làm bài offline

## File cài đặt

`releases/DkTEST-1.8.28-debug.apk` là APK cài thử, có chữ ký debug do Android SDK tạo; versionCode 3, có thể cài cập nhật trên bản debug trước cùng khóa ký. Hỗ trợ Android 7.0 (API 24) trở lên và Android System WebView cập nhật. Mã ứng dụng: `vn.dktest.student`. Chưa phải bản phát hành Google Play. [Audit 1.8.28](audits/1.8.28.md) ghi rõ giới hạn và các bước deploy rules/indexes/backend.

Giao diện, các trang được tải chậm, font toán học, máy tính và tài nguyên trong `public/` đều được đóng gói trong APK. Không cấu hình `server.url`, không cần tải website để khởi động.

## Cách dùng cho thí sinh

1. Cài APK, mở app và đăng nhập một lần khi có mạng bằng tên tài khoản/email và mật khẩu. Tài khoản chỉ dùng Google cần đặt mật khẩu trên website trước; OAuth Google native chưa được cấu hình trong bản này.
2. Có mạng: app mặc định mở **Online**, chỉ tải 5 đề đã phát hành vừa chỉnh sửa. Mở **Xem thông tin đề**, chọn **Tải đề về máy** khi nút xuất hiện. Đề trả phí phải có quyền mua/cấp quyền đang hoạt động. Chờ tải đầy đủ tài nguyên; không tự tải ngân hàng câu hỏi từ màn hình danh sách.
3. Tắt mạng, đóng/mở app để vào **Offline**. Tab chỉ đọc đề đã tải trong máy. Chọn **Thiết lập / tiếp tục làm bài**; nếu đề cho phép tạo đề con, chọn cách bốc câu, số câu, phần thi như online rồi bắt đầu. Bài đang làm tiếp tục với cấu hình đã đóng băng.
4. Đáp án, câu hỏi đã xáo trộn, thứ tự đáp án, thời điểm bắt đầu và thời gian còn lại được giữ trên máy. Bài hết giờ lúc app đóng được tiếp tục xử lý nộp khi mở lại, không tạo bài mới để đặt lại đồng hồ.
5. Nộp bài khi offline để xem kết quả tạm tính. App hiển thị **Đã nộp và lưu bài trên thiết bị**, cùng số bài chờ gửi. Tự luận cần giáo viên chấm giữ trạng thái chờ chấm.
6. Khi có mạng, app tự gửi. Chỉ chuyển sang **Máy chủ đã nhận** sau phản hồi xác nhận. Không cần nộp lại. Sau khi đồng bộ, mở kết quả khi có mạng sẽ lấy điểm giáo viên đã chấm và giữ bản đó để xem offline.

Đề chưa tải cần mạng để lấy về. Tải lại trong trang thông tin đề để cập nhật gói đã lưu; tab Offline không tự cập nhật. Catalogue được cache theo tài khoản 5 phút, có nút **Làm mới** và ô tìm mã đề (truy vấn tối đa 1 kết quả). Bản gói cũ chỉ được thay sau khi tải mới hoàn tất. AI, cộng đồng, đấu trường, ví và quản trị vẫn cần mạng.

Đề có liên kết website bên ngoài, tài nguyên bị lỗi hoặc tệp trả về HTML sẽ không được báo tải thành công. Tệp đính kèm được lưu cùng đề, nhưng các định dạng cần ứng dụng đọc riêng vẫn cần trình đọc tương ứng. Không dùng công cụ chạy code trên máy chủ khi offline.

## Lưu trữ và đồng bộ

- IndexedDB `dktest-offline-v1` (schema 2) giữ kho đề đầy đủ, Blob ảnh/âm thanh/tệp, bài nháp và bài đã nộp, phân vùng theo Firebase UID. URL Blob chỉ được tạo khi hiển thị, không ghi vào snapshot bài nộp. Không nhúng bản sao media vào tài liệu Firestore.
- Bài nháp được giữ thêm trong cơ chế phiên thi hiện có; IndexedDB có thể phục hồi kể cả khi bản sao nháp trong localStorage không còn. Xóa đề tải không xóa bài nháp hay bài chờ gửi. Đổi tài khoản không đọc/gửi bài của tài khoản khác.
- Android giữ thêm bản hàng đợi bằng `AtomicFile` trong vùng riêng của app, xác nhận ghi xong trước khi xóa nháp. WorkManager đặt điều kiện có mạng, thử lại với backoff và có lịch phục hồi định kỳ 15 phút. Tác vụ vẫn tồn tại khi WebView đóng, tiến trình bị dừng thông thường hoặc máy khởi động lại.
- Android có thể trì hoãn tác vụ nền do Doze, tiết kiệm pin hoặc chính sách hãng máy. Nếu người dùng chọn **Buộc dừng** trong Cài đặt Android, cần mở app lại để hệ điều hành cho phép chạy tiếp. Khi app đang mở, kiểm tra kết nối/quay lại app và kiểm tra định kỳ sẽ kích hoạt gửi lại.
- Phiên đồng bộ nền dùng refresh token Firebase được mã hóa AES-GCM bằng Android Keystore, không lưu mật khẩu. Đăng xuất xóa phiên đồng bộ nền; các bài chờ của tài khoản đó vẫn giữ trên máy và tiếp tục gửi khi đăng nhập lại đúng tài khoản. Android backup bị tắt.
- Ghi bài lên Firestore REST với `currentDocument.exists=false`, ID cố định theo lần làm, `studentUid` thật và `submittedAt` là thời gian nộp trên thiết bị. Sau lỗi mất xác nhận/ID trùng, kiểm tra chủ sở hữu và attempt ID. Không ghi đè bài đã có hoặc điểm giáo viên đã sửa. Không cần nới Firestore rules hiện tại.
- Lỗi mạng, phiên hết hiệu lực hoặc lỗi quyền ghi không xóa dữ liệu; trạng thái lỗi còn trong hàng đợi để thí sinh xem và thử lại. Không tuyên bố đã đồng bộ chỉ dựa vào sự kiện có mạng.
- Gỡ ứng dụng hoặc xóa dữ liệu ứng dụng sẽ xóa các bản lưu cục bộ, bao gồm bài chưa gửi.

Điểm offline và giới hạn lượt làm sử dụng phiên bản đề/lượt làm đã tải cùng các bài trên thiết bị. Các thay đổi quyền, lịch thi, số lượt trên thiết bị khác và đồng hồ máy chỉ có thể đối chiếu đầy đủ khi có mạng. Bản APK này phục vụ làm bài/luyện tập offline; không thay thế giám sát trực tuyến cho kỳ thi yêu cầu kiểm soát thời gian và chống can thiệp từ máy chủ.

## Build lại trên Windows

Yêu cầu Node 22+, JDK 21, Android SDK platform 36 và build-tools 35/36. Cấu hình `JAVA_HOME`, `ANDROID_HOME`. Script cũng tìm bộ công cụ trong `%USERPROFILE%/.cache/dktest-android` nếu đã cài tại đó.

```powershell
npm ci
npm run android:apk
```

Script build Vite với mode `mobile`, đồng bộ tài nguyên bằng Capacitor và chạy Gradle `assembleDebug`; APK được chép vào `releases/DkTEST-1.8.28-debug.apk` kèm tệp `.sha256`. Tên file lấy theo `release.json`. Build mobile tách khỏi `dist/` dùng cho website/server. Không đưa APK, SDK, khóa ký hoặc tài nguyên sinh ra vào Git.

API trực tuyến mặc định là `https://dk-test-v3.vercel.app`. Đổi bằng `VITE_MOBILE_API_URL` trong `.env.mobile.local` khi cần. Cấu hình Firebase dùng các biến `VITE_FIREBASE_*` hiện có. Không đóng gói biến môi trường server hay service-account private key.

Để phát hành chính thức, dùng khóa ký release được lưu bảo mật và tăng `versionCode` cho các lần cập nhật. Tham số `-Release` của `scripts/build-android.ps1` hiện tạo APK release **chưa ký**, cần ký trước khi cài/phân phối.

## Kiểm tra

```powershell
npm run lint
npm run check:release
npm run test:offline
npm run test:rules
npm run build:mobile
npm run test:android-ui
cd android
./gradlew.bat testDebugUnitTest
```

Các test offline kiểm tra truy vấn 5 đề/cache, tải đủ media, lỗi tải không làm hỏng bản cũ, quyền đề trả phí, đổi tài khoản, lưu bền, hàng đợi, gửi lại, lỗi quyền và không ghi đè sau khi mất ACK. Playwright chạy bundle production với khung hình điện thoại; toàn bộ request ra ngoài bị chặn, chỉ phục vụ tài nguyên đóng gói để mô phỏng APK. Test kiểm tra mở offline từ đầu, bài mới, ảnh offline, khôi phục nháp, nộp, mở lại kết quả, hàng đợi và cấu hình đề con. Test thứ hai dùng bridge giả để kiểm tra route Android Online/Offline và cache 5 đề khi thay đổi kết nối. Test rules/migration chạy project demo trên emulator; test Java kiểm tra payload Firestore của tác vụ nền.

Chưa xác nhận trên điện thoại Android thật trong môi trường phát triển này. Trước khi phân phối rộng, thử trên máy thật với tài khoản thí sinh: tải đề có hình/âm thanh, bật chế độ máy bay, đóng/mở app, nộp, nối mạng và đối chiếu ID bài trong quản trị; thử thêm chạy nền, khởi động lại máy và tự luận chờ chấm.

Tài liệu nền tảng: [Capacitor Android](https://capacitorjs.com/docs/android), [Android WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent), [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth/).
