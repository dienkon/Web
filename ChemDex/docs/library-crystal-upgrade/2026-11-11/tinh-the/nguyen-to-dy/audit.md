# Dysprosium — AMCSD 0011172

- Công thức bản ghi: `Dy`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.5903, 'b': 3.5903, 'c': 5.6475, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `63.04466617418795` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Dy': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-dy.json`: 2535 byte; SHA-256 `d5a45812b36be7dd11f3d22879e065973f2feeae53968e117e53e328203ce594`.
- `assets/periodic-table/crystals/nguyen-to-dy.cif`: 1177 byte; SHA-256 `66466832938b027ca3c9a9674baf8a266f656f133cd0fa1d20257c7c28759b20`.
- `assets/periodic-table/crystals/nguyen-to-dy.glb`: 24628 byte; SHA-256 `1e50d0725d1c44ac82cd0f166fa1b8d120b1c2633815cecf317d06c8d0dbd8f3`.
- `assets/periodic-table/crystals/nguyen-to-dy.png`: 36277 byte; SHA-256 `707a5bec644631b43774e0eedf7248f4e0fa67a3ae3678f99a267e7d9bb2173d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
