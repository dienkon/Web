# Thallium — AMCSD 0011197

- Công thức bản ghi: `Tl`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.456, 'b': 3.456, 'c': 5.525, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `57.14922978439461` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Tl': 2}`.
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
 Sample at T = 297 K
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-tl.json`: 2524 byte; SHA-256 `e6b78db2107322c7c7022ff99564f8627680bc6ce078eee915d248dbd677c762`.
- `assets/periodic-table/crystals/nguyen-to-tl.cif`: 1172 byte; SHA-256 `c54208b4372a0561746709297c380e0c03f938f907d4c4fd2c919173993f8950`.
- `assets/periodic-table/crystals/nguyen-to-tl.glb`: 24604 byte; SHA-256 `2ace966906a0a847c04e68251cc9612923232103402d4fcc6cd1259f51939e0e`.
- `assets/periodic-table/crystals/nguyen-to-tl.png`: 36153 byte; SHA-256 `65427a1745710bd7380f1d2f9544795d4b7188b9b1b6c1fbcd57c0124f2b62fd`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
