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

## Chạy tại máy

Trên Windows, nhấp đúp **`start-local.cmd`** trong thư mục dự án. File tự chuyển đến đúng thư mục, chạy Python và mở trang `http://localhost:8080/` trong trình duyệt. Giữ cửa sổ server đang mở trong lúc sử dụng. Nếu cổng đó đã có ứng dụng khác, launcher chọn một cổng trống và mở đúng địa chỉ mới.

Không mở `index.html` trực tiếp bằng `file://`: trình duyệt chặn `fetch()` đọc các manifest/weights, nên nhận diện khuôn mặt không thể khởi động. Trang sẽ hiện hướng dẫn và chặn việc tải mô hình trong chế độ này. Không cần thay đổi cài đặt CORS của trình duyệt.

Hoặc chạy lệnh sau để tự mở trình duyệt:

```powershell
python server.py --open
```

Để chỉ chạy server:

```powershell
python server.py
```

Mở [localhost:8080](http://localhost:8080). Nếu Python thiếu chứng chỉ HTTPS, cài `certifi` (`python -m pip install certifi`). Không tắt xác minh TLS.

Máy chủ này đọc trực tiếp danh sách công khai từ Drive ngay cả khi chưa kết nối Apps Script. Đọc thư mục riêng tư, tải lên, tạo thư mục và lịch sử cần cầu nối đã triển khai. Khi host chỉ phục vụ file tĩnh, phải điền `appsScriptUrl` để đọc Drive; không có fallback sang danh sách đóng gói.

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

## Hồ sơ người nhà

Bấm thành viên để hiện giới thiệu trước, kho kỷ niệm ở dưới. Tên lấy từ thư mục Drive, lớp là **12A1**; các mục chưa biết hiển thị “Chưa chia sẻ”. Có thể bổ sung tên thân thương, sinh nhật, vai trò, sở thích và lời nhắn. Kho cá nhân đọc cả album con, ban đầu dựng 24 ảnh/video, bấm xem thêm theo từng 24 mục. Ảnh đã giải mã được giữ lại khi thêm mục hoặc cập nhật nền.

Giới thiệu dùng chung lưu trong Script Properties, tách khỏi lịch sử và phiên upload; không ghi thông tin vào tên thư mục hoặc tệp ảnh. API kiểm tra thư mục trong kho lớp, giới hạn độ dài, chỉ lưu các trường cho phép và kiểm tra revision để tránh ghi đè cập nhật đồng thời. Theo mô hình web lớp hiện tại, người ghé kho có thể bổ sung giới thiệu mà không cần đăng nhập. Cache trình duyệt giúp hồ sơ hiện ngay, sau đó đọc lại bản dùng chung.

**Cần cập nhật `google-apps-script.gs` và tạo New version cho deployment hiện tại** để bật `profile`, `saveProfile`, `faceThumbnail`. Giữ nguyên URL `/exec`. Trước khi cập nhật, đọc kho và upload cũ vẫn hoạt động; nút bổ sung hồ sơ sẽ giải thích rằng cầu nối cần cập nhật.

## Tìm khuôn mặt trong toàn kho lớp

1. Chọn/kéo ảnh mẫu vào **Mình ở đâu trong những tấm ảnh?**. Nếu có nhiều khuôn mặt, chọn đúng người trong các ảnh cắt ra.
2. Chọn mức Chặt chẽ / Cân bằng / Mở rộng rồi bấm **Tìm trong toàn kho**. Chỉ duyệt thư mục gốc được cấu hình và toàn bộ thư mục con mà kết nối hiện tại đọc được, không tìm trong Drive riêng ngoài kho lớp.
3. Lần đầu lập chỉ mục bằng [face-api.js](https://github.com/justadudewhohacks/face-api.js): Tiny Face Detector + tiny landmarks 68 điểm + descriptor 128 chiều, so khoảng cách Euclid, xếp gợi ý gần nhất trước. Ba mức dùng ngưỡng 0.45 / 0.50 / 0.58; đây không phải xác suất đúng danh tính.
4. Lần sau dùng chỉ mục IndexedDB trên thiết bị, không tải lại ảnh đã lập chỉ mục. Khóa gồm phiên bản mô hình, kho/cầu nối, ID tệp và thời gian sửa; tệp mới/sửa được xử lý lại, chỉ mục của tệp bị xóa được dọn. Ảnh không đọc được không bị đánh dấu thành công và sẽ thử lại lần sau.

Mã và weights được đóng gói tại `assets/face/`, tải trễ khi chọn ảnh mẫu, không ảnh hưởng lần mở trang. Ảnh mẫu và descriptors không gửi lên server. Ảnh kho được đọc qua thumbnail 960px; khi CORS chặn, cầu nối mới xác minh tệp thuộc kho lớp rồi trả ảnh xem trước, không lộ OAuth token. Mỗi lượt chỉ xử lý một ảnh, giải phóng canvas sau lượt; nhường thời gian cho giao diện và upload, tạm nghỉ khi tab bị ẩn, có nút Dừng và Xóa chỉ mục máy này. Trình duyệt không hỗ trợ/chặn IndexedDB sẽ dùng RAM trong lần mở trang, có thông báo khi không lưu được chỉ mục.

Tiến độ phân biệt tệp đã xét, tệp chưa đọc được và mục dùng lại chỉ mục; lỗi đọc thư mục báo rằng danh sách chưa đầy đủ. Kết quả chỉ là gợi ý tương đồng, không tự xác định tên hay cập nhật hồ sơ. Video **chỉ tìm qua ảnh bìa**, chưa phân tích các khung hình bên trong. Ảnh nhóm có mặt quá nhỏ, thiếu sáng, nghiêng hoặc bị che có thể bỏ sót; lần đầu chưa thể tìm tức thì trên một kho lớn.

Đổi kết nối Drive khi đang tìm sẽ hủy kết quả của lượt cũ. Lưu ý cache khuôn mặt nằm riêng trên từng trình duyệt/thiết bị; xóa dữ liệu trang hoặc bấm Xóa chỉ mục sẽ phải lập lại.

## Kiểm tra

```powershell
node --test tests/drive.test.cjs
python -m unittest discover -s tests -p "test_*.py"
```

Sau khi triển khai cầu nối thật, thử tải một ảnh, một video, một tệp bất kỳ và tạo thư mục; mở trình duyệt khác để kiểm tra kho và lịch sử. Các bài kiểm tra tự động dùng Drive mô phỏng, không tạo tệp vào kho thật.

`node tests/file-mode-ui.cjs` kiểm tra mở trực tiếp bằng `file://`: hiện hướng dẫn chạy localhost, khóa chọn ảnh và chặn cả kéo thả trước khi có request tải mô hình.

Kiểm thử giao diện tùy chọn: cài `playwright`, chạy `python server.py` rồi `node tests/drive-ui.cjs`. Có thể đặt biến môi trường `PLAYWRIGHT_MODULE` trỏ tới package Playwright đã cài ở máy. Bài kiểm tra mô phỏng phân trang, mất phản hồi khi tải, tệp rỗng, chuyển thư mục giữa lúc tải, lịch sử dùng chung, xóa/đổi tên trên Drive và bố cục điện thoại.

`node tests/memories-ui.cjs` kiểm tra hồ sơ, album con, phân trang, lưu giới thiệu và xử lý chuỗi HTML. Để kiểm tra mô hình nhận diện thật, đặt `FACE_FIXTURE` là đường dẫn tới ảnh JPG có mặt rõ rồi chạy bài đó. Bài kiểm tra dùng weights thật trên trình duyệt, mô phỏng dữ liệu Drive, kiểm tra tải mô hình trễ, chọn mặt, kết quả tương đồng, tái sử dụng IndexedDB sau reload, lập lại chỉ mục khi sửa tệp và giải phóng tensors. Mẫu thử có thể lấy từ [ảnh ví dụ upstream](https://raw.githubusercontent.com/justadudewhohacks/face-api.js/8609b25a15f417398a4d2b95dc91985cd1e0c0c3/examples/images/bbt1.jpg), không ghi ảnh thành viên thật vào Git.
