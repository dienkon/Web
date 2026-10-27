# Bọt khí, hạt kết tủa và lớp cặn trong lòng bình

Ngày kiểm tra: 22/10/2026.

## Lỗi đã sửa

- Bộ hiệu ứng dùng mức nước tuyến tính và một bán kính hình trụ cho mọi bình. Nay dùng `vesselLiquidSurfaceY`, cùng biên dạng kính và dung tích thực của bình. Khi bước nhiệt thay đổi lượng nước, hiệu ứng dùng lượng nước sau bước nhiệt.
- Giới hạn hạt kiểm tra cả kích thước hiển thị, hai đầu và mọi điểm gãy của biên dạng trong khoảng chiều cao hạt. Bọt dùng cầu bao cả billboard khi camera xoay; tinh thể dùng cầu bao kích thước mesh thực. Glyph quá lớn trong lớp nước mỏng được thu nhỏ, không thay đổi khối lượng hóa học.
- Bọt hợp nhất không được cập nhật như một bọt độc lập nữa. Điều kiện chạm mặt nước dùng cùng giới hạn kích thước với va chạm để tránh kẹt dưới mặt nước khi bước thời gian nhỏ.
- Bình khô không sinh bọt lơ lửng. Hạt kết tủa không còn chỗ trong chất lỏng chuyển khối lượng vào lớp cặn.
- Lớp cặn được dựng theo biên dạng đáy cong và các đoạn thân bình, thay đĩa trụ cố định. Chỉ tạo lại geometry khi loại bình hoặc chiều dày đổi; geometry cũ được dispose.

## Cơ sở và giới hạn

Thể tích dùng tích phân tiết diện tròn `V = integral(pi*r(y)^2 dy)`, tính chính xác theo từng đoạn nón cụt của biên dạng. Cơ sở toán học: [OpenStax, Determining Volumes by Slicing](https://openstax.org/books/calculus-volume-2/pages/2-2-determining-volumes-by-slicing).

Thể tích cặn là `mass / (particleDensity * 0.65)`. Hệ số đóng gói 0.65 là giả định hiển thị kế thừa, chưa phải dữ liệu thực nghiệm riêng cho BaSO4, PbI2 hoặc kết tủa keo. Va chạm dùng bao bảo thủ; chưa giải lực tiếp xúc, hạt trượt trên thành, điện tích bề mặt hay kết bông. Hình học này áp dụng trong hệ tọa độ bình đứng; chưa thay thế mô hình chất lỏng nghiêng, sóng mặt và cặn tái phân bố khi lắc. Các tốc độ chuyển động kế thừa vẫn cần hiệu chỉnh riêng từng phản ứng.

## Kiểm chứng

- Bộ đầy đủ: 74 file, 1012 ca đạt trước điều chỉnh ngưỡng chạm mặt nước cuối cùng.
- Sau điều chỉnh: 23 ca hình học đạt, gồm 16 loại bình, thể tích cặn hữu hạn, biên dạng mesh, mức nước dùng chung, bình khô và bước thời gian 1 ms không làm bọt kẹt dưới mặt nước.
- TypeScript đã đạt. Kiểm tra hình học thực hiện trên CPU; chưa xác nhận hình ảnh WebGL, FPS hay chất lượng vật liệu trên GPU.
- Production build đạt; bundle chính 3.617,43 kB vẫn có cảnh báo kích thước trên 500 kB. Không suy ra cải thiện FPS từ việc build thành công.

Chưa tuyên bố hoàn tất toàn bộ hiệu ứng hoặc hết mọi lỗi lơ lửng trong lab. Cần tiếp tục kiểm tra đồng bộ Na với sóng mặt nước, vị trí kê dụng cụ và từng nhóm phản ứng trên màn hình.
