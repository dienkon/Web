# SCRBLE MATH STUDIO · 1.4

Sổ tay Toán học ngoại tuyến cho Windows, lấy cảm hứng bố cục từ ảnh Scrble Ink được cung cấp. Giao diện và tài sản tự thiết kế; không phải sản phẩm của Scrble, GeoGebra hay Casio.

## Mở ứng dụng

1. Giải nén **SCRBLE-MATH-STUDIO.zip** bằng “Extract All”.
2. Mở thư mục **SCRBLE-MATH-STUDIO** vừa giải nén.
3. Nhấp đúp **index.html**, chọn Chrome hoặc Microsoft Edge.

**Không cần Internet, Node.js, npm, Python, máy chủ, đăng nhập hoặc API key để sử dụng.** Không mở index.html ngay bên trong cửa sổ xem ZIP; cần giải nén toàn bộ thư mục để các tệp đi cùng được đọc đúng.

Tất cả script, CSS, icon và thư viện nằm trong thư mục sản phẩm. Bản chạy dùng script cổ điển, không cần ES module từ file://, CDN, service worker hoặc tải font mạng. PDF.js được bundle cùng phần xử lý worker để chạy trên luồng chính, nhận font/CMap/decoder từ dữ liệu nhúng; không tạo worker từ đường dẫn file://. Công thức dùng SVG glyph có sẵn, không tải font ngoài.

## Điểm mới 1.4 · giao điểm, trọng tâm và trang nối liền

- **Giao điểm hai đường:** chọn hình → **Dựng & đo → Giao điểm** rồi chạm hai cạnh/đường đã dựng. Có tô sáng đường đang chọn. Dùng danh sách **Điểm, đường & phép dựng** trong thuộc tính nếu đường chồng nhau. Hỗ trợ đường nối, đường chéo, đường song song/vuông góc, trung tuyến và cạnh thiết diện trong cùng hình; giao của đường thẳng kéo dài cũng được tính.
- **Trọng tâm và nối tới G:** chọn **Trọng tâm**, chạm ba đỉnh của tam giác cần xét. G và ba trung tuyến cập nhật theo đỉnh. Dùng **Nối điểm** để nối bất kỳ đỉnh/điểm phụ tới G. Có thêm **Trung tuyến** (chọn đỉnh xuất phát trước) và **Phân giác** (đỉnh góc là điểm thứ hai).
- Giao điểm, trung điểm, trọng tâm và chân đường phụ đều là dữ liệu phụ thuộc, dùng tiếp để nối hoặc dựng hình và giữ khi lưu/mở. Đường song song/trùng nhau hoặc hai đường chéo nhau trong không gian có thông báo, không tạo giao điểm giả từ hình chiếu. Công cụ giao điểm hiện áp dụng cho đường thẳng trong hình đang chọn, chưa tính giao với đường tròn hoặc nét viết tự do.
- **Thanh dựng hình gọn:** chỉ giữ Nối điểm, Trung điểm, Trọng tâm, Dựng & đo, Xoay 3D khi phù hợp và Xong. Các công cụ khác nằm trong menu; danh sách quản lý phép dựng trong thuộc tính có thể thu gọn.
- **Mọi trang nối sát nhau:** sổ tay thường và PDF cùng cuộn liên tục. Khi kéo/bánh xe/thanh cuộn xuống gần cuối, ứng dụng tự nối thêm trang trắng cùng khổ và kiểu giấy. Không tạo trang chỉ vì render, phóng to/thu nhỏ hoặc mở toàn màn hình. Có thể tắt **Cuộn tới cuối tự thêm trang** trong thanh bút **⋯**; tùy chọn được nhớ. Giới hạn 300 trang/sổ tay.
- **Viết xuyên trang:** một nét bút đi qua ranh giới giữ tọa độ, áp lực và được lưu đúng từng trang. Undo/Redo xử lý cả lần viết, kể cả trang vừa tạo khi viết xuống cuối. Kéo ảnh/hình sang trang kế chuyển đối tượng sang trang đó, giữ ID và dữ liệu chỉnh sửa.
- **Toàn màn hình trên header:** nút **⛶** luôn có trên thanh công cụ, chạm lại để thoát; trạng thái và nhãn nút cập nhật khi trình duyệt thoát toàn màn hình.

