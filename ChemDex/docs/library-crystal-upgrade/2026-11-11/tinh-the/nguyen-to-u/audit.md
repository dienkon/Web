# Uranium-alpha — AMCSD 0011262

- Công thức bản ghi: `U`; nhóm không gian `C m c m`.
- Metric: `{'a': 2.854, 'b': 5.869, 'c': 4.955, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `82.99687433000001` Å³.
- 1 vị trí bất đối xứng, 16 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'U': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-u.json`: 2739 byte; SHA-256 `5a5fcc349e6f07bace98a8f2e2152fe4d163087957a888dcdc827a9e940a4fa3`.
- `assets/periodic-table/crystals/nguyen-to-u.cif`: 1043 byte; SHA-256 `9af1de2c8af38a4b5867359107b6c1c0bbf4419be349a0243ed2ba09d48ff6b8`.
- `assets/periodic-table/crystals/nguyen-to-u.glb`: 24456 byte; SHA-256 `73358875e90e25ea75173a6388b0d99c5eacf46760b5ae02d0d5c36f9047ad53`.
- `assets/periodic-table/crystals/nguyen-to-u.png`: 42031 byte; SHA-256 `e37f64bd0ef4b74fa6a555f00c39b69f224c4cfa649bccc81a683d775996605a`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
