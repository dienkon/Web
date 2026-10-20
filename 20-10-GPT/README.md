# Vườn thương · 20/10

Website tĩnh HTML/CSS/JavaScript, chạy trực tiếp trên **GitHub Pages**, không cần npm, Node.js hay máy chủ riêng để sử dụng:

- [Mở khu vườn](https://dienkon.github.io/Web/20-10-GPT/)
- [Tạo thiệp và lưu ảnh/lời chúc](https://dienkon.github.io/Web/20-10-GPT/create.html)

Repo `dienkon/Web` đã cấu hình Pages từ `main`, thư mục `/`. Project nằm tại `20-10-GPT/`; push các file vào `main` sẽ kích hoạt Pages cập nhật. Tất cả đường dẫn ảnh, nhạc, script và iframe đều tương đối, tương thích đường dẫn con này. Firestore được gọi trực tiếp từ trình duyệt qua HTTPS; không phụ thuộc `server.mjs`.

## Tạo thiệp và ảnh base64

Trang `create.html` cho sửa tên, ảnh, ngày, các câu chữ trên trang và bên trong thiệp, màu khu vườn, cỡ chữ và chuyển động. Xem trước trực tiếp bằng chính `index.html` trong iframe; có chế độ máy tính/điện thoại, mở thiệp và phát lại hiệu ứng.

Bản nháp tự lưu trên thiết bị bằng localStorage, gồm ảnh tối ưu. Lưu thành công mới tạo link `index.html?gift=<id>`. Mỗi phiên bản là một document mới, không sửa đè thiệp đã gửi. Lỗi quyền, API chưa bật, mất mạng đều hiển thị trên form; không báo thành công khi Firestore thất bại.

Ảnh gốc tối đa 15 MB, nhận JPG/PNG/WebP. Trình duyệt resize cạnh dài tối đa 800px, chuyển JPEG với chất lượng giảm dần đến khi data URL không quá 650.000 ký tự. Lưu nguyên `data:image/jpeg;base64,...` trong trường `photoBase64` của document `greetings/<id>`, cùng nội dung, theme và version 2. Giới hạn request 800.000 byte để chừa khoảng trống dưới giới hạn document 1 MiB của Firestore. Metadata `createTime` do Firestore tạo.

Không dùng Firebase Storage hay Realtime Database. Khi mở link ở thiết bị khác, ảnh và chữ tải cùng nhau từ Firestore. Tải thất bại hiển thị thông báo và nút thử lại, không âm thầm hiện mẫu gốc. Ảnh không nằm trong URL.

## Thiết lập Firestore cho project đã cung cấp

Ngày 20/10/2026 đã kiểm tra trực tiếp trên GitHub Pages: tạo thiệp, lưu ảnh JPEG base64 và lời chúc vào Firestore thật, sau đó mở lại link và khôi phục ảnh/nội dung thành công. Các lỗi `SERVICE_DISABLED` và thiếu quyền xuất hiện ở giai đoạn thiết lập trước đã hết trong lần kiểm tra online này. Các bước dưới đây dùng khi cấu hình lại dự án:

1. Vào [Firebase Console → Firestore Database](https://console.firebase.google.com/project/loveletter-f0f23/firestore), tạo database **Cloud Firestore `(default)`**. `databaseURL` trong config là Realtime Database, không thay thế Firestore.
2. Nếu vẫn báo SERVICE_DISABLED, bật [Cloud Firestore API](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=loveletter-f0f23), chờ cấu hình có hiệu lực.
3. Trong tab Rules, ghép khối `/greetings/{giftId}` trong `firestore.rules` vào rules hiện tại rồi Publish. Giữ rules collection khác. Rules cung cấp cho phép tạo đúng schema, đọc theo ID, cấm liệt kê, sửa và xóa. Nếu có rule rộng cho phép toàn database, cần gỡ quyền rộng trùng phạm vi vì các quyền cho phép kết hợp bằng OR.
4. Trong Indexes → Single field, thêm exemptions cho collection group `greetings`, trường `photoBase64` và `message`, bỏ các loại index. Định nghĩa ở `firestore.indexes.json`; không cần composite index.

Luồng dùng Firestore REST và tạo/đọc công khai theo link, không cần đăng nhập hay quyền Admin. Mọi người có link đều đọc được thiệp; đây không phải kho ảnh riêng tư. Nếu cần giới hạn người tạo hoặc chống lạm dụng quy mô lớn, thêm Authentication/App Check với luồng cấp quyền tương ứng. Không tự thay đổi API, rules, billing hoặc quyền Firebase.

Link được tạo trên Pages sẽ có dạng `https://dienkon.github.io/Web/20-10-GPT/index.html?gift=<id>`, mở được trên thiết bị khác khi Firestore cho phép đọc. Hosting GitHub Pages và quyền Firestore là hai cấu hình độc lập; cần Publish rules để lưu/đọc thật.

## Hiệu ứng

Rèm mở đầu, hoa bung nở có chiều sâu, bướm vỗ cánh, tia sáng chuyển động, đom đóm, cánh hoa rơi và tung hoa khi mở thiệp. Ba bảng màu, chế độ êm dịu và `prefers-reduced-motion`. Nhạc chính là bài **Bật Tình Yêu Lên**, file người dùng cung cấp được sao chép vào `assets/bat-tinh-yeu-len.mp3`. Bấm nút nhạc để phát/tạm dừng, phát lại tiếp từ vị trí đang nghe và tự lặp khi hết bài; nhạc cũng có trong preview. Font Google Fonts có dự phòng khi mất mạng.

### Màn mở đầu bằng particle

Chuỗi canvas khoảng 11,4 giây: hạt sáng tụ thành hình hoa hồng (tọa độ và màu lấy từ ảnh PNG) → hòa thành ảnh hoa thật → các lớp hoa xếp chồng, xoay → hoa lan từ tâm, phủ kín màn hình → cả thảm hoa rơi xuống, để lộ trang chúc mừng và khởi động lại hiệu ứng hoa cũ.

Có sáu loại hoa, bổ sung `assets/rose.png`, `assets/peony.png`, `assets/chrysanthemum.png` do Imagegen tích hợp tạo riêng. Prompt ở `assets/entrance-prompts.json`. Canvas dùng ảnh thu nhỏ dùng chung, giới hạn DPR 1,5, giảm số hạt trên điện thoại, giải phóng hạt và vòng requestAnimationFrame sau khi xong. Đổi kích thước màn hình vẫn tiếp tục cảnh; chuyển tab sẽ tạm ngừng timeline.

Nút “Bỏ qua mở đầu” hoặc Escape đưa thẳng đến trang. “Ngắm hoa nở lại” chạy lại cả chuỗi. Chế độ êm dịu dùng chuyển ảnh ngắn, còn `prefers-reduced-motion` bỏ qua chuỗi. Trang tạo thiệp hiển thị preview ngay; nút phát lại trong preview cho xem đầy đủ màn mở đầu. Với link Firestore, chuỗi chỉ bắt đầu khi đã tải đúng dữ liệu thiệp.

## Ảnh riêng

`assets/daisy.png`, `assets/cosmos.png`, `assets/hibiscus.png`: ba bông hoa được tạo riêng bằng công cụ Imagegen tích hợp. Prompt đầy đủ được lưu trong `assets/prompts.json`.

Không sử dụng Antigravity, không cần cài package. Nhạc và ảnh được lưu cùng mã nguồn để phục vụ trực tiếp trên GitHub Pages.

## Kiểm tra

Các lệnh sau chỉ dành cho phát triển trên máy, không cần khi dùng bản Pages: `npm run check` kiểm tra cú pháp; `npm run dev` chạy máy chủ local; `npm test` dùng Chrome có sẵn trên Windows kiểm tra trang tạo thiệp, preview, lưu/đọc qua mock Firestore, base64, lỗi lưu/tải, bố cục và giảm chuyển động. Mock không ghi dữ liệu giả lên Firebase thật và không chứng minh quyền Firebase đã hoạt động. Ảnh kiểm tra ở `output/`, không đưa lên GitHub.

Tài liệu: [Firestore REST](https://firebase.google.com/docs/firestore/use-rest-api), [giới hạn document](https://firebase.google.com/docs/firestore/quotas), [Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure).