## Các tính năng từ 1.3 · ảnh gốc, góc nhìn chuẩn và PDF

- **Ảnh gốc mặc định:** Ctrl+V, Dán ảnh và Chọn ảnh đều giữ nguyên dữ liệu màu, nền, alpha và độ phân giải của tệp. Đổi kích thước trên trang không làm mất bản gốc. Nhấp đúp ảnh nếu muốn chủ động áp dụng nét đen / nền trong suốt.
- **Bỏ thanh tiêu đề và footer:** phần công cụ còn 79 px; bỏ chế độ F8. Trạng thái lưu nằm dưới tên sổ tay, số trang và nút trước/sau nằm trong cụm điều hướng nhỏ trên vùng giấy. Hướng dẫn nằm trong menu; toàn màn hình có nút trên thanh công cụ.
- **Góc hình học kiểu sách giáo khoa:** hình hộp, lập phương, chóp và lăng trụ chèn mới có cạnh đáy nằm ngang, cạnh đứng thẳng và chiều sâu xiên. Nét khuất xét theo đúng phép chiếu. Chọn **Xoay 3D** để chuyển sang góc nhìn xoay tự do; **Góc nhìn gốc / Góc chuẩn** trở về kiểu sách giáo khoa. Dữ liệu tọa độ và số đo vẫn giữ nguyên.
- **Cuộn PDF nối tiếp:** dùng bánh xe, công cụ **Kéo trang**, thanh cuộn bên phải hoặc nút trang trước/sau. Hai trang ở ranh giới có thể cùng hiện; chạm viết lên trang nào thì nét được lưu vào trang đó.
- **Độ nét PDF theo vùng đang xem:** lấy chi tiết từ PDF gốc theo zoom và mật độ điểm ảnh màn hình. Chỉ dựng những vùng đang nhìn, có bộ nhớ đệm và hủy phần tải đã rời màn hình. PDF ảnh quét vẫn phụ thuộc độ nét nguồn. Tài liệu tối đa 40 MB; nhập dải trang trong giới hạn 300 trang của sổ tay, không còn giới hạn 30 trang/lần.

## Các tiện ích bút từ 1.2

- **Ctrl+V / Dán ảnh:** dán ảnh chụp từ clipboard Windows bằng Ctrl+V hoặc nút **Dán ảnh** trên thanh công cụ/thanh bút. Ảnh giữ nguyên bản gốc, được chọn sẵn và chuyển về chế độ di chuyển.
- **Kéo, đổi kích thước:** bốn nút góc lớn giữ tỷ lệ; có nút xoay 2D. Chọn **Kích thước** để nhập rộng/cao/X/Y, tăng giảm 10%, xoay 15° hoặc đưa hình vào giữa vùng nhìn. Tùy chọn giữ tỷ lệ cho phép đổi kích thước tự do bằng bút.
- **Nét khuất 3D:** xét che khuất theo tọa độ và góc nhìn hiện tại. Khối hộp ở góc nhìn mặc định có đúng ba cạnh khuất gặp nhau tại đỉnh sau. Đường nối, đường chéo, đường cao và thiết diện tự chia nét liền/nét đứt; có thể chọn thủ công **Tự động / Liền / Đứt** khi dựng.
- **Hình cầu mới:** đường bao tròn sạch, xích đạo liền phía trước/đứt phía sau, tâm O và bán kính r; bật thêm kinh tuyến khi cần. Trụ/nón/nón cụt dùng đường tròn đáy và đường sinh tiếp tuyến, bỏ lưới cạnh rối.
- **Thanh bút kéo được:** bút, tẩy, chọn, kéo trang, lasso, dán ảnh, bàn phím và tùy chọn. Chạm **⋯** để chọn nhiều bằng từng lần chạm, chọn tất cả, sao chép/dán/xóa, giữ tỷ lệ, bắt tọa độ/góc và bỏ chọn. Kéo dấu **⋮** để di chuyển thanh; chạm để thu gọn.
- **Bàn phím trên màn hình:** tự mở khi dùng bút chạm ô nhập; nút **⌨** mở thủ công, kể cả trong hộp thoại. Có Toán, số, ABC, ký tự LaTeX và tiếng Việt; dấu thanh áp vào nguyên âm gần nhất trước con trỏ. Có chọn hết, xóa, di chuyển con trỏ, ô tiếp và Enter. Các trường số có thể nhập số âm/thập phân mà không cần phím vật lý.
- **Di chuyển / Xoay 3D riêng:** các nút trên thanh chọn cho phép chuyển rõ ràng giữa kéo hình và xoay khối, không cần giữ Alt. Nút menu trang luôn hiện khi dùng bút; lưu, Undo/Redo, mở tệp và xuất đều có nút trên giao diện.

