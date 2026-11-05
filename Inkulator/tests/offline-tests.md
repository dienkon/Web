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
10. Mở DevTools → Network trước khi thao tác. Không có request HTTP/HTTPS; không có tệp tài nguyên cục bộ bị thiếu. Nếu lưu tự động bị chặn, thanh trạng thái phải báo cần lưu thủ công và Ctrl+S vẫn tải được tệp.

Danh sách này là hướng dẫn nghiệm thu thủ công, **không phải khẳng định đã kiểm thử phần cứng thật**. Xem docs/TEST-REPORT.md để biết kiểm tra tự động thực sự đã chạy.
