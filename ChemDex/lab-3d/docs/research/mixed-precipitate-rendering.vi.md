# Nhiều kết tủa trong cùng dụng cụ

Đối chiếu 24/10/2026. Trước đây manager chỉ có một `PrecipitationSystem`: tên chất đang chọn quyết định cả khối lượng, màu, vật liệu và geometry. Khi phản ứng sau thay tên chất, phần rắn trước đó có thể không còn được mô phỏng đúng. Bản mới giữ hệ hạt theo công thức chuẩn hóa và render mỗi hệ bằng một batch geometry/material riêng.

## Inventory và nguồn hình thành

Sản phẩm rắn mới từ ledger/native có `solidOrigin: precipitate`; hình thái đã khai báo có thể được lưu trong `precipitateFormation`. Không trộn hàng này với mảnh chất rắn cùng công thức được thêm riêng. Các đường phân bố pha BaSO₄, AgCl/AgBr/AgI, PbI₂, CaCO₃, Ca(OH)₂ và Mg(OH)₂ cũng đánh dấu phần rắn của chúng. Đóng băng nước không được đánh dấu là kết tủa.

Khi inventory cũ chỉ có một nhãn kết tủa, vẫn đọc nhãn đó làm đường tương thích. Trước lần phản ứng tiếp theo qua ledger/aliquot, tách đúng khối lượng kết tủa đã ghi khỏi các hàng chất rắn cũ và gắn nguồn hình thành; phần còn lại vẫn là chất rắn thêm riêng. Phép tách không thay tổng mol/khối lượng hoặc sửa inventory nguồn tại chỗ. Không thể phục dựng chắc chắn danh tính nhiều kết tủa cũ nếu bản lưu trước đây không chứa thông tin đó.

Chỉ chất rắn trong bulk cấp khối lượng cho hệ hạt. Bã lọc, vật chất trong foam, pha aq/g và khối lượng sai định dạng không tạo cloud. Sản phẩm kim loại được mô hình hiện hữu xem là bám nền vẫn được trừ trước khi cấp khối lượng hạt. Mô hình lớp bám kim loại còn các giới hạn riêng, không được xác nhận thêm bởi thay đổi này.

Tách hàng cũng đòi hỏi ledger cộng và tiêu thụ thuốc thử qua nhiều hàng cùng công thức/pha, thay vì chỉ lấy hàng đầu. Nhận aliquot, thêm chất rắn và gộp spill giữ phân biệt hàng sản phẩm với hàng chất rắn thêm riêng. Đường rút mẫu hiện có thể lấy riêng phần đang lơ lửng nếu snapshot vật lý còn hợp lệ, xem [rót/hút huyền phù](suspended-solid-pour-transfer.vi.md); chưa mô hình hóa xói mòn cặn khi nghiêng bình.

## Hạt và lớp cặn chung

Các hệ độc lập giữ tuổi, vị trí, khối lượng glyph, bán kính vật lý, màu và hình thái. Đổi nhãn phản ứng không xóa hệ khác còn vật chất. Mất một pha chỉ xóa hệ của pha đó; reset vật lý giữ tham chiếu đối tượng cho renderer đang gắn và khởi tạo lại lượng đại diện từ inventory.

Tổng giới hạn glyph của cốc được chia giữa các pha. Khi phải giảm số glyph, chuyển trọng số khối lượng của glyph bị bỏ sang các glyph còn lại; không tăng bán kính vật lý để giả hạt to hơn. Ngân sách bằng không giữ lượng chưa hiển thị trong reservoir, không làm mất chất. Buffer GPU vẫn có dung lượng tối đa theo tier cho mỗi batch; số instance hoạt động được giới hạn chung. Chưa đo FPS hoặc VRAM thực tế.

Chỉ render một lớp cặn chung. Thể tích hạt rắn bằng tổng m_i/ρ_i của từng pha; thể tích lớp cặn chia cho hệ số đóng gói 0,65 hiện hữu, rồi đổi sang chiều cao theo lòng dụng cụ thực. Tất cả hệ hạt dùng cùng mặt cặn khi kiểm tra chạm đáy. Màu cặn, độ nhám và metalness là trung bình theo khối lượng để hiển thị; chưa mô phỏng các lớp trầm tích phân tầng hoặc đóng gói hỗn hợp đo được. Cốc khô dùng renderer chất rắn, không chồng thêm mesh lớp cặn của huyền phù.

## Màu và độ đục

Liquid shader chỉ nhận snapshot khi mọi pha và từng khối lượng vẫn khớp inventory hiện tại. Snapshot lỗi thời bị từ chối. Nếu không có pha rắn hoặc nhãn kết tủa, bộ tính trả về không hỗ trợ để giữ nguyên độ đục do mô hình chất lỏng khác, không dùng registry rỗng để xóa nhũ tương. Độ đục hiển thị ghép bằng 1−∏(1−c_i), màu huyền phù lấy trung bình RGB tuyến tính theo khối lượng còn lơ lửng; đây là quy tắc hiển thị, không phải phổ quang học, NTU/FNU hoặc mô hình tán xạ đã hiệu chuẩn. Cặn lắng không góp vào màu huyền phù. Shader không lấy riêng màu của nhãn kết tủa cuối cùng.

Kiểm thử: hai chất cùng tồn tại, đổi nhãn mà giữ lịch sử hạt, mất từng pha, snapshot lỗi thời, tổng ngân sách glyph, chuyển trọng số giữ khối lượng, thể tích cặn theo từng khối lượng riêng, phân biệt chất rắn thêm riêng/bã lọc, di chuyển metadata cũ và sản phẩm mới cùng công thức. Geometry của từng pha dùng các biên containment hiện hữu; chưa có kiểm chứng trực quan trên GPU. Thay đổi renderer không bổ sung cân bằng hóa học đa pha hoặc cơ chế đồng kết tủa/kết tụ dị thể.
