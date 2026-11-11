# Cesium — AMCSD 0011211

- Công thức bản ghi: `Cs`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 6.067, 'b': 6.067, 'c': 6.067, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `223.317102763` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cs': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Bản ghi đo ở 78 K; ô mạng này không phải phép đo ở nhiệt độ phòng.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Sample at T = 78 K
 Body centered cubic, bcc, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-cs.json`: 3986 byte; SHA-256 `ef32a9942979e2a9c55051525027a602496c940de98f5a609da7b9fdb92ebbd3`.
- `assets/periodic-table/crystals/nguyen-to-cs.cif`: 2109 byte; SHA-256 `1008797a4a5f2615d0198c6b6d374a15b049fcd35c69a468ae48a70a1b4ee429`.
- `assets/periodic-table/crystals/nguyen-to-cs.glb`: 24984 byte; SHA-256 `8ced2c9cf792b3394d7d740fb1004038c6447a22ff7360b5ce79e3c765d81e2e`.
- `assets/periodic-table/crystals/nguyen-to-cs.png`: 46628 byte; SHA-256 `e5f633d3cc79411df0a43c2c9319f41f4884e0613839760cbe0d24556b661741`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