**Clipboard cục bộ:** quyền đọc clipboard phụ thuộc trình duyệt/chính sách Windows. Nếu nút Dán ảnh bị chặn, hộp thoại có ô chạm giữ → **Dán** và nút **Chọn ảnh trong máy**. Ctrl+V vẫn dùng sự kiện dán gốc của trình duyệt. Sao chép đối tượng trong ứng dụng dùng dữ liệu nội bộ của phiên; không xuất nét bút thành ảnh vào clipboard hệ điều hành.

## Các tính năng từ 1.1 · dành cho giáo viên

- **Header gọn:** bản hiện tại giữ hai hàng công cụ cao tổng cộng 79 px, không có thanh tiêu đề hoặc footer.
- **Nét đen, rõ, nền trong:** hình học mới dùng nét đen 2.6 px, độ đục nét 100%, bỏ màu tô mặt. Hình 3D chèn mặc định là hình chiếu tĩnh để không xoay ngoài ý muốn; chọn **Xoay 3D** khi muốn chỉnh góc nhìn. Có thể bật Live 3D trong thuộc tính.
- **Bắt điểm thông minh:** chọn hình rồi dùng thanh nổi Nối điểm / Trung điểm / Đo cạnh / Vuông góc / Song song / Đo góc. Con trỏ bắt vào đỉnh, trung điểm và điểm phụ; nối tới trung điểm cũng giữ đúng định nghĩa khi kéo đỉnh. Shift khi kéo đỉnh 2D bắt tọa độ theo bước 0.5.
- **Thiết diện thật:** với khối đa diện, chọn Thiết diện rồi chọn 3 điểm không thẳng hàng, kể cả trung điểm mới dựng. Thuật toán cắt cạnh khối bằng mặt phẳng và sắp xếp đa giác; diện tích theo tọa độ, cập nhật khi đổi a/b/h. Có nút tô nhẹ thiết diện và các góc nhìn chuẩn.
- **PDF từ máy:** nhấn Tài liệu PDF → Chọn PDF, hoặc thả tệp vào vùng viết; chọn dải trang, rồi viết/highlight/chèn hình và công thức trên lớp riêng. Giữ bản PDF gốc để zoom, xuất lại và tải nguồn. Khi xuất PDF, các trang PDF nguồn giữ nội dung vector và lớp chữ, chú thích được ghép phía trên theo thứ tự lớp.
- **Công thức đẹp:** nhấn Công thức hoặc gõ một biểu thức vào công cụ văn bản. Ví dụ `f(x)=sqrt(x^2+1)/(x-2)` được nhận dạng và dàn thành căn/phân số thật, có xem trước. Hỗ trợ LaTeX như `\frac`, `\int`, `\begin{cases}`, ma trận. Nhấp đúp để sửa; công thức lưu nguồn và dựng SVG khi hiển thị.
- **Ảnh bản vẽ:** mặc định giữ nguyên ảnh gốc; nhấp đúp để chọn tách nền trắng, chuyển nét thành đen và làm đậm. Có thể khôi phục ảnh gốc sau khi xử lý.
- PDF, ảnh, đồ thị và công thức mặc định giữ tỷ lệ khi kéo đổi kích thước để tránh méo chữ/hình. Giữ Alt trong lúc kéo nút đổi kích thước nếu cần biến đổi tự do.

