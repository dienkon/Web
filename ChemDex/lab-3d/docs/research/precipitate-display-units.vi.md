# Đơn vị hiển thị và vận tốc ban đầu của hạt

Cập nhật 24/10/2026. Nhánh glyph không có phóng đại riêng trước đây dùng bán kính mét nhân 8,5, khác với tỷ lệ cảnh 0,035 m/đơn vị. Nay bán kính scene = bán kính vật lý mét / 0,035, giữ biến thiên hiển thị ±20% đã có. `displayRadius_scene` vẫn là phóng đại tường minh và không tham gia tính lực cản/Brownian. Phiến kết tinh PbI₂ vẫn có đường hiển thị riêng chưa hiệu chuẩn.

Bỏ cú đẩy ngang mặc định 0,025 đơn vị cảnh/giây khi phát hạt trong mẫu không có điểm rót hoặc khuấy. Vận tốc chất lưu và dịch chuyển Brownian vẫn hoạt động; không biến kích thước/vị trí glyph thành nguồn tạo khối lượng. Nhánh dòng rót và tái phân tán từ lớp lắng vẫn giữ xấp xỉ vận tốc minh họa, chưa phải CFD.

Sửa chú thích độ dày lớp lắng từ mét thành đơn vị cảnh để khớp dữ liệu thực đang truyền cho renderer. Không đổi thuật toán đổi thể tích lòng bình.

Kiểm thử đối chiếu độc lập bán kính scene với tỷ lệ chung, kiểm tra không có vận tốc ngang mặc định, giữ phóng đại CuS độc lập với radius vật lý và bảo toàn khối lượng. Các kiểm thử vòng đời, giới hạn thành/đáy và độ đục tiếp tục đạt. Chưa có kiểm chứng GPU hoặc đo kích thước hạt từng phản ứng.
