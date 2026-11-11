# Bohmite — AMCSD 0019146

- Công thức bản ghi: `Al O2 H.08`; nhóm không gian `A m a m`.
- Metric: `{'a': 3.693, 'b': 12.221, 'c': 2.865, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `129.30361834500002` Å³.
- 4 vị trí bất đối xứng, 16 phép đối xứng, 20 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Al': 4.0, 'O': 8.0, 'H': 0.32}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Độ chiếm chỗ H theo bản ghi là 0,04; đây là mô hình tinh chỉnh được công bố, không bổ sung các vị trí H chưa được xác định.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hill R J'] (1981). Hydrogen atoms in boehmite: A single crystal X-ray diffraction and
 molecular orbital study. Clays and Clay Minerals, 29, 435–445.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/boehmite.json`: 7146 byte; SHA-256 `c04c62e98eaf31e8e5b39aba1acdf40594303318d4c714ab295444eb59b6ca44`.
- `assets/periodic-table/crystals/boehmite.cif`: 1151 byte; SHA-256 `aca7a7d038f9323c369e35c510136dc379bb08d55bf125ff917c0d1bf41afc10`.
- `assets/periodic-table/crystals/boehmite.glb`: 66408 byte; SHA-256 `faa0ec9c3dab698dd20003eec082f6929cb1000eb3a8c8e5327748a1feda3fc8`.
- `assets/periodic-table/crystals/boehmite.png`: 32109 byte; SHA-256 `783568e520b430ec59689bcb45c3ab50457959cedbd3de93e79cb0edc4ed7ce5`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
