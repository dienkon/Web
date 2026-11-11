# Gadolinium — AMCSD 0011176

- Công thức bản ghi: `Gd`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.636, 'b': 3.636, 'c': 5.7826, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `66.20663767672987` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Gd': 2}`.
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
 Sample at T = 293 K
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-gd.json`: 2530 byte; SHA-256 `a8ea0a22a289382b67b4dfec316d91fb2683b7a804b72912db4ca20623754375`.
- `assets/periodic-table/crystals/nguyen-to-gd.cif`: 1175 byte; SHA-256 `6bfe5f6cb97783eac08b3a4bece9c5cbbd5649b5872a35bab3dba37c3b09e860`.
- `assets/periodic-table/crystals/nguyen-to-gd.glb`: 24624 byte; SHA-256 `36cc7c76e56b57cf50550fd308c897d92322df0392e9e32a8b6a627ca8de4ec0`.
- `assets/periodic-table/crystals/nguyen-to-gd.png`: 35490 byte; SHA-256 `6640ac35953c9bb5479941287706489ebd039fe45744a2530ba373790454365b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
