# SCRBLE MATH STUDIO

Sổ tay Toán học ngoại tuyến cho Windows, lấy cảm hứng bố cục từ ảnh Scrble Ink được cung cấp. Giao diện và tài sản tự thiết kế; không phải sản phẩm của Scrble, GeoGebra hay Casio.

## Mở ứng dụng

1. Giải nén **SCRBLE-MATH-STUDIO.zip** bằng “Extract All”.
2. Mở thư mục **SCRBLE-MATH-STUDIO** vừa giải nén.
3. Nhấp đúp **index.html**, chọn Chrome hoặc Microsoft Edge.

**Không cần Internet, Node.js, npm, Python, máy chủ, đăng nhập hoặc API key để sử dụng.** Không mở index.html ngay bên trong cửa sổ xem ZIP; cần giải nén toàn bộ thư mục để các tệp đi cùng được đọc đúng.

Tất cả script, CSS, icon và thư viện nằm trong thư mục sản phẩm. Không dùng ES module, fetch tài nguyên cục bộ, CDN, worker hay service worker. Font sử dụng Segoe UI/Arial/Consolas có sẵn trên Windows.

## Phạm vi chức năng đã triển khai

### Sổ tay và viết tay

- Vẽ bằng Pointer Events, pointer capture và các điểm lấy mẫu liên tiếp; nét quadratic; hỗ trợ dữ liệu áp lực bút. Bút bi, mực theo áp lực, chì, lông, highlight và laser tạm thời.
- Thay đổi màu, độ dày, độ trong suốt; lưu preset theo loại bút khi chuyển loại trong hộp thiết lập bút.
- Tẩy một phần **chia dữ liệu nét thành các đoạn còn lại**; tẩy cả nét và tẩy vùng chữ nhật. Tẩy chỉ tác động lớp nét bút, không phá ảnh/hình học bên dưới.
- Chọn nhiều đối tượng bằng Ctrl+A hoặc lasso; kéo di chuyển, đổi kích thước, xoay ±15°, thu/phóng, đổi màu/độ dày, sao chép/cắt/dán trong ứng dụng, nhóm/bỏ nhóm và khóa/mở khóa. Nhóm giữ tỷ lệ khi đổi kích thước.
- Undo/Redo dùng giao dịch dữ liệu cho cả nét bút, hình học, đồ thị, văn bản, kiểu nét và thao tác trang.
- Trang mới, nhân bản, đổi tên, xóa, di chuyển thứ tự bằng menu hoặc kéo thumbnail. Nhiều sổ tay, trường thư mục và tìm kiếm theo tiêu đề/thư mục trong thư viện.
- Giấy trắng, ô ly nhỏ/lớn, ngang, chấm, Oxy, tối. Khổ A4/A3/ngang/vùng rộng; vùng nhìn kéo tự do; zoom tại con trỏ. Viền đứt nét đánh dấu trang xuất.
- Đoạn thẳng, tia có mũi tên, mũi tên, nét đứt, tròn/elip, chữ nhật/vuông, tam giác, lục giác và đường Bézier; Shift khóa góc hoặc tỷ lệ.
- Smart Shape nhận dạng có ngưỡng cho nét thẳng, đường tròn và chữ nhật. Thước thẳng có vạch chia; đây là trợ giúp trực quan, không phải công cụ đo kích thước thực của màn hình.

### Graph Studio

- Nhiều công thức, màu riêng, bật/tắt, pan/zoom, đánh dấu điểm, tham số a/b/c/d/t và slider.
- Hàm đa thức, phân thức, căn, trị tuyệt đối, lượng giác, mũ/log và từng đoạn qua `điều_kiện ? biểu_thức_1 : biểu_thức_2`. Góc trong đồ thị dùng **radian**.
- Ví dụ: `y=x^3-3x`, `a*x^2+b*x+c`, `sin(x)`, `log(x)`, `x<0 ? -x : x`.
- Đường ẩn như `x^2+y^2=9`, `x^2/9+y^2/4=1`, `x^2-y^2=1` được vẽ bằng contour lấy mẫu.
- Lấy mẫu thích nghi cho hàm số; bỏ đoạn không hữu hạn hoặc có sai số giữa điểm quá lớn để tránh nối giả qua cực. Đã kiểm tra `1/(x-2)`.
- Tìm nghiệm đổi dấu/điểm mẫu, cực trị qua đổi dấu đạo hàm số, giao hai hàm, đạo hàm/tiếp tuyến tại x₀, tích phân Simpson thích nghi và bảng giá trị.
- Đồ thị chèn vào trang giữ công thức, màu, view, tham số, trục, điểm đánh dấu, tiếp tuyến và vùng tô. Nhấp đúp để sửa, nhấn **Cập nhật đồ thị** để áp dụng.

