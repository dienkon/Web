# Kiểm tra trực tiếp trên máy sử dụng

1. Giải nén ZIP đầy đủ. Ngắt Wi-Fi và Ethernet, mở index.html bằng Chrome hoặc Edge.
2. Viết một đoạn dài bằng chuột; thử bút stylus thật nếu có. Chọn bút mực, thay đổi áp lực; kiểm tra chạm lòng bàn tay không tạo nét ngoài ý muốn khi đang dùng bút.
3. Chọn tẩy một phần, cắt ngang một nét. Undo/Redo. Chọn nhiều nét bằng lasso và kéo, zoom rồi kiểm tra vị trí tương đối.
4. Nhập `x^3-3x` trong Graph Studio. Chèn, nhấp đúp để sửa thành `1/(x-2)` và kiểm tra không có đường nối giả tại cực.
5. Chèn tam giác trung tuyến, kéo các đỉnh; kiểm tra M vẫn ở giữa BC. Chèn hình lập phương và xoay; đổi cạnh 3, kiểm tra V=27, S=54.
6. Chèn chóp SA⊥đáy; a=4, h=6. Kiểm tra V=32, thử đường cao và các phép đo.
7. Tính `1/2+1/3`, `sin(30)` trong DEG và `sin(pi/6)` trong RAD; chèn kết quả vào trang.
8. Ctrl+S tải bản sao, đóng trình duyệt, mở lại index.html. Mở tệp .smath.json và kiểm tra sửa tiếp được đồ thị/hình học.
9. Thêm trang, xuất PDF A4/A3, mở PDF bằng trình đọc cục bộ; kiểm tra nội dung trong viền không bị cắt, đúng số trang.
10. Mở DevTools → Network trước khi thao tác. Không có request HTTP/HTTPS; không có tệp tài nguyên cục bộ bị thiếu. Nếu lưu tự động bị chặn, dòng dưới tên sổ tay phải báo cần lưu thủ công và Ctrl+S vẫn tải được tệp.

Danh sách này là hướng dẫn nghiệm thu thủ công, **không phải khẳng định đã kiểm thử phần cứng thật**. Xem docs/TEST-REPORT.md để biết kiểm tra tự động thực sự đã chạy.

## Bản 1.5 · Casio trong sổ tay

- Nhấn **Máy tính**: thấy Casio gốc, chạm MENU mở các chế độ và thử tính bằng phím trên thân máy. Kéo tiêu đề, kéo góc phải dưới, thử **− / +**, ghim, thu gọn, phóng to. Đóng/mở lại vẫn giữ phép tính và chế độ trong phiên.
- Nhấn **Chèn kết quả**, **Chèn ảnh LCD**; ảnh được chọn sẵn để kéo/đổi kích thước. Camera tải PNG khi không cấp quyền clipboard. **Công cụ sổ tay** vẫn mở được các tiện ích trước đây.
- Tắt Internet trước khi mở. Thử font LCD, ảnh thân máy, màn hình phụ, nhật ký phím, âm thanh. Nút **Offline** chỉ hiện thông tin bản đóng gói, không tải cập nhật.

## Bản 1.4

- Dùng bút chọn **Kéo trang**, kéo lên tới cuối giấy: trang mới tự nối bên dưới, cùng khổ và kiểu giấy. Viết một nét qua ranh giới; thử Undo/Redo và kéo một ảnh/hình sang trang kế.
- Chọn hình chữ nhật có hai đường chéo → **Dựng & đo → Giao điểm** → chạm từng đường. Kéo đỉnh kiểm tra I vẫn là giao điểm thật. Thử đường song song hoặc hai đường chéo nhau trong 3D để kiểm tra thông báo.
- **Trọng tâm** → chọn ba đỉnh → **Nối điểm** → chọn một đỉnh và G. Thử Trung tuyến/Phân giác trong menu. Mở sổ mẫu **Teacher-Tools.smath.json** để xem định nghĩa dựng sẵn.
- Chạm nút **⛶** bên phải header để vào toàn màn hình, chạm lại để thoát. Chỉ cần bút, không cần F11.
- Mở **⋯** trên thanh bút, tắt **Cuộn tới cuối tự thêm trang** khi muốn giới hạn số trang; mở lại ứng dụng để kiểm tra tùy chọn được nhớ.

## Bản 1.1

- Chọn Tài liệu PDF → Chọn PDF, nhập 1–3 trang từ máy. Viết/highlight và chèn công thức phía trên; xuất PDF, mở lại để kiểm tra độ nét và lớp chữ gốc. Thử PDF nguồn có trang ngang hoặc trang xoay.
- Chọn tam giác → Trung điểm → nhấp B/C, rồi Nối điểm → nhấp A/M. Kéo B và kiểm tra M, AM cập nhật. Thử Undo/Redo.
- Chèn lập phương: hình mặc định tĩnh, đen đậm, mặt trong suốt. Chọn Xoay 3D khi cần. Dựng 3 trung điểm cạnh qua A, chọn Thiết diện rồi nhấp các trung điểm; đổi a và kiểm tra diện tích.
- Nhập `f(x)=sqrt(x^2+1)/(x-2)` vào Công thức, kiểm tra căn/phân số và sửa bằng nhấp đúp. Công thức viết tay chưa được tự OCR.
- Dán ảnh có màu bằng Ctrl+V / Dán ảnh: kiểm tra giữ nguyên màu, nền và độ nét. Nhấp đúp → Áp dụng nét đen / nền trong suốt khi cần; sau đó Khôi phục ảnh màu gốc.
- Không còn thanh tiêu đề F8 hoặc footer. Thanh công cụ cao 79 px. Hình hộp/chóp mới có cạnh đáy nằm ngang. Cuộn qua nhiều trang PDF, zoom lớn, thử viết lên trang thứ hai khi cả hai trang cùng hiện.
