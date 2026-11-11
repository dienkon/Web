# Sulfur — AMCSD 0010058

- Công thức bản ghi: `S`; nhóm không gian `F d d d`.
- Metric: `{'a': 10.4646, 'b': 12.866, 'c': 24.486, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `3296.7348925896003` Å³.
- 4 vị trí bất đối xứng, 32 phép đối xứng, 128 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'S': 128}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Rettig S J', 'Trotter J'] (1987). Refinement of the structure of orthorhombic sulfur, alpha-S8
 Sample: at T = 298 K
 Note: alpha phase. Acta Crystallographica, Section C, 43, 2260–2262.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-s.json`: 33993 byte; SHA-256 `e971c7b572bd6da16b88811a31f8637880f31a8f04b24ad5eb1e98d6620b11f1`.
- `assets/periodic-table/crystals/nguyen-to-s.cif`: 1504 byte; SHA-256 `8b617bbffd40a4c1064197745d64210b81463e7de1fbfa85b0d4a2e1f7e381f6`.
- `assets/periodic-table/crystals/nguyen-to-s.glb`: 50052 byte; SHA-256 `ea0b907b8704a0f3a962fb724354764e8e9fb2e6bcba4ea5acf63340c61ee5ef`.
- `assets/periodic-table/crystals/nguyen-to-s.png`: 45474 byte; SHA-256 `7c90227cc41748e81597de23625b197d1497be43d134fb7178f636b812d76d71`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