**Giới hạn tính toán số:** nghiệm bội chẵn có thể bị bỏ sót nếu không trùng điểm mẫu; kết quả không phải danh sách nghiệm đầy đủ được chứng minh. Khảo sát chỉ áp dụng cho `y=f(x)`, với biểu thức thứ nhất hoặc hai biểu thức đầu khi tìm giao. Tích phân phải trên miền liên tục; báo lỗi khi không hội tụ, không giải tích phân suy rộng. Sai số mục tiêu tích phân 10⁻⁸, có giới hạn số lần đánh giá. Contour có độ phân giải hữu hạn, có thể bỏ sót thành phần nhỏ. Chưa tự xác định/vẽ tiệm cận hay CAS đại số.

### Hình học

- 18 mẫu 2D gồm các loại tam giác, tứ giác, đa giác đều, đường tròn và các cấu hình trung tuyến/đường cao/phân giác/nội tiếp/ngoại tiếp/trọng tâm.
- Kéo đỉnh tam giác thường, sửa tọa độ, hiện tên/số đo; trung điểm, trung tuyến, đường cao và các tâm được tính lại theo định nghĩa. Có nối đỉnh, trung điểm, song song/vuông góc qua đỉnh.
- Tam giác đều/cân/vuông, vuông/chữ nhật có thao tác giữ ràng buộc cơ bản. Với hình bình hành/thoi/thang và đa giác đều, kéo nút đỉnh **tịnh tiến cả hình** để giữ mẫu; chưa có bộ giải ràng buộc tổng quát hoặc nhập độ dài/góc tùy ý.
- 13 mô hình không gian: lập phương, hộp chữ nhật, chóp đáy vuông, chóp SA vuông góc đáy, tứ diện đều, lăng trụ tam giác/lục giác, chóp cụt, trụ, nón, nón cụt, cầu và Oxyz.
- **Bộ dựng 3D bằng phần mềm**: đỉnh/mặt/cạnh là dữ liệu tọa độ thực 3 chiều, xoay bằng ma trận, chiếu trực giao lên Canvas 2D, xét hướng mặt và cạnh khuất. Không dùng hoạt ảnh CSS; không cần WebGL. Mặt tròn xoay dùng lưới đa diện xấp xỉ.
- Khối đang chọn: kéo bên trong để xoay; **Alt+kéo** hoặc kéo gần biên để di chuyển. Thay đổi a/b/h, mặt/cạnh/cạnh khuất, nhãn, màu và độ trong suốt. Live 3D hoặc hình chiếu tĩnh giữ góc nhìn. Cả hai chế độ đều giữ dữ liệu gốc trong JSON.
- Nối đỉnh, trung điểm và đường cao cho các khối chóp hỗ trợ; chọn mặt bằng danh sách, chọn hai đỉnh để đo khoảng cách. Diện tích mặt, toàn phần, thể tích và khoảng cách điểm–mặt phẳng tính theo tọa độ, không theo pixel. Panel vectơ hỗ trợ tích vô hướng/có hướng, góc và kiểm tra song song/vuông góc có dung sai.
- Ví dụ chóp SA ⊥ (ABCD), AB=4, SA=6 có V=32; lập phương a=3 có V=27, S=54.

Chưa có chọn cạnh/mặt bằng ray-casting trực tiếp, dựng thiết diện tùy ý, giao tuyến mặt phẳng, góc nhị diện, mặt phẳng qua ba điểm hoặc bộ dựng hình theo mọi giả thiết. Các công cụ này không được đưa ra dưới dạng nút giả. Mô hình tròn xoay chưa có chọn từng đỉnh phụ.

### Máy tính và công cụ toán

