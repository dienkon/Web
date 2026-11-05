# Báo cáo kiểm thử · 05/11/2026

## Môi trường thực tế

- Windows; Google Chrome **156.0.8078.80**, Microsoft Edge **156.0.4314.58**.
- Playwright 1.56.1, chế độ headless; mở trực tiếp URL **file:///…/index.html**.
- Context được đặt `offline: true` trước khi mở ứng dụng, ghi lại mọi request HTTP/HTTPS và mọi `pageerror`.
- Độ phân giải kiểm tra: 1920×1080, 1600×1000, 1440×960, 1366×900, **1366×768**, 390×844.

## Kết quả đã chạy

| Bộ kiểm thử                         | Kết quả                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `npm test`                          | **42/42** nhóm đạt: 21 toán/dữ liệu, 10 dựng hình và 11 xét nét khuất            |
| `npm run test:browser`              | **34/34** kiểm tra đạt, 17 trên Chrome và 17 trên Edge                           |
| `npm run test:advanced`             | **14/14** nhóm kiểm tra đạt trên Chrome                                          |
| `npm run test:studio`               | **32/32** kiểm tra bản 1.1, 16 trên Chrome và 16 trên Edge                       |
| `npm run test:pen`                  | **34/34** kiểm tra bút/clipboard/3D, 17 trên Chrome và 17 trên Edge              |
| `node --check` tất cả tệp `js/*.js` | Không có lỗi cú pháp                                                             |
| Các luồng browser ở trên            | **0 lỗi JavaScript, 0 request HTTP/HTTPS**                                       |
| `node tests/package-smoke.cjs`      | Mở bản đóng gói offline trên Chrome/Edge; lưu tệp thủ công khi chặn localStorage |

Đây là số nhóm kiểm thử của các script, không phải lời xác nhận hoàn thành toàn bộ đặc tả mở rộng.

### Cập nhật 1.2 · clipboard, bút và nét khuất

- Dán PNG thật qua nút Dán ảnh; sự kiện Ctrl+V không bị preventDefault và sự kiện paste có ảnh chèn đúng một đối tượng. Ảnh chọn sẵn ở chế độ di chuyển.
- Gửi sự kiện bút tin cậy qua Chrome DevTools Protocol để kéo ảnh, kéo góc giữ tỷ lệ, nhập rộng=300 bằng bàn phím số trên màn hình, chọn nhiều bằng chạm, nhóm/bỏ nhóm và sao chép/dán đối tượng.
- API clipboard bị từ chối vẫn mở ô dán gốc; sự kiện paste ảnh vào ô này nhập được ảnh và đóng hộp thoại. **Clipboard được giả lập riêng trong context kiểm thử, không đọc/ghi clipboard Windows của người dùng.** Chưa kiểm chứng hộp xin quyền clipboard trên mọi cấu hình Windows.
- Nhập `x^2+1` và chèn công thức hoàn toàn bằng nút bút; nhập tên sổ tay “Toán” qua ABC và dấu tiếng Việt. Modal giữ nút xác nhận trong vùng có thể chạm khi bàn phím mở.
- Nút Xoay 3D làm đổi góc; nút Di chuyển chỉ đổi vị trí, không cần Alt. Nối A–C ở đáy lập phương lưu `lineMode:auto` và được xét khuất.
- Hình hộp ở góc mặc định có đúng ba cạnh khuất qua A; nhìn từ trên thấy mặt trên. Đường đi phía sau khối được tách thành liền/đứt/liền tại biên hình chiếu. Kết quả được đối chiếu với bộ giao tia–tam giác độc lập trên 8 loại đa diện × 18 góc × 7 điểm.
- Đảo thứ tự đỉnh mặt vẫn hướng pháp tuyến ra ngoài. Hệ trục không có mặt che nên cả ba trục luôn liền. Mặt cầu có một đỉnh mỗi cực, cạnh không suy biến, topology kín; giữ các chỉ số đỉnh trùng cũ làm điểm tham chiếu để sổ tay trước đây vẫn mở đúng tọa độ. Nón giữ tương thích các chỉ số đỉnh cũ và bỏ cạnh suy biến ở chóp.
- Hình cầu dùng đường bao tròn, xích đạo chia hai nửa trước/sau; đo pixel canvas xác nhận cung sau có khoảng trống nét đứt, cung trước liên tục. Trụ/nón/nón cụt chỉ có vòng đáy và hai đường sinh tiếp tuyến ở góc nhìn kiểm tra.
- Lặp dựng/render 100 trạng thái góc/khối không phát sinh lỗi. Luồng bút chạy offline trên Chrome/Edge, gồm Undo/Redo và tải tệp thật; không lỗi JavaScript, tài nguyên thất bại hoặc request HTTP/HTTPS.

Ảnh đã xem trực tiếp: [solid-workspace.png](solid-workspace.png), [pen-keyboard.png](pen-keyboard.png). Sự kiện bút trình duyệt không thay thế kiểm tra stylus/màn hình vật lý.

