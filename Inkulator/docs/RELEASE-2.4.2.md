# Inkulator 2.4.2 · Giảng Toán 12

## Ý tưởng và nguồn tham khảo

Ưu tiên các hoạt động ngắn có thể dùng ngay trong giờ dạy: một đề nhiều bộ tham số, mở lời giải sau khi học sinh suy nghĩ, giữ nhịp thời gian và quay lại trang quan trọng. Tập chủ đề là lựa chọn thiết kế của Inkulator, không phải ngân hàng đề chính thức hay cam kết bao phủ toàn bộ chương trình.

Tham khảo tài liệu môn Toán của Bộ GDĐT về xác suất có điều kiện, sơ đồ cây và sử dụng phần mềm trong học toán: [Chương trình GDTX cấp THPT](https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1468/chuong-trinh-gdtx-thptsigned.pdf). Tài liệu này là chương trình GDTX, không được dùng để khẳng định mọi yêu cầu của chương trình THPT chính quy. Các bài trong app được sinh từ công thức và tham số, không chép ngân hàng đề từ nguồn này.

## Dùng nhanh

1. Bấm **Giảng bài** trên thanh công cụ (hoặc Menu → Chèn → Giảng Toán 12).
2. Chọn chủ đề và số bài từ 1 đến 12 → **Tạo bài vào sổ**. Các trang thường được chèn ngay sau trang hiện tại, giữ mức zoom. Một bộ không lặp cùng câu hỏi.
3. Dùng thanh giảng bài phía dưới để chuyển trang, **Hiện đáp án / Ẩn đáp án**. Có phím **Alt+A**. Đáp án được lưu cùng trang, vẫn là chữ sửa được; Undo xử lý việc tạo trang và thay đổi trạng thái ẩn/hiện.
4. Trước khi xuất đề cho học sinh, vào Giảng bài → **Ẩn mọi đáp án bài luyện**. Khi đáp án hiện, chúng cũng có mặt trong bản xuất. Khi ẩn, bản xuất bỏ chúng.

## Sáu chủ đề ngoại tuyến

- **Đạo hàm, cực trị:** hàm bậc ba có hai điểm dừng phân biệt, có đạo hàm, khoảng đơn điệu và tọa độ cực trị.
- **Tích phân xác định:** đa thức bậc hai trên đoạn hữu hạn, nguyên hàm và kết quả phân số rút gọn.
- **Oxyz:** lập mặt phẳng qua điểm và pháp tuyến, tính khoảng cách từ một điểm đến mặt phẳng; giữ dạng căn và số gần đúng.
- **Bayes:** nguồn sản phẩm từ hai máy, tỉ lệ đạt chuẩn và xác suất nguồn khi biết đạt chuẩn. Có công thức xác suất toàn phần và Bayes.
- **Thống kê ghép nhóm:** bảng năm khoảng đều, trung điểm, tổng tần số, trung bình, phương sai và độ lệch chuẩn. Các số đặc trưng được ghi rõ là xấp xỉ từ dữ liệu ghép nhóm; phương sai dùng mẫu số N.
- **Tối ưu:** hình chữ nhật có tổng chiều dài hàng rào cố định, lập hàm diện tích và xét dấu đạo hàm. Đây là mẫu bài cụ thể, không phải bộ giải mọi bài tối ưu.

Đây là bài luyện theo mẫu với tham số mới, chưa phải bộ đề đánh giá chính thức hoặc AI giải mọi đầu vào. Không cần Internet, API key hoặc model AI.

## Công cụ giảng bài

- **Che lời giải:** dùng công cụ Chọn để chọn các đối tượng cần che → Giảng bài → Che vùng đang chọn. App tạo một hình chữ nhật che ở lớp trên cùng. Thanh giảng bài bật/tắt các tấm che trên trang. Tấm che kéo, đổi kích thước, xóa và Undo được; lưu cùng sổ. Nó chỉ che về mặt hiển thị, không xóa dữ liệu bên dưới và không phải cơ chế bảo mật đáp án.
- **Đánh dấu trang:** đánh dấu/bỏ đánh dấu trang hiện tại; danh sách trong Giảng bài nhảy tới đúng trang dù thứ tự trang đã đổi. Dấu trang lưu trên thiết bị theo mã sổ và mã trang, tối đa 300 dấu.
- **Đồng hồ:** chọn 1–120 phút, bắt đầu/tạm dừng/tiếp tục hoặc đóng. Thời gian tính theo mốc thực nên không chậm lại do chuyển cửa sổ; mở app lại thì đồng hồ không tiếp tục phiên cũ.
- **Đèn soi:** làm tối màn hình quanh vùng con trỏ; tắt bằng Esc hoặc nút ◎. Đây là lớp phủ trong phiên giảng, không xuất vào PDF hoặc lưu vào nội dung sổ.

## Hiệu năng và kiểm tra

Không thêm thư viện hoặc dịch vụ mạng. Đồng hồ chỉ chạy bộ đếm khi đang đếm; đèn soi gộp cập nhật theo khung hình và chỉ cập nhật khi bật; thanh giảng bài không quét đối tượng khi bị đóng. Tài liệu đã đánh dấu xóa được lọc trước khi tạo bản sao để lưu, giảm công việc và bộ nhớ không cần thiết.

`npm run test:lesson-v242` kiểm tra kết quả mẫu cố định của sáu chủ đề, thao tác tạo bài thực tế, câu không trùng trong bộ, ẩn/hiện đáp án, Undo, tấm che, đánh dấu trang và reload, đồng hồ kết thúc, Esc tắt đèn soi, dữ liệu hợp lệ và không có yêu cầu mạng. Kiểm tra ngắn được chọn để tiết kiệm quota; không chạy lại toàn bộ bộ kiểm thử cũ.