- Máy tính nổi kéo được, thu nhỏ, đổi kích thước và ghim; nhập bàn phím, lịch sử, Ans và các ô nhớ A–F/X/Y/M với STO/RCL.
- CALC: số học, ngoặc, lũy thừa, căn, giai thừa, C/P, gcd/lcm, log, lượng giác, hyperbolic và DEG/RAD. `sin(30)` ở DEG và `sin(pi/6)` ở RAD cho 0.5. `sin(30°)` nhận biết độ tường minh.
- **S⇔D** chuyển biểu diễn hữu tỉ chính xác và thập phân khi phép tính hữu tỉ được hỗ trợ; `1/2+1/3` trả `5/6`. Không gán nhãn “chính xác” cho căn vô tỉ hoặc kết quả lượng giác gần đúng. Phần trăm nhập dưới dạng `/100`; ký hiệu `%` là phép lấy dư.
- EQUATION: bậc 1–3 (có nghiệm phức) và hệ tuyến tính 2–3 ẩn, phân biệt vô nghiệm/vô số nghiệm. SOLVE có kiểm tra hội tụ. TABLE tối đa 201 dòng.
- MATRIX tối đa 4×4, VECTOR, COMPLEX bằng biểu thức có parser; STATISTICS tính trung bình/trung vị/phương sai tổng thể/độ lệch chuẩn/min/max và hồi quy tuyến tính.
- Chèn kết quả hoặc bảng vào trang, chuyển công thức sang Graph Studio. Lịch sử và bộ nhớ máy tính ở phiên hiện tại; muốn giữ lâu dài hãy chèn kết quả vào sổ tay.
- Công cụ toán chèn ký hiệu, phân số có gạch ngang, căn có nét phủ, ma trận/bảng, mẫu giới hạn/tích phân/tổng/vectơ/hệ phương trình và bảng biến thiên/xét dấu chỉnh tay. Nhấp đúp để sửa. LaTeX chỉ hỗ trợ một số ký hiệu thông dụng, `^2`, `^3`; không phải trình dàn trang LaTeX đầy đủ. Dùng mẫu Phân số thay vì `\frac`.

## Lưu, phục hồi và xuất

- Tự động lưu thư viện trong **localStorage** khi được phép, mặc định sau 1.2 giây. Thanh trạng thái báo thành công hoặc yêu cầu tải tệp thủ công. Sổ tay/trang/đối tượng giữ ID khi phục hồi cục bộ.
- **Ctrl+S** tải `.smath.json` gồm toàn bộ dữ liệu gốc; đây là bản sao lưu có thể chỉnh sửa. Menu có snapshot ghi ngày giờ và sao lưu toàn bộ thư viện.
- **Ctrl+O** nhập sổ tay hoặc bản sao lưu thư viện. Import tạo sổ tay mới, không ghi đè sổ đang mở. Kiểm tra phiên bản, kiểu đối tượng, tọa độ, tham chiếu đường phụ, ảnh và kích thước. Tệp lỗi bị từ chối trước khi thay đổi thư viện. Định dạng hiện tại **version 1**; các phiên bản khác bị từ chối rõ ràng, chưa có migration do chưa có phiên bản schema trước.
- Xuất PNG, SVG và PDF nhiều trang A4/A3; in qua trình duyệt. SVG giữ nét bút/hình học/văn bản dạng vector; đồ thị/ảnh được nhúng raster. PDF nhúng ảnh độ phân giải cao, chữ chưa phải văn bản tìm kiếm được.
- Xuất/in **chỉ nội dung trong ranh giới trang**. Chọn khổ phù hợp hoặc di chuyển/thu nhỏ đối tượng trước khi xuất; nội dung ngoài trang vẫn tồn tại trong JSON.
- Chèn ảnh PNG/JPEG/WebP tối đa 5 MB. Chưa nhập PDF; nếu cần ghi lên tài liệu PDF, xuất trang PDF thành ảnh bằng công cụ sẵn có rồi chèn ảnh.

### Những điều cần biết về `file://`

Lưu trữ của file cục bộ phụ thuộc trình duyệt, đường dẫn, cấu hình và quota. Chế độ riêng tư, chính sách công ty, xóa dữ liệu trình duyệt hoặc chuyển vị trí thư mục có thể làm bản tự lưu không còn truy cập được. **Không có cam kết lưu vĩnh viễn**; nên tải `.smath.json` sau buổi học và sao lưu tệp ra nơi khác.

Nếu lưu trữ bị chặn/hết dung lượng, ứng dụng vẫn dùng được và tải tệp thủ công vẫn hoạt động. Giới hạn chủ động 8 triệu ký tự cho thư viện lưu tự động và 16 MB cho tệp nhập; quota thực tế có thể nhỏ hơn. Tài liệu nhiều ảnh có thể chạm quota sớm. Không tự ghi tệp vào thư mục gốc; tải xuống qua trình duyệt không cần File System Access API.

Nếu dữ liệu tự lưu bị lỗi hoặc khác phiên bản, ứng dụng báo lỗi và giữ nguyên bản lưu đó, không tự ghi đè. Hãy mở bản sao `.smath.json` và tải bản mới để bảo toàn công việc. Không chỉnh tay localStorage nếu chưa sao lưu dữ liệu thô.

## Phím tắt

