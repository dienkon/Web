# 12A1 · Nhà Có Nhau — Google Drive trực tiếp

Trang không dùng `drive-data.js`. Danh sách thư mục/tệp lấy từ Drive được lưu tại trình duyệt tối đa 10 giờ để hiện ngay khi mở lại. Thư mục đã có dữ liệu được hiển thị trước, chỉ đọc lại khi dữ liệu quá 10 phút; thư mục mới được đọc ngay khi mở. Thư mục đang xem được tự kiểm tra mỗi 10 phút, toàn bộ cây mỗi 6 giờ khi trang đang mở để cập nhật album, tìm kiếm, số lượng và thành viên. Có thể đổi các khoảng thời gian trong `drive-config.js`; nút Cập nhật và thao tác tải lên/tạo thư mục luôn đọc lại ngay. Lưới giữ nguyên các ảnh đã tải nếu nội dung không đổi; khung xem ảnh hiện bản xem trước trong lúc tải bản gốc. Thay đổi ngoài Drive có thể chậm đến chu kỳ kiểm tra tiếp theo; đây là polling, không phải thông báo push tức thì của Google.

## Kết nối dùng chung (một lần bằng tài khoản có quyền ghi thư mục)

1. Mở [Google Apps Script](https://script.google.com/home/start), tạo dự án. Thay mã `Code.gs` bằng nội dung `google-apps-script.gs`.
2. Trong **Project Settings**, bật **Show appsscript.json manifest file in editor**. Thay nội dung manifest bằng `appsscript.json` trong dự án này (đã khai báo Drive API v3). Nếu dùng Cloud project riêng, bật Google Drive API trong Google Cloud Console của project đó.
3. Chọn hàm **setup**, bấm **Run**, cấp quyền Google Drive, Sheets và kết nối bên ngoài. Hàm tạo một bảng lịch sử riêng trong Drive của chủ web, ngoài thư mục ảnh. Không chia sẻ công khai bảng này; web đọc lịch sử qua cầu nối.
4. **Deploy → New deployment → Web app**. Chọn **Execute as: Me**, **Who has access: Anyone**, rồi Deploy. Tài khoản Workspace có thể bị quản trị viên hạn chế tùy chọn Anyone.
5. Sao chép URL kết thúc bằng `/exec`. Điền vào `appsScriptUrl` trong `drive-config.js` rồi triển khai web như bình thường. Đây là cấu hình dùng chung cho mọi người. Không đưa access token Google vào web.
6. Để thử riêng trên máy: bấm **Kết nối Drive**, dán URL `/exec`, bấm **Lưu & kết nối**. Giá trị này chỉ lưu ở trình duyệt đang dùng và ưu tiên hơn cấu hình chung.

Sau khi sửa Apps Script, vào **Deploy → Manage deployments → Edit → New version → Deploy** để URL `/exec` chạy mã mới.

### Lỗi thiếu quyền `UrlFetchApp.fetch` / `script.external_request`

1. Vào **Project Settings**, bật hiển thị manifest, rồi mở **appsscript.json** trong trình soạn thảo. Thay bằng nội dung file `appsscript.json` trong repo; mảng `oauthScopes` phải có cả `drive`, `spreadsheets` và `script.external_request` với URL đầy đủ như file đó.
2. Lưu mã và manifest. Chọn **setup → Run** ngay trong trình soạn thảo bằng tài khoản chủ deployment. Trong **Review permissions**, cấp đủ các quyền được yêu cầu, kể cả kết nối dịch vụ bên ngoài. Mở URL `/exec` không thay thế được bước cấp quyền này.
3. Đợi `setup` hoàn tất thành công. Bản setup mới yêu cầu đủ quyền và thử đọc Drive API trước khi báo thành công.
4. **Deploy → Manage deployments → Edit → New version → Deploy**. Giữ **Execute as: Me**, dùng URL `/exec` của deployment vừa cập nhật rồi thử lại.

Nếu vẫn thiếu quyền, kiểm tra lại tài khoản chạy `setup` có phải tài khoản triển khai và manifest của chính dự án đang cung cấp URL `/exec` hay không. Hướng dẫn chính thức: [Apps Script authorization troubleshooting](https://developers.google.com/apps-script/guides/support/troubleshooting#authorization-is).

## Host web tĩnh

Xem [README.md](README.md) để host trên GitHub Pages. HTML/CSS/JavaScript gọi trực tiếp URL Apps Script trong `drive-config.js`. Không có API local và không cần chạy Python hoặc localhost.

## Tải tệp và lịch sử

- Chọn thư mục trong Kho Drive, bấm **Tải tệp lên thư mục này**, hoặc kéo thả nhiều tệp. Tệp trong hàng đợi giữ nguyên thư mục đích lúc được chọn, kể cả khi chuyển sang thư mục khác.
- Không có danh sách chặn loại tệp, không nén ảnh/video và không đặt giới hạn tổng dung lượng tệp trên web. Tệp bất kỳ được hiển thị dưới dạng tài liệu, mở bằng Drive Preview hoặc tải xuống.
- Tải tối đa hai tệp cùng lúc; thiết bị báo ít RAM hoặc bật tiết kiệm dữ liệu dùng một luồng. Trình duyệt đọc từng phần 2 MiB (cấu hình `uploadChunkBytes`), luôn làm tròn theo bội số 256 KiB và tuân theo kích thước cầu nối công bố. Cầu nối chấp nhận tối đa 8 MiB/request. Không đọc cả video vào RAM; giải phóng tham chiếu File sau khi Drive xác nhận hoàn tất.
- Hiện phần trăm và tốc độ theo những byte Drive đã xác nhận; kiểm tra offset trước khi gửi lại request mất phản hồi. Nút Dừng giữ phiên để tiếp tục; các tệp gián đoạn tự thử tiếp khi thiết bị phát sự kiện có mạng trở lại. Tốc độ thực tế còn phụ thuộc mạng và hạn mức Google; không có cam kết tốc độ hoặc không bao giờ crash.
- Khi mất mạng hoặc dừng, bấm **Tiếp tục tải**. Nếu đã đóng trang, chọn lại đúng tệp (tên, dung lượng, thời gian sửa và thư mục đích giống nhau) để tiếp tục phiên cũ. Phiên Drive hết hạn sau khoảng một tuần; khi đó cần tải lại từ đầu.
- **Tạo thư mục** tạo trong thư mục đang xem và thừa hưởng quyền từ thư mục cha. Cầu nối chỉ được đọc/ghi trong thư mục gốc cấu hình và các thư mục con; không có endpoint sửa/xóa tệp sẵn có.
- Tab **Lịch sử tải lên** đọc lịch sử dùng chung theo trang 50 thao tác, gồm tải lên/tạo thư mục, thời điểm, thư mục đích, dung lượng và trạng thái. Lịch sử ghi thao tác qua web; các thay đổi làm trực tiếp trong ứng dụng Drive được phản ánh trong kho, không ghi thành thao tác tải lên của web.
- Dung lượng lưu trữ, kích thước tệp, thời hạn phiên, hạn mức Google Drive/Apps Script/Sheets và chính sách tài khoản Google vẫn áp dụng. Lỗi từ Google được hiển thị để người dùng biết và tiếp tục sau.

Tài liệu: [Drive resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Tải ảnh khi trình duyệt chặn link Google

Ảnh ở kho, album, hồ sơ và dải xem nhanh dùng `referrerpolicy="no-referrer"`. Nếu cả hai đường ảnh trực tiếp đều thất bại, `drive-images.js` gọi cầu nối `faceThumbnail` đã được triển khai để nhận ảnh dạng data URL. Cầu nối vẫn kiểm tra tệp thuộc kho lớp trước khi đọc; không chuyển OAuth token sang trình duyệt. Lưới được khôi phục từ cache sẽ chờ kiểm tra kết nối xong rồi mới dùng cầu nối ảnh.

Đường dự phòng chạy tối đa ba ảnh cùng lúc, gộp yêu cầu trùng tệp và lưu trong RAM tối đa 48 ảnh / 16 MiB / 5 phút. Không ghi ảnh vào localStorage. Request thất bại hoặc ảnh hỏng không được cache thành công. Kết quả đến muộn không ghi đè ảnh mới; khi cả cầu nối cũng không đọc được, ô ảnh hiện thông báo rõ và khung xem có thể chuyển sang Drive Preview. Các ô đã tải xong dừng hiệu ứng skeleton.

Nếu đã triển khai phiên bản có `faceThumbnails: true`, sửa này chỉ cần tải lại web. Nếu còn dùng cầu nối cũ, cập nhật Apps Script theo hướng dẫn phía trên. Favicon dùng đường dẫn tương đối để tương thích GitHub Pages.

## Hồ sơ người nhà

Bấm thành viên để hiện giới thiệu trước, kho kỷ niệm ở dưới. Tên lấy từ thư mục Drive, lớp là **12A1**; các mục chưa biết hiển thị “Chưa chia sẻ”. Có thể bổ sung tên thân thương, sinh nhật, vai trò, sở thích và lời nhắn. Kho cá nhân đọc cả album con, ban đầu dựng 24 ảnh/video, bấm xem thêm theo từng 24 mục. Ảnh đã giải mã được giữ lại khi thêm mục hoặc cập nhật nền.

Giới thiệu dùng chung lưu trong Script Properties, tách khỏi lịch sử và phiên upload; không ghi thông tin vào tên thư mục hoặc tệp ảnh. API kiểm tra thư mục trong kho lớp, giới hạn độ dài, chỉ lưu các trường cho phép và kiểm tra revision để tránh ghi đè cập nhật đồng thời. Theo mô hình web lớp hiện tại, người ghé kho có thể bổ sung giới thiệu mà không cần đăng nhập. Cache trình duyệt giúp hồ sơ hiện ngay, sau đó đọc lại bản dùng chung.

**Cần cập nhật `google-apps-script.gs` và tạo New version cho deployment hiện tại** để bật `profile`, `saveProfile`, `faceThumbnail`. Giữ nguyên URL `/exec`. Trước khi cập nhật, đọc kho và upload cũ vẫn hoạt động; nút bổ sung hồ sơ sẽ giải thích rằng cầu nối cần cập nhật.

## Kiểm tra

Xem các lệnh kiểm tra trong [README.md](README.md). Kiểm thử giao diện mặc định chạy với bộ file tĩnh trong `dist/` qua HTTPS mô phỏng; không cần server local. Các thao tác ghi dùng Drive mô phỏng, không tạo tệp thật.