**Cách dùng nhanh:** chọn tam giác → Trung điểm → nhấp B, C → Nối điểm → nhấp A, M. Với lập phương, dựng 3 trung điểm cạnh qua A rồi chọn Thiết diện và nhấp 3 trung điểm. Điểm bị chồng khi chiếu có thể chọn từ danh sách trong panel.

**Phạm vi rõ ràng:** nhận dạng công thức hiện áp dụng cho biểu thức gõ/LaTeX và văn bản trích xuất từ PDF; chưa có OCR chữ viết tay hoặc PDF ảnh quét. PDF được chỉnh qua chú thích/lớp phủ, chưa sửa trực tiếp từng ký tự nguồn. Thiết diện hiện hỗ trợ khối đa diện của thư viện, không áp dụng cho mặt tròn xoay hoặc giao tuyến tổng quát.

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
- **Bộ dựng 3D bằng phần mềm**: đỉnh/mặt/cạnh là dữ liệu tọa độ thực 3 chiều, xoay bằng ma trận, chiếu xiên kiểu sách giáo khoa hoặc trực giao lên Canvas 2D, xét che khuất bằng tia nhìn và mặt khối. Không cần WebGL. Mặt tròn xoay có lưới xấp xỉ cho dữ liệu mặt; nét vẽ dùng đường bao, cung và đường sinh tính riêng.
- Khối mới mặc định tĩnh. Chọn **Xoay 3D** trên thanh nổi để kéo chỉnh góc nhìn, hoặc bật Live 3D để kéo bên trong xoay trực tiếp; **Alt+kéo** hoặc kéo gần biên để di chuyển. Thay đổi a/b/h, mặt/cạnh/cạnh khuất, nhãn, màu và độ trong suốt. Live 3D hoặc hình chiếu tĩnh giữ góc nhìn. Cả hai chế độ đều giữ dữ liệu gốc trong JSON.
- Nối đỉnh, trung điểm và đường cao cho các khối chóp hỗ trợ; chọn mặt bằng danh sách, chọn hai đỉnh để đo khoảng cách. Diện tích mặt, toàn phần, thể tích và khoảng cách điểm–mặt phẳng tính theo tọa độ, không theo pixel. Panel vectơ hỗ trợ tích vô hướng/có hướng, góc và kiểm tra song song/vuông góc có dung sai.
- Ví dụ chóp SA ⊥ (ABCD), AB=4, SA=6 có V=32; lập phương a=3 có V=27, S=54.

Chưa có chọn cạnh/mặt bằng ray-casting trực tiếp, mặt phẳng tự do ngoài khối, giao tuyến hai mặt phẳng, góc nhị diện hoặc bộ dựng hình theo mọi giả thiết. Các công cụ này không được đưa ra dưới dạng nút giả. Mô hình tròn xoay chưa có chọn từng đỉnh phụ.

### Máy tính và công cụ toán

