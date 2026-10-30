# PbI₂: kết tủa trực tiếp và kết tinh khi nguội

Đối chiếu ngày 22/10/2026 với [UC San Diego — Lead Iodide Crystals](https://chemistry-biochemistry.ucsd.edu/undergraduate/teaching-labs/demos/demo35). Nguồn mô tả tinh thể hình thành khi dung dịch nóng nguội đi, chìm xuống đáy; làm nguội chậm cho tinh thể lớn hơn. Không lấy tốc độ hoạt ảnh hiện có làm tốc độ thực nghiệm.

## Thay đổi

- Chương trình trộn Pb(NO₃)₂ và KI tạo kết tủa vàng mịn, không tự phát ánh lóe tinh thể. Phương trình ion: Pb²⁺ + 2I⁻ → PbI₂(s).
- Phân bố pha theo nhiệt độ lưu quan sát nhiệt độ và tổng lượng PbI₂ vào trạng thái bình. Chỉ nhận diện đường kết tinh khi nhiệt độ giảm, lượng chất rắn tăng từ phần đang hòa tan, và tổng lượng PbI₂ không thay đổi giữa hai quan sát. Đổ thêm chất rắn không được coi là bằng chứng tái kết tinh.
- Dạng phiến tiếp tục tồn tại sau khi nhiệt độ ổn định nếu còn chất rắn. Hòa tan hết rồi không có tăng trưởng khi nguội không tự sinh phiến.
- Khi không còn PbI₂, xóa lịch sử quan sát. Metadata có thể tuần tự hóa cùng trạng thái bình. Bộ kiểm tra xác nhận qua JSON; chưa kiểm tra thao tác UI lưu/khôi phục trực tiếp.
- Profile vật lý và renderer nhận cùng `precipitateMorphology`. Studio vẫn có thể yêu cầu mẫu phiến rõ ràng; công thức PbI₂ đơn lẻ không đủ để suy ra phiến.
- Nhận diện profile hỗ trợ chỉ số Unicode và nhãn pha, ví dụ `PbI₂(s)` và `Cu(OH)₂(s)`.

## Giới hạn còn lại

Đây là nhận diện đường hình thành, chưa giải số lượng mầm và tăng trưởng mặt tinh thể. Quan sát một bước nhiệt không phân biệt được mọi trường hợp vừa thay đổi thuốc thử vừa làm nguội. Một morphology đại diện cho cả quần thể; các hạt mịn cũ và phiến mới chưa được dựng thành hai quần thể riêng. Lịch sử không tự đi theo aliquot khi rót qua bình khác. Cần tiếp tục xây dựng vận chuyển provenance, động học quá bão hòa và mô hình kích thước phụ thuộc tốc độ làm nguội.

Đường cong độ tan và hệ số thư giãn pha đang có vẫn là xấp xỉ, không được nâng thành dữ liệu thực nghiệm bởi thay đổi hình ảnh này. Chưa mô phỏng đầy đủ hoạt độ ion, ion chung hoặc phức iodide. Chưa kiểm chứng GPU.
