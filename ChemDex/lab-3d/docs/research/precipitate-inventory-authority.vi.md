# Hiệu ứng kết tủa phải theo tồn kho

Ngày 23/10/2026.

Trước sửa đổi, `precipitateAmount_g` được ưu tiên hơn danh sách `contents`. Nếu thông tin hiển thị chưa cập nhật sau hòa tan hoặc vận chuyển, renderer có thể duy trì hạt và cặn dù pha rắn tương ứng không còn.

`bulkPrecipitateMass` nay là phép chiếu chung cho mô phỏng hạt và vật liệu chất lỏng. Nó cộng khối lượng hữu hạn, dương của đúng công thức, pha rắn và vị trí bulk. Nhãn pha trong công thức được nhận diện khi chưa có trường phase riêng. Phần ở filter hoặc foam không được biến thành huyền phù trong lòng bình. Khi bước nhiệt cập nhật pha, manager dùng contents sau bước nhiệt.

Thông tin `hasPrecipitate` và `precipitateAmount_g` cũ không tự cấp vật chất cho hiệu ứng. Không sửa hay xóa tồn kho để làm hình ảnh phù hợp. Kết tủa thuộc nhiều loài vẫn cần nhiều hệ hạt riêng; thay đổi này chỉ bảo đảm hệ đang chọn không cộng nhầm khối lượng của loài khác.

Kiểm tra mới gồm phân biệt pha/vị trí, nhãn công thức, khối lượng không hợp lệ, thông tin hiển thị cố tình sai và toàn bộ đường manager → hạt → độ đục sau khi chất rắn biến mất. Không xem các ca CPU là kiểm chứng GPU hoặc hoàn thiện cân bằng hóa học từng loài.