### Cập nhật 1.1 · hình học, PDF, công thức và header

- Đo chiều cao vùng header **104 px**; F8 giảm còn 40 px và trở lại được.
- Hình học mới có nét đen #111111, rộng 2.6 px, opacity nét 1; nền mặt trong suốt và khối 3D mặc định tĩnh.
- Nhấp chuột gần đỉnh để bắt điểm, dựng trung điểm rồi nối tới trung điểm đó. Điểm phụ thay đổi đúng khi sửa tọa độ và Undo giữ phép dựng.
- Kiểm tra hình chiếu đường vuông góc trong không gian, đường song song, góc 90°, khoảng cách đường chéo lập phương, đường tròn qua ba điểm.
- Thiết diện lập phương qua mặt phẳng đường chéo có 4 đỉnh và diện tích 16√2 khi a=4; qua 3 trung điểm cạnh qua A có 3 đỉnh và diện tích 2√3. Đổi a=8 cập nhật diện tích 8√3.
- Từ chối tham chiếu vòng/điểm chưa tồn tại và báo ba điểm thẳng hàng thay vì vẽ thiết diện giả.
- Công thức `f(x)=sqrt(x^2+1)/(x-2)` được nhận dạng thành TeX có căn/phân số, dựng SVG rồi sửa được thành tích phân. Chặn TeX chứa liên kết ngoài; lỗi cú pháp có thông báo.
- Nhập PDF 2 trang có font, chữ và đường vector, trong đó một trang nguồn có `/Rotate=90`. Mỗi trang thành một trang sổ tay, giữ đúng tỷ lệ và khóa nền để viết.
- PDF gốc chỉ nằm một lần trong assets; nét bút và công thức là đối tượng riêng. JSON roundtrip và reload offline giữ PDF gốc, hình/công thức, trang và ID.
- Xuất sổ tay 3 trang ra PDF; dùng PDF.js trích xuất lại được chữ **OFFLINE MATH LESSON 1** từ trang nguồn đã ghép chú thích. Như vậy nguồn không bị biến hoàn toàn thành ảnh. Đã render và xem trang xoay sau xuất để đối chiếu hướng.
- Trích xuất lớp văn bản PDF; từ chối tệp giả PDF, dải trang sai và đối tượng PDF thiếu nguồn mà không thay đổi nội dung hiện tại.
- Ảnh bản vẽ mặc định có pixel nền alpha=0, pixel nét RGBA=(17,17,17,255); giữ ảnh gốc và khôi phục màu được.
- Các luồng trên chạy trong `file://`, browser context offline: **không lỗi JavaScript, không request HTTP/HTTPS, không tài nguyên cục bộ tải thất bại**.

Ảnh xem trực tiếp: [teacher-workspace.png](teacher-workspace.png), [pdf-workspace.png](pdf-workspace.png).

### Toán học và dữ liệu

- Phân số **1/2+1/3=5/6**, 2¹⁰=1024, độ ưu tiên toán tử và nhân ngầm.
- DEG/RAD: sin(30)=0.5 ở DEG, cos(60)=0.5 ở DEG, sin(π/6)=0.5 ở RAD; độ tường minh 30°.
- **5!=120**, **C(5,2)=10**, hoán vị/GCD.
- Không gán biểu diễn hữu tỉ chính xác cho sqrt(2), lượng giác hoặc lũy thừa phân số.
- **x²−5x+6=0 có nghiệm 2,3**; bậc ba, nghiệm phức và phương trình suy biến.
- **det([[1,2],[3,4]])=−2**, nghịch đảo, norm/dot/cross và môđun phức.
- **x²−4 có nghiệm Ox −2 và 2**, đạo hàm số, Newton có hội tụ/không hội tụ.
- Tích phân đa thức và sin; đổi cận đổi dấu; từ chối tích phân có cực nằm lệch điểm lấy mẫu.
- Hàm tham số và hàm từng đoạn; không nhận cực của 1/(x−2) làm nghiệm.
- Cấm gán, truy cập thuộc tính, gọi hàm không trong whitelist, block/mã lệnh; giới hạn AST, số mũ và ma trận.
- **Lập phương a=3: V=27, S=54**; **chóp SA⊥đáy, AB=4, SA=6: V=32** và vuông góc theo tọa độ.
- Tất cả 13 mẫu khối có tọa độ/chiếu hữu hạn và phép đo dương; tất cả 18 mẫu phẳng có tọa độ và diện tích hợp lệ.
- Trung điểm, nội tiếp/diện tích tam giác tính theo tọa độ, cập nhật khi đổi đỉnh.
- Roundtrip JSON giữ loại đối tượng/dữ liệu/biến đổi; phục hồi localStorage giữ ID và ngày tạo.
- Từ chối phiên bản không hỗ trợ, tọa độ không hữu hạn, bảng lỗi và tham chiếu đường phụ lỗi.
- Undo/Redo kiểm tra dữ liệu vị trí và kiểu nét.

### Tương tác trên Chrome và Edge