- Máy tính nổi kéo được, thu nhỏ, đổi kích thước và ghim; nhập bàn phím, lịch sử, Ans và các ô nhớ A–F/X/Y/M với STO/RCL.
- CALC: số học, ngoặc, lũy thừa, căn, giai thừa, C/P, gcd/lcm, log, lượng giác, hyperbolic và DEG/RAD. `sin(30)` ở DEG và `sin(pi/6)` ở RAD cho 0.5. `sin(30°)` nhận biết độ tường minh.
- **S⇔D** chuyển biểu diễn hữu tỉ chính xác và thập phân khi phép tính hữu tỉ được hỗ trợ; `1/2+1/3` trả `5/6`. Không gán nhãn “chính xác” cho căn vô tỉ hoặc kết quả lượng giác gần đúng. Phần trăm nhập dưới dạng `/100`; ký hiệu `%` là phép lấy dư.
- EQUATION: bậc 1–3 (có nghiệm phức) và hệ tuyến tính 2–3 ẩn, phân biệt vô nghiệm/vô số nghiệm. SOLVE có kiểm tra hội tụ. TABLE tối đa 201 dòng.
- MATRIX tối đa 4×4, VECTOR, COMPLEX bằng biểu thức có parser; STATISTICS tính trung bình/trung vị/phương sai tổng thể/độ lệch chuẩn/min/max và hồi quy tuyến tính.
- Chèn kết quả hoặc bảng vào trang, chuyển công thức sang Graph Studio. Lịch sử và bộ nhớ máy tính ở phiên hiện tại; muốn giữ lâu dài hãy chèn kết quả vào sổ tay.
- Công cụ toán chèn ký hiệu, phân số có gạch ngang, căn có nét phủ, ma trận/bảng, mẫu giới hạn/tích phân/tổng/vectơ/hệ phương trình và bảng biến thiên/xét dấu chỉnh tay. Nhấp đúp để sửa. Công cụ Công thức mới hỗ trợ dàn LaTeX bằng SVG, gồm phân số, căn, tích phân, ma trận, hệ phương trình và công thức nhiều dòng. Các mẫu bảng cũ vẫn chỉnh từng ô được. Không thực thi macro tùy ý hoặc tải gói TeX từ mạng.

## Lưu, phục hồi và xuất

- Tự động lưu thư viện trong **localStorage** khi được phép, mặc định sau 1.2 giây. Dòng dưới tên sổ tay báo thành công hoặc yêu cầu tải tệp thủ công. Sổ tay/trang/đối tượng giữ ID khi phục hồi cục bộ.
- **Ctrl+S** tải `.smath.json` gồm toàn bộ dữ liệu gốc; đây là bản sao lưu có thể chỉnh sửa. Menu có snapshot ghi ngày giờ và sao lưu toàn bộ thư viện.
- **Ctrl+O** nhập sổ tay hoặc bản sao lưu thư viện. Import tạo sổ tay mới, không ghi đè sổ đang mở. Kiểm tra phiên bản, kiểu đối tượng, tọa độ, tham chiếu đường phụ, ảnh và kích thước. Tệp lỗi bị từ chối trước khi thay đổi thư viện. Định dạng hiện tại **version 1**; các phiên bản khác bị từ chối rõ ràng, chưa có migration do chưa có phiên bản schema trước.
- Xuất PNG, SVG và PDF nhiều trang A4/A3; in qua trình duyệt. SVG giữ nét bút/hình học/văn bản dạng vector; đồ thị/ảnh được nhúng raster. Trang PDF nguồn được nhúng lại dạng vector với lớp chữ có thể trích xuất; các đối tượng chú thích được raster độ phân giải cao. Với trang sổ tay thông thường, PDF vẫn dùng ảnh độ phân giải cao cho nội dung tự tạo.
- Xuất/in **chỉ nội dung trong ranh giới trang**. Chọn khổ phù hợp hoặc di chuyển/thu nhỏ đối tượng trước khi xuất; nội dung ngoài trang vẫn tồn tại trong JSON.
- Chèn ảnh PNG/JPEG/WebP tối đa 5 MB, mặc định nguyên bản và có xử lý nét đen/nền trong suốt tùy chọn. PDF tối đa 40 MB, trong giới hạn 300 trang/sổ tay; có cuộn liên tục, chọn dải trang, giữ tỉ lệ, xoay trang và trích xuất văn bản. PDF khóa bằng mật khẩu cần mở khóa trước khi nhập. Chưa có OCR ảnh quét hoặc sửa văn bản gốc trong PDF.

