# Hafnium — AMCSD 0011178

- Công thức bản ghi: `Hf`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.1967, 'b': 3.1967, 'c': 5.0578, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `44.76061509072102` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Hf': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-hf.json`: 2509 byte; SHA-256 `7009586cf3d2a55ce645c9f5e159e3573889b2e3a77da39634a0de7db55c9ea0`.
- `assets/periodic-table/crystals/nguyen-to-hf.cif`: 1153 byte; SHA-256 `0e54221e48824da1224f3068309c59208e93e4e17c0445dfbd9f4e4ecb8fc1f2`.
- `assets/periodic-table/crystals/nguyen-to-hf.glb`: 24600 byte; SHA-256 `9da24efd1fb84314bc3b1742a53e6c3130eac7a1fe090d8a8418ae6452baff61`.
- `assets/periodic-table/crystals/nguyen-to-hf.png`: 37810 byte; SHA-256 `beafca4cf9f21436bc7cb46933c40ed205c416eb1bc39cf847b3d7eab836b74a`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
