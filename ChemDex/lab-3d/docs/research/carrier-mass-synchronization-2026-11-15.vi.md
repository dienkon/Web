# Lượng chất theo hạt và đồng bộ cơ học — 15/11/2026

## Lỗi và phạm vi sửa

Một hàng Zn có thể gồm hạt ngập axit và hạt nằm ngoài dung dịch. Trước đây lượng chất và kích thước được chia đều theo công thức, nên hạt khô cũng co. Việc sửa lượng chất trong lúc worker đang chạy còn làm phản hồi vị trí bị từ chối, hoặc hồi sinh một liều mới đã tan trước khi nhận được ID cơ học.

Kho hóa học vẫn là nguồn lượng chất duy nhất. `allocateStockConsumption` phân bổ phần đã tiêu thụ cho các ID có tiếp xúc; hạt khô được bảo vệ. Hạt ngập một phần được dùng toàn bộ kho hữu hạn của nó với tốc độ theo diện tích ướt. Đây là xấp xỉ hạt co đều, chưa phải lưới ăn mòn cục bộ.

Các bộ giải native, Studio, tự động, nhôm nhiều giai đoạn, Cu/NH₃ và pha NaCl/CaCO₃/PbI₂ truyền cùng kết quả lượng chất theo hạt. Tiến độ được chặn trước khi tính lượng sản phẩm/nhiệt. Kéo timeline không được vượt lượng chất đang tiếp xúc; nhúng phần còn lại cho phép tiếp tục. Liều mới chưa có pose không phóng to hạt cũ: tiếp xúc và thể tích chiếm chỗ dùng vùng bố trí tạm riêng; nguồn bọt cũng giữ các mặt cũ và bổ sung vùng của liều mới.

## Hóa học và worker

- Lượng chất thay đổi mà vị trí/vận tốc giữ nguyên được nhận diện là thay đổi hóa học. Worker thu nhỏ đúng ID tại vị trí hiện tại của nó, giữ vận tốc và ID; không khôi phục một pose cũ.
- Phản hồi đang bay được đối soát với kho hiện tại theo công thức và ID. Hạt mới chỉ nhận lượng còn lại của liều đã gửi. Liều thêm sau yêu cầu đó chờ lần gửi của chính nó.
- ID đã tiêu thụ hết giữ dấu khối lượng/kích thước bằng zero đến khi worker xác nhận xóa. Phản hồi cũ và nhánh tràn không được dùng lại khối lượng trước phản ứng.
- Vỏ va chạm và khối lượng cơ học bao gồm lớp kim loại bám. `pose.mass_g` luôn là khối lượng lõi; không đổi Cu thành Fe để cân tải. Thể tích va chạm là thể tích tương đương, chưa theo từng nhánh kim loại.
- Hạt tràn mang đúng lõi và các dòng lớp bám của ID đó; hạt thu vào cốc giữ từng chất riêng. Kết tủa tự do cùng công thức không tự đi theo lõi. Lõi tan trong vũng vẫn giữ lớp bám còn sống; khi lõi hết, xóa carrier và trả phần lớp bám về cặn tự do.
- Thu hạt vào bình đầy dùng cùng bộ giải tràn với luồng rót: tính thể tích lõi, lớp bám và màng thành; nếu có hai pha không trộn, phần tràn lấy lớp trên. Hồi quy nước/hexane kiểm tra nước không bị rút lẫn và từng chất được bảo toàn.

## Kiểm chứng

`stock_mass_sync.test.ts` dùng Rapier thật để kiểm tra hạt đang rơi, co riêng hạt ướt, dấu zero, liều mới và lực đỡ gồm cả lớp phủ. Trường hợp tái hiện race: hai hạt cũ mỗi hạt 0,1 g, thêm 0,1 g rồi hòa tan liều mới trước phản hồi; tổng hạt cũ vẫn 0,2 g, không bị chia lại thành ba hạt 0,0667 g. Bao phủ cả lần khởi tạo chưa có snapshot, nhiều công thức và hạt mới đang tràn.

`auditCarrierMassSync.mjs` chạy ứng dụng thật và worker thật: Zn 0,2 g chia hai hạt, một ướt/một khô, pause để kiểm tra pose cố định; tiến độ 0,25 chỉ làm hạt ướt còn 0,05 g. Sau khi gửi một bước chuyển động, audit cập nhật hóa học đến 0,375 trước phản hồi: hạt ướt còn 0,025 g, hạt khô vẫn 0,1 g và tiếp tục rơi. Đến 0,5, worker xóa hạt ướt; seek 1 bị từ chối. Đặt hạt còn lại vào nước cho phép hoàn tất đúng 0,2/65,38 mol H₂. Kiểm tra cả scale của mesh, không chỉ JSON. Ảnh hạt khô ở trên mặt nước được chụp khi pause trong fixture có chủ ý, không phải trạng thái cân bằng lơ lửng.

Artifact: `artifacts/carrier-mass-sync/audit.json` và hai ảnh cùng thư mục. Không có lỗi JavaScript/shader trong lượt đạt. Test pha còn kiểm tra chỉ hạt ướt hòa tan, lượng nước và tổng moles giữ đúng.

## Giới hạn còn mở

Tiếp xúc dùng mặt thủy tĩnh, chưa giải màng bám, mao dẫn, tia rót và biên vortex tại hạt. Kết tủa vi mô chưa có tọa độ hóa học riêng. Lớp bám chưa có luật bong do khuấy hay độ xốp đã đo; không tự thêm hệ số cho hiệu ứng. Chuỗi lớp bám nhiều tầng (Ag mọc bằng cách tiêu thụ lớp Cu trên Fe) và kim loại mới hình thành trên hạt trong vũng chưa có lịch sử carrier đầy đủ. Các trường hợp này tiếp tục nằm trong kế hoạch, không được coi là hiện tượng đã hiệu chuẩn.
