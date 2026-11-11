# Google Drive trực tiếp

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

```powershell
python server.py
```

Mở [localhost:8080](http://localhost:8080). Nếu Python thiếu chứng chỉ HTTPS, cài `certifi` (`python -m pip install certifi`). Không tắt xác minh TLS.

Máy chủ này đọc trực tiếp danh sách công khai từ Drive ngay cả khi chưa kết nối Apps Script. Đọc thư mục riêng tư, tải lên, tạo thư mục và lịch sử cần cầu nối đã triển khai. Khi host chỉ phục vụ file tĩnh, phải điền `appsScriptUrl` để đọc Drive; không có fallback sang danh sách đóng gói.

## Tải tệp và lịch sử

- Chọn thư mục trong Kho Drive, bấm **Tải tệp lên thư mục này**, hoặc kéo thả nhiều tệp. Tệp trong hàng đợi giữ nguyên thư mục đích lúc được chọn, kể cả khi chuyển sang thư mục khác.
- Không có danh sách chặn loại tệp, không nén ảnh/video và không đặt giới hạn tổng dung lượng tệp trên web. Tệp bất kỳ được hiển thị dưới dạng tài liệu, mở bằng Drive Preview hoặc tải xuống.
- Truyền từng phần 8 MiB theo giao thức resumable của Drive; chỉ đọc một phần tệp vào bộ nhớ. Đây là kích thước mỗi request, không phải kích thước tối đa của tệp.
- Khi mất mạng hoặc dừng, bấm **Tiếp tục tải**. Nếu đã đóng trang, chọn lại đúng tệp (tên, dung lượng, thời gian sửa và thư mục đích giống nhau) để tiếp tục phiên cũ. Phiên Drive hết hạn sau khoảng một tuần; khi đó cần tải lại từ đầu.
- **Tạo thư mục** tạo trong thư mục đang xem và thừa hưởng quyền từ thư mục cha. Cầu nối chỉ được đọc/ghi trong thư mục gốc cấu hình và các thư mục con; không có endpoint sửa/xóa tệp sẵn có.
- Tab **Lịch sử tải lên** đọc lịch sử dùng chung theo trang 50 thao tác, gồm tải lên/tạo thư mục, thời điểm, thư mục đích, dung lượng và trạng thái. Lịch sử ghi thao tác qua web; các thay đổi làm trực tiếp trong ứng dụng Drive được phản ánh trong kho, không ghi thành thao tác tải lên của web.
- Dung lượng lưu trữ, kích thước tệp, thời hạn phiên, hạn mức Google Drive/Apps Script/Sheets và chính sách tài khoản Google vẫn áp dụng. Lỗi từ Google được hiển thị để người dùng biết và tiếp tục sau.

Tài liệu: [Drive resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Kiểm tra

```powershell
node --test tests/drive.test.cjs
python -m unittest discover -s tests -p "test_*.py"
```

Sau khi triển khai cầu nối thật, thử tải một ảnh, một video, một tệp bất kỳ và tạo thư mục; mở trình duyệt khác để kiểm tra kho và lịch sử. Các bài kiểm tra tự động dùng Drive mô phỏng, không tạo tệp vào kho thật.

Kiểm thử giao diện tùy chọn: cài `playwright`, chạy `python server.py` rồi `node tests/drive-ui.cjs`. Có thể đặt biến môi trường `PLAYWRIGHT_MODULE` trỏ tới package Playwright đã cài ở máy. Bài kiểm tra mô phỏng phân trang, mất phản hồi khi tải, tệp rỗng, chuyển thư mục giữa lúc tải, lịch sử dùng chung, xóa/đổi tên trên Drive và bố cục điện thoại.