### Những điều cần biết về `file://`

Lưu trữ của file cục bộ phụ thuộc trình duyệt, đường dẫn, cấu hình và quota. Chế độ riêng tư, chính sách công ty, xóa dữ liệu trình duyệt hoặc chuyển vị trí thư mục có thể làm bản tự lưu không còn truy cập được. **Không có cam kết lưu vĩnh viễn**; nên tải `.smath.json` sau buổi học và sao lưu tệp ra nơi khác.

Nếu lưu trữ bị chặn/hết dung lượng, ứng dụng vẫn dùng được và tải tệp thủ công vẫn hoạt động. Giới hạn chủ động 8 triệu ký tự cho thư viện lưu tự động và 100 MB cho tệp dự án nhập; quota thực tế có thể nhỏ hơn. Tài liệu nhiều ảnh/PDF có thể chạm quota sớm. Bản gốc PDF được lưu một lần trong assets, không lặp theo từng trang hoặc từng bước Undo; bản xem trước vẫn chiếm dung lượng. Tải .smath.json để bảo toàn sổ tay lớn. Không tự ghi tệp vào thư mục gốc; tải xuống qua trình duyệt không cần File System Access API.

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

Phím tắt trang không chạy trong input/textarea/select/hộp thoại. Ctrl+V hỗ trợ ảnh/văn bản từ clipboard hệ điều hành; sao chép/dán đối tượng dùng dữ liệu nội bộ trong phiên.

## Ví dụ đi kèm

Mở **examples/Toan-12.smath.json** qua Ctrl+O. Trang mẫu có đồ thị `x³−3x`, các điểm cực trị, hình chóp thật có thể xoay và ghi chú thể tích. Nội dung mẫu là đối tượng chỉnh sửa được, không phải ảnh chụp.

Mở **examples/Teacher-Geometry.smath.json** để xem cấu hình tam giác có điểm phụ, góc, đường cao và thiết diện qua ba trung điểm của lập phương. Các phép dựng là dữ liệu phụ thuộc có thể chỉnh sửa.

Mở **examples/Solid-Geometry.smath.json** để xem khối hộp, cầu, trụ, chóp, nón và nón cụt với nét khuất tự động. Chọn hình → **Xoay 3D** để kiểm tra các góc nhìn; **Di chuyển** để kéo vị trí.

Mở **examples/Teacher-Tools.smath.json** để thử trọng tâm G của tam giác, nối tới G và giao điểm I của hai đường chéo. Kéo đỉnh rồi quan sát các điểm phụ cập nhật.

## Kiểm thử

Đã kiểm thử tự động trên **Windows, Google Chrome và Microsoft Edge**, mở bằng `file://` với mạng của browser context bị chặn. Không phát sinh HTTP/HTTPS trong các luồng đã kiểm tra. Xem [docs/TEST-REPORT.md](docs/TEST-REPORT.md) để biết chi tiết và phần chưa kiểm thử bằng phần cứng thật.

Chỉ nhà phát triển cần Node.js/npm nếu muốn chạy lại test:

```powershell
npm ci --ignore-scripts
npm test
npm run test:browser
npm run test:advanced
npm run test:studio
npm run test:pen
npm run test:pdf
npm run test:notebook
npm run vendor:build  # chỉ cần nếu dựng lại thư viện từ dependency
npm run package
```

Browser tests dùng Chrome/Edge đã cài, không chạy localhost. Các tệp minh chứng được tạo trong `test-results/`. Kiểm thử hoàn tất không đồng nghĩa đã hỗ trợ toàn bộ đặc tả mở rộng trong yêu cầu ban đầu; các giới hạn đã ghi ở từng phần trên.

