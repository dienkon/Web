# Erbium — AMCSD 0011174

- Công thức bản ghi: `Er`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.5588, 'b': 3.5588, 'c': 5.5874, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `61.284064212511815` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Er': 2}`.
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
 Sample at 293 K
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-er.json`: 2528 byte; SHA-256 `7e71350bbf973d7e739ee007106cd9105140e92e5f23284a96f04ec8d6b708b5`.
- `assets/periodic-table/crystals/nguyen-to-er.cif`: 1169 byte; SHA-256 `b579ce9b003ea9722a984d381e7b0d7926020277cad516e0470d162b637614f6`.
- `assets/periodic-table/crystals/nguyen-to-er.glb`: 24620 byte; SHA-256 `aa7da914dd7e60121cb93d88a118759674a518659382f8e8b46c008d32f32253`.
- `assets/periodic-table/crystals/nguyen-to-er.png`: 36602 byte; SHA-256 `b21799f2443f13ca3b5ebe1c40feb66232703fa5ab41af55924bb4c256fcdbe9`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
