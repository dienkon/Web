# Chất rắn cơ học gặp vũng dung dịch

## Phạm vi

Nối kho chất của hạt rắn đã rơi ra bàn/sàn với bộ giải phản ứng vũng dung dịch hiện có. Không nhập toàn bộ hạt vào vũng, không tạo bản sao chất rắn. Vị trí tiếp xúc lấy từ snapshot SI của Worker, không lấy tọa độ nội suy hiển thị. Nhóm Na/K và băng vẫn đi theo đường chạy chuyên biệt hiện có.

Một hạt chỉ thuộc một phép tiếp xúc phản ứng mỗi bước. Chọn vũng có phần diện tích ướt lớn nhất; hòa chọn theo ID. Vũng hữu cơ không được trộn ngầm vào nước. Mẫu trên không, bên ngoài mép vũng hoặc ở mặt sàn khác không phản ứng.

## Mô hình rút gọn và miền áp dụng

- Hình học mặt vũng dùng cùng nghiệm Young–Laplace trục đối xứng với renderer. Góc tiếp xúc và đặc tính nước mặc định của mô hình vũng hiện có là giả định bề mặt; chưa phải phép đo cho từng dung dịch/mặt bàn.
- Lấy tối đa 128 mẫu diện tích cho một dạng hạt. Hạt bột dùng cầu mang khối lượng; vật thể lớn dùng tam giác của mesh hình dạng kho. Diện tích ướt là ước lượng rời rạc, không phải nghiệm đường tiếp xúc/capillary trên vật rắn. Hạt nằm trong vũng nhỏ so với kích thước vũng là miền dự kiến; chưa giải thể tích dịch chuyển, biến dạng mặt vũng, kéo dính hoặc chất lỏng mang theo khi nhấc hạt.
- Cho phép đáy mẫu lọt dưới mặt đỡ tối đa 50 µm, cùng cỡ sai số tiếp xúc cơ học đã kiểm tra. Không mở rộng mặt trên vũng theo sai số này.
- Hệ số phần diện tích ướt nhân vào tốc độ mũ của phản ứng có chất phản ứng rắn. Dùng nguyên hệ số động học đã khai báo trong ReactionProgram, không suy diễn phản ứng từ hiệu ứng. Các hệ số và phép ghép diện tích này chưa được hiệu chuẩn thực nghiệm.
- Mẫu phản ứng tạm thời gồm vũng và các hạt chạm nó. Tiêu hao thực tế được phân bổ theo khối lượng ướt, có chặn bởi lượng chất của từng nguồn. Hạt giữ ID, hình dạng kho, vận tốc và lượng chưa tiêu hao. Kích thước tuyến tính đổi theo căn bậc ba khối lượng với mật độ cũ.
- Nhiệt độ khi có phản ứng dùng giả định cân bằng nhiệt tức thời giữa các mẫu tham gia, theo nhiệt dung của chúng; không thêm nhiệt dung cốc tưởng tượng. Tiếp xúc trơ chưa truyền nhiệt. Chưa có hệ số truyền nhiệt bề mặt hoặc truyền khối khuếch tán được đo.
- Kết tủa/sản phẩm mới thuộc kho vũng; chưa mô phỏng lớp mạ bám vào hạt hay lớp thụ động hóa mới. Không tuyên bố đã mô phỏng ăn mòn có bề mặt phân giải.
- Khí/nước bay hơi chuyển sang kho khí môi trường đúng một lần. Bọt hiển thị lấy điểm tiêu hao chất rắn làm nguồn, tối đa 16 thể hiện mỗi vũng; trọng số hiển thị không tạo thêm mol khí.
- Phản ứng chạy ở nhịp cập nhật hóa học hiện có, tiếp xúc lấy từ snapshot cơ học gần nhất (thông thường tối đa 30 lần/giây), không xử lý giao cắt liên tục giữa hai snapshot. Hạt va lướt cực nhanh có thể bỏ qua tiếp xúc hóa học. Động học hóa học chưa có bảo đảm tái lập độc lập FPS của runtime Worker 120 Hz.

## Đồng bộ và lưu/khôi phục

Khi phản ứng làm giảm khối lượng giữa hai thông điệp Worker, collider được tạo lại ở vị trí/vận tốc hiện tại trong Worker. Không quay về vị trí đầu thông điệp. Chỉ lệnh khôi phục mới lấy pose đã lưu. Cầu nối từ chối pose/capture cũ nếu Undo/khôi phục thay quỹ đạo trong lúc Worker bận; thay đổi khối lượng đơn thuần vẫn giữ nội suy hình ảnh. Pause không tiếp tục phản ứng. Hạt đã hết/được dọn không xuất hiện lại từ thông điệp trễ.

## Kiểm chứng số

`tests/spill_stock_contact.test.ts` kiểm tra tách mặt đỡ/không khí/mép vũng, cầu mang bột nửa chìm, một hạt hai vũng, tiếp xúc trơ, cân bằng nhiệt của bước gộp tạm, Zn–HCl hữu hạn, cạn axit, ngắt tiếp xúc, alias Fe bột/mạt và sản phẩm rắn thuộc vũng. Đối chiếu tổng khối lượng và mol nguyên tố trên toàn bộ vũng + hạt + khí thoát.

`tests/stock_contact_world.test.ts` kiểm tra co collider ở quỹ đạo hiện tại, khôi phục có chỉ định và pause. Các fixture này kiểm chứng số trong điều kiện dựng sẵn, không chứng nhận sai số thực nghiệm ≤5% cho động học ăn mòn, tạo bọt hoặc thấm ướt.

Audit trình duyệt có thể chạy bằng `node scripts/auditWetStock.mjs` với dev server cổng 6773, rồi `WET_STOCK_PRODUCTION=1` với preview build cổng 6774. Script lưu fixture, báo cáo và ảnh trong `artifacts/wet-stock/`; Chrome trên máy tính và mô phỏng màn hình/cảm ứng điện thoại không thay thế kiểm tra trên thiết bị thật.

Kết quả lần triển khai: 218 file / 2.673 test chức năng qua; TypeScript và build qua. Bài smoke riêng qua, bước logic/vật lí ba bình trung bình 1,23 ms, p95 1,95 ms, tăng heap 7,85 MB; số này không bao gồm WebGL và không chứng nhận FPS toàn cảnh. Dev audit kiểm tra khối lượng tổng, nguồn khí cục bộ, 16 instance/vũng, pause, khôi phục giữa lúc Worker hoạt động và xóa không hồi sinh vật chất trên hai viewport. Production audit nạp fixture qua bản lưu và xác nhận khối lượng chất rắn trong đầu vào Worker giảm sau khi rơi vào vũng. Cả hai audit không ghi nhận lỗi trang/console hoặc mất WebGL. Báo cáo JSON lưu cùng ảnh chụp.
