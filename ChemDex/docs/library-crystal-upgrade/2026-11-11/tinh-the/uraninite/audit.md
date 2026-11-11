# Uraninite — AMCSD 0011728

- Công thức bản ghi: `U O2`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.4682, 'b': 5.4682, 'c': 5.4682, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `163.50580330256804` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'U': 4, 'O': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Pha UO2 tham chiếu theo tài liệu tổng hợp; quặng uraninite tự nhiên có thể không đúng tỉ lượng, chứa tạp chất và tổn thương phóng xạ.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Fluorite structure. Crystal Structures, 1, 239–444.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/uraninite.json`: 8349 byte; SHA-256 `8e6a622600787ab953f5e7639a0052fb5133bd6c8f82f7b6ee6ed59bbe6659ff`.
- `assets/periodic-table/crystals/uraninite.cif`: 3325 byte; SHA-256 `9cf184dca7ccf88a75d5ba130f28199a0ff704017a6180953790e4d3dff3d476`.
- `assets/periodic-table/crystals/uraninite.glb`: 27664 byte; SHA-256 `d67042c11cc2987b3b0a2a2a9cae97b0d80a1d68a38ddabe2f41f9185e64ffbe`.
- `assets/periodic-table/crystals/uraninite.png`: 74491 byte; SHA-256 `269f9dd1eee98a59e8c75654b71b2b240a4a8b9dcd065d99d8d01f7818fa56fb`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
