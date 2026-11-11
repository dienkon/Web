# Phosphorus — AMCSD 0011250

- Công thức bản ghi: `P`; nhóm không gian `B m a b`.
- Metric: `{'a': 3.31, 'b': 4.38, 'c': 10.5, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `152.2269` Å³.
- 1 vị trí bất đối xứng, 16 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'P': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Đây là phosphorus đen; không đại diện phosphorus trắng hoặc đỏ.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Sample known as black phosphorus. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-p.json`: 3697 byte; SHA-256 `e625c8ed020f034ba3c97d632f335506318848379b7bfc7d9b4eec13d7f8fba6`.
- `assets/periodic-table/crystals/nguyen-to-p.cif`: 1071 byte; SHA-256 `11ad12621dbd8735b34bf1431a60e08fb06c797600353323c052043f2971b24e`.
- `assets/periodic-table/crystals/nguyen-to-p.glb`: 25704 byte; SHA-256 `cc2619aad7a81479aae17c5c75be135b4b196a0e60ed0b66d55785af246a8568`.
- `assets/periodic-table/crystals/nguyen-to-p.png`: 32466 byte; SHA-256 `50cb0a7ae36f14f627c98261f7e60edd4208eecf325db6cd8d743a96990b750c`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