## Cấu trúc

```text
index.html                 Điểm vào; dùng script cục bộ cổ điển
css/main.css               Giao diện, panel, giấy, máy tính, in
css/studio.css             Header gọn, thanh dựng hình, PDF và công thức
css/pen.css                Thanh bút, bàn phím và các nút chạm
js/state.js                State, giao dịch, schema và localStorage
js/canvas.js               Pointer Events, vẽ, chọn, biến đổi, tẩy
js/renderer.js             Render trang, bút, hình học và lớp phủ
js/math-engine.js          Diễn giải AST với danh sách cú pháp cho phép
js/graph.js                Lấy mẫu, đồ thị, khảo sát và panel
js/geometry.js             Tọa độ, lưới 3D, phép chiếu và phép đo
js/solid-view.js           Tia nhìn, nét khuất và đường bao khối tròn
js/solid-drawing.js        Nét vẽ và nhãn hình học không gian
js/clipboard.js            Dán ảnh/văn bản và clipboard nội bộ
js/pen-tools.js            Thanh bút, chọn nhiều và chỉnh kích thước
js/pen-keyboard.js         Bàn phím Toán / số / tiếng Việt
js/constructions.js        Điểm phụ thuộc, hình chiếu, góc và thiết diện
js/teacher.js              Bắt điểm, chọn điểm và thao tác dựng trực tiếp
js/formulas.js             Nhận dạng biểu thức gõ và SVG công thức
js/pdf.js                  PDF.js offline, cache, nhập và xuất vector
js/pdf-tiles.js            Dựng vùng PDF đang xem ở độ nét theo màn hình
js/page-flow.js            Cuộn nối tiếp trang và xác định trang đang viết
js/images.js               Tách nền / làm đậm bản vẽ và phục hồi ảnh gốc
js/calculator.js           Máy tính, bộ nhớ và các chế độ
js/panels.js               Thư viện, thuộc tính, giấy/lớp/công cụ toán
js/export.js               JSON, ảnh, SVG, PDF và in
js/app.js                  Giao diện, menu, phím tắt và khởi tạo
vendor/                    math.js, pdf-lib, PDF.js, MathJax và tài nguyên nhúng
assets/                    Icon SVG tự thiết kế
examples/                  Sổ tay mẫu có thể chỉnh sửa
tests/                     Toán, schema và browser tests
scripts/                   Sinh ví dụ và đóng gói ZIP
docs/                      Báo cáo kiểm thử
```

Tách dữ liệu trang với trạng thái tương tác; mọi đối tượng có chung position/size/rotation/style/layer. Lịch sử lưu snapshot nội dung, dùng chung PDF gốc và giới hạn thêm 16 triệu ký tự cho mỗi ngăn Undo/Redo để tránh tăng bộ nhớ không kiểm soát; sổ tay lớn có thể có ít bước Undo hơn cấu hình. Nền giấy được cache riêng; đồ thị có cache raster; thao tác Canvas được gom qua requestAnimationFrame. Chưa có benchmark bảo đảm tốc độ cho tài liệu rất lớn hoặc thời gian sử dụng hàng giờ.

Biểu thức người dùng được parse bởi math.js và **diễn giải AST theo danh sách cho phép**, không dùng `eval()`/`new Function()`, không chạy HTML/JS từ tài liệu. Cú pháp, độ sâu, số node, giai thừa, số mũ, ma trận và vòng tính số được giới hạn. Dữ liệu học tập không gửi lên mạng.

Thư viện đóng gói: **math.js 15.1.0** (Apache-2.0), **pdf-lib 1.17.1** (MIT), **PDF.js 6.5.438** (Apache-2.0), **MathJax SVG 3.2.2** (Apache-2.0); giấy phép nằm trong `vendor/`. Playwright chỉ là dependency phát triển, không được tải khi mở ứng dụng.
