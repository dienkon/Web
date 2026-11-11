# Graphite — AMCSD 0014675

- Công thức bản ghi: `C`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.464, 'b': 2.464, 'c': 6.711, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `35.285743880564326` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'C': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Đây là graphite; carbon còn có kim cương và các dạng thù hình khác.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Trucano P', 'Chen R'] (1975). Structure of graphite by neutron diffraction
 Note: natural crystals. Nature, 258, 136–137.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-c.json`: 3131 byte; SHA-256 `e46720ea29e9c803718176ed64732bceb095c3a17605df88f6a54d3aff7fb517`.
- `assets/periodic-table/crystals/nguyen-to-c.cif`: 1125 byte; SHA-256 `955104893cbf7fe1d75fb0d8e8ceaa5a4d07c52306e3fa1762a1d08005223e56`.
- `assets/periodic-table/crystals/nguyen-to-c.glb`: 26052 byte; SHA-256 `f3c8d3705bc09528187eb9faac21cdf426dc8a124dbb2dafbd9f75c170b0f2ab`.
- `assets/periodic-table/crystals/nguyen-to-c.png`: 40573 byte; SHA-256 `f789c0b115ccc25032e04c827fcbafad3d4ef4972daccc1e26522aef1fb6ac09`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
