# Đồng bộ chất rắn giữa bàn tự động và thủ công

Auto dùng chung hình học chuẩn hóa theo thể tích, dạng chất, vật liệu, khối lượng riêng theo pha và bộ giải va chạm `StockWorld` với bàn thủ công. Đồng giữ dạng phoi/dây, magie dạng dải, nhôm dạng lá, kẽm dạng hạt, sắt dạng bột và tinh thể giữ hình thái trong danh mục. Na/K được chuyển nguyên một viên như bộ hiển thị chuyên biệt của bàn thủ công.

Lượng chất được chia thành các mảnh hữu hạn có cùng hình học từ bình cấp, trong lúc rơi và sau khi vào bình nhận. Donor giảm khối lượng lúc mảnh rời miệng; mẫu chỉ nhận khối lượng và bắt đầu phản ứng khi mảnh chạm mẫu. Khối lượng trên không có sổ riêng `inFlightMass_g`. Quỹ đạo dùng trọng lực theo đơn vị vật lí của bình nhận; vị trí và vận tốc lúc chạm được chuyển sang SI cho bộ giải va chạm. Hòa tan/phản ứng giảm khối lượng và kích thước mảnh, giữ danh tính và vận tốc của phần còn lại.

Chất rắn ban đầu và sản phẩm kết tủa được phân biệt theo kho chất. Chất đã chuyển sang pha dung dịch không tiếp tục được vẽ thành khối rắn; sản phẩm huyền phù dùng hệ kết tủa hiện có. Bột nghỉ trên nền dùng cùng bề mặt đống bột theo khối lượng và các hạt đỡ; phần đang chuyển động không bị tính hai lần trong lớp bột.

Sửa thêm lỗi vật gần trung hòa lực nổi bị Rapier cho ngủ giữa lúc nổi lên. Dòng mang hoặc lực nổi dư đánh thức vật; thay đổi mặt thoáng/khối lượng riêng cũng cập nhật trạng thái ngủ. Thu cửa sổ về điện thoại đóng hai sidebar để các nút phát lại vẫn thao tác được. Đổi bài/làm lại giải phóng thế giới WASM riêng, giữ nguyên bàn thủ công.

## Phạm vi vật lí

Đây là mức mô phỏng chung của hệ thống, không phải mô hình đã hiệu chuẩn thực nghiệm cho mọi chất. Hạt bột là phần tử đại diện; va chạm hình phức tạp dùng bao lồi; lực cản và lực nổi dùng bán kính cầu tương đương. Đống bột dùng góc nghỉ 28° và tỉ lệ đóng gói 55% như bàn thủ công. Chất thiếu dữ liệu khối lượng riêng dùng hồ sơ dự phòng hiện có. Nhịp cấp chất, vận tốc phóng để hướng vào bình và thời gian phản ứng vẫn là thông số minh họa.

## Kiểm chứng

- `npm test -- --maxWorkers=1`: bộ kiểm thử toàn dự án, bao gồm bảo toàn khối lượng trong lúc rơi, dạng/màu/thể tích mảnh và đối chiếu kết quả auto với cùng bộ giải thủ công. Chạy riêng khỏi audit trình duyệt/build để tránh các kiểm thử hình học nặng hết thời gian do tranh CPU.
- `npm run lint` và `npm run build`.
- `npm run autoplay:audit`: 149 thí nghiệm với hóa học, hiệu ứng và bộ giải chất rắn được khởi tạo, kiểm tra trạng thái cuối và bảo toàn khối lượng.
- `node scripts/auditAutoSolidsBrowser.mjs`: kiểm tra donor, mảnh rơi và chất trong bình, tính đồng nhất hình học, khối lượng, lỗi WebGL, giao diện điện thoại và giải phóng bộ vật lí khi phát lại. Kết quả ở `artifacts/auto-solid-parity/`.

Kiểm chứng ngày 2026-11-13: 232 tệp / 3.104 kiểm thử đơn vị, 149/149 thí nghiệm đầy đủ, 10/10 tình huống trình duyệt, TypeScript và bản build đều qua. Cặn CuO giữ màu đen, không bị đáy kính trong suốt che thành màu trắng và không được vẽ lặp lại thành một đống chất rắn khác.
