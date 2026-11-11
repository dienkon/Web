# Rhenium — AMCSD 0011190

- Công thức bản ghi: `Re`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.7608, 'b': 2.7608, 'c': 4.4582, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `29.427954222783445` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Re': 2}`.
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
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-re.json`: 2511 byte; SHA-256 `34cf1cc7a9a9bf9eb01438ebe85b4313c5258665498095bb6637913b8bd2bb63`.
- `assets/periodic-table/crystals/nguyen-to-re.cif`: 1153 byte; SHA-256 `a5ede194d6ee821963e09d029cfb337c2cc3270367be8f39503b1ac0bc90707a`.
- `assets/periodic-table/crystals/nguyen-to-re.glb`: 24452 byte; SHA-256 `87277b12110de160538454ce1c7368c66fe550b9c5219d33a1abd950d34c8d7e`.
- `assets/periodic-table/crystals/nguyen-to-re.png`: 38708 byte; SHA-256 `02729560e6a72453d46f5b1f745f4246589c90624814d5f21231eb6c6afa6eef`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
