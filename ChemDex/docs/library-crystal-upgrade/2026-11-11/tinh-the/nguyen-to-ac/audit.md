# Actinium — AMCSD 0011134

- Công thức bản ghi: `Ac`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.311, 'b': 5.311, 'c': 5.311, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `149.805895231` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ac': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Cubic closest packed, ccp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ac.json`: 6213 byte; SHA-256 `d1a4171c6272af38097a8377e551f77962f27dbf0ed38d9fb0fa3f17ff115116`.
- `assets/periodic-table/crystals/nguyen-to-ac.cif`: 3316 byte; SHA-256 `17e9bcbd1b3999205aa7216871eaa05ada201aa8585c066a33d340a7541cbffb`.
- `assets/periodic-table/crystals/nguyen-to-ac.glb`: 25828 byte; SHA-256 `2f8e38b7e91b3ecf9b3819d4f8d240d7624554d950d8ac6379050e8657854a1d`.
- `assets/periodic-table/crystals/nguyen-to-ac.png`: 58715 byte; SHA-256 `ddb52998bc86df4b01ed1096a71ce28d5cb19db2185936693c1f4cf0f253c2e3`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