- Vẽ nét bằng sự kiện chuột thực của trình duyệt, lưu hơn 20 mẫu liên tiếp.
- Đổi màu tạo nét có dữ liệu màu tương ứng.
- Tẩy một phần chia nét; Undo trả lại đúng ID/dữ liệu nét ban đầu và Redo chia lại.
- Ctrl+A, kéo nhiều đối tượng, nhóm và bỏ nhóm.
- Nhập công thức, khảo sát nghiệm, chèn đồ thị; nhấp đúp sửa công thức đã chèn.
- Kéo đỉnh tam giác trung tuyến, dữ liệu tọa độ thay đổi.
- Kéo xoay khối 3D làm thay đổi hai góc mô hình; đổi a=3 trả V=27, chèn trung điểm.
- Máy tính chuyển DEG/RAD, phân số chính xác và đưa kết quả vào trang.
- Tải `.smath.json`, nhập lại và so số đối tượng; reload khôi phục localStorage.
- Nhập phiên bản lỗi không thay đổi số sổ tay.
- PDF thật có header và được pdf-lib đọc lại đúng số trang; SVG chứa path vector.
- Các kích thước màn hình mục tiêu không làm tràn chiều rộng document.

### Các luồng nâng cao trên Chrome

- UI EQUATION: đa thức, hệ có nghiệm duy nhất/vô số nghiệm/vô nghiệm.
- SOLVE, TABLE, STATISTICS và hồi quy tuyến tính; MATRIX/VECTOR/COMPLEX thực thi biểu thức.
- Slider tham số giữ dữ liệu sau khi chèn; đồ thị ẩn đường tròn vượt qua kiểm tra schema.
- Bắt các lệnh lineTo của renderer để kiểm tra không có đoạn nối dốc qua x=2 ở 1/(x−2).
- Gửi sự kiện bút qua Chrome DevTools Protocol với áp lực 0.2/0.4/0.8; dữ liệu nét giữ mức áp lực khác nhau.
- Tẩy một phần nét đã xoay 30° và co giãn khác nhau theo hai trục; các đoạn còn lại giữ đúng góc, tỷ lệ và độ dày bút.
- Chèn phân số cấu trúc và bảng biến thiên có dữ liệu từng ô.
- Lưu phép dựng đường song song/vuông góc theo đỉnh; đường cao hình chóp, góc vectơ và chọn mặt.
- Khóa đối tượng rồi mở lại trong panel lớp.
- Nhập ảnh cục bộ, xuất PNG; PDF nhiều trang được đọc lại với đúng **2 trang**.
- Mở sổ tay mẫu, chụp ảnh và kiểm tra không có lỗi JS hoặc yêu cầu HTTP/HTTPS.

## Kiểm tra bằng mắt

Đã xem ảnh chụp trang trống, trang mẫu có đồ thị và chóp, cùng bố cục màn hình hẹp. Vùng giấy, thanh công cụ, thanh trang và đối tượng hiển thị đúng trên các ảnh đã xem. Ảnh minh họa [preview.png](preview.png) được chụp trực tiếp từ ứng dụng.

## Chưa được chứng nhận bằng các test trên

- Bút stylus/màn hình cảm ứng thật, palm rejection ở nhiều thiết bị, đa chạm và pinch trên phần cứng thật. Sự kiện áp lực mô phỏng không thay thế kiểm thử phần cứng.
- Chất lượng nét ở mọi tốc độ viết; phiên dùng nhiều giờ; hiệu năng tài liệu hàng chục nghìn nét; mọi góc nhìn của mọi mô hình.
- Hộp thoại máy in vật lý, fullscreen ở mọi cấu hình Windows và chính sách doanh nghiệp.
- Toàn bộ tổ hợp menu/hình dạng/Smart Shape và mọi công thức đầu vào có thể có. README nêu phạm vi triển khai; chỉ các kiểm tra được liệt kê ở báo cáo này được xác nhận đã chạy.
- Khả năng lưu vĩnh viễn, quota tùy trình duyệt hoặc phục hồi khi người dùng xóa dữ liệu. Tệp tải thủ công là phương án sao lưu chủ động.
- Chưa kiểm thử mọi biến thể PDF, tài liệu rất lớn, font hiếm hoặc phục hồi PDF hỏng; ICC/prepress chuyên nghiệp không được cam kết. PDF có mật khẩu cần mở khóa trước.
- CAS, OCR chữ viết tay/ảnh quét, giao tuyến/thiết diện ngoài phạm vi khối đa diện, sửa từng ký tự nguồn PDF, tiếng Anh và các tính năng chưa có trong README không được đánh dấu hoàn thành.

## Chạy lại

```powershell
npm ci --ignore-scripts
npm test
npm run test:browser
npm run test:advanced
npm run test:studio
npm run test:pen
```

Các script browser cần Chrome/Edge đã được cài đặt. Không cần chạy máy chủ. Ảnh và tệp kiểm chứng nằm trong `test-results/` sau khi chạy; không đóng gói chúng như nội dung học của người dùng.