| Phím             | Chức năng                                     |
| ---------------- | --------------------------------------------- |
| Ctrl+N / O / S   | Tạo / mở / lưu tệp                            |
| Ctrl+Z / Y       | Undo / Redo                                   |
| Ctrl+C / X / V   | Sao chép / cắt / dán đối tượng trong ứng dụng |
| Ctrl+A / Delete  | Chọn tất cả / xóa đối tượng không khóa        |
| P / E / S        | Bút / tẩy / chọn                              |
| G / H / C / R    | Đồ thị / hình học / máy tính / thước          |
| Space + kéo      | Kéo vùng nhìn                                 |
| Ctrl + lăn chuột | Zoom tại con trỏ                              |
| Shift + vẽ hình  | Khóa góc hoặc tỷ lệ                           |
| Esc              | Hủy thao tác, bỏ chọn, đóng panel             |
| F11              | Toàn màn hình do trình duyệt quản lý          |

Phím tắt trang không chạy trong input/textarea/select/hộp thoại. Clipboard hiện là nội bộ ứng dụng, không trao đổi nét bút với clipboard Windows.

## Ví dụ đi kèm

Mở **examples/Toan-12.smath.json** qua Ctrl+O. Trang mẫu có đồ thị `x³−3x`, các điểm cực trị, hình chóp thật có thể xoay và ghi chú thể tích. Nội dung mẫu là đối tượng chỉnh sửa được, không phải ảnh chụp.

## Kiểm thử

Đã kiểm thử tự động trên **Windows, Google Chrome và Microsoft Edge**, mở bằng `file://` với mạng của browser context bị chặn. Không phát sinh HTTP/HTTPS trong các luồng đã kiểm tra. Xem [docs/TEST-REPORT.md](docs/TEST-REPORT.md) để biết chi tiết và phần chưa kiểm thử bằng phần cứng thật.

Chỉ nhà phát triển cần Node.js/npm nếu muốn chạy lại test:

```powershell
npm ci --ignore-scripts
npm test
npm run test:browser
npm run test:advanced
npm run package
```

Browser tests dùng Chrome/Edge đã cài, không chạy localhost. Các tệp minh chứng được tạo trong `test-results/`. Kiểm thử hoàn tất không đồng nghĩa đã hỗ trợ toàn bộ đặc tả mở rộng trong yêu cầu ban đầu; các giới hạn đã ghi ở từng phần trên.

## Cấu trúc

```text
index.html                 Điểm vào; dùng script cục bộ cổ điển
css/main.css               Giao diện, panel, giấy, máy tính, in
js/state.js                State, giao dịch, schema và localStorage
js/canvas.js               Pointer Events, vẽ, chọn, biến đổi, tẩy
js/renderer.js             Render trang, bút, hình học và lớp phủ
js/math-engine.js          Diễn giải AST với danh sách cú pháp cho phép
js/graph.js                Lấy mẫu, đồ thị, khảo sát và panel
js/geometry.js             Tọa độ, lưới 3D, phép chiếu và phép đo
js/calculator.js           Máy tính, bộ nhớ và các chế độ
js/panels.js               Thư viện, thuộc tính, giấy/lớp/công cụ toán
js/export.js               JSON, ảnh, SVG, PDF và in
js/app.js                  Giao diện, menu, phím tắt và khởi tạo
vendor/                    math.js, pdf-lib và giấy phép cục bộ
assets/                    Icon SVG tự thiết kế
examples/                  Sổ tay mẫu có thể chỉnh sửa
tests/                     Toán, schema và browser tests
scripts/                   Sinh ví dụ và đóng gói ZIP
docs/                      Báo cáo kiểm thử
```

Tách dữ liệu trang với trạng thái tương tác; mọi đối tượng có chung position/size/rotation/style/layer. Lịch sử lưu snapshot toàn sổ tay nên tài liệu lớn cần giảm giới hạn Undo. Nền giấy được cache riêng; đồ thị có cache raster; thao tác Canvas được gom qua requestAnimationFrame. Chưa có benchmark bảo đảm tốc độ cho tài liệu rất lớn hoặc thời gian sử dụng hàng giờ.

Biểu thức người dùng được parse bởi math.js và **diễn giải AST theo danh sách cho phép**, không dùng `eval()`/`new Function()`, không chạy HTML/JS từ tài liệu. Cú pháp, độ sâu, số node, giai thừa, số mũ, ma trận và vòng tính số được giới hạn. Dữ liệu học tập không gửi lên mạng.

Thư viện đóng gói: **math.js 15.1.0** (Apache-2.0), **pdf-lib 1.17.1** (MIT); giấy phép nằm trong `vendor/`. Playwright chỉ là dependency phát triển, không được tải khi mở ứng dụng.
