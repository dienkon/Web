# Fluorite — AMCSD 0008645

- Công thức bản ghi: `Ca F2`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.4631, 'b': 5.4631, 'c': 5.4631, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `163.048741321591` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ca': 4, 'F': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Speziale S', 'Duffy T S'] (2002). Single-crystal elastic constants of fluorite (CaF2) to 9.3 GPa
 Sample: P = 0 GPa. Physics and Chemistry of Minerals, 29, 465–472.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/fluorite.json`: 8246 byte; SHA-256 `25321396e7d5224563831d8720438246fee8de49bb94a4972ac6c9e4d64cfbc3`.
- `assets/periodic-table/crystals/fluorite.cif`: 3354 byte; SHA-256 `9120e76ff5224ca9a8564039b750ff28315c60b00d4775994cf83c850bc6e2f3`.
- `assets/periodic-table/crystals/fluorite.glb`: 27640 byte; SHA-256 `5a6c53b21c5e95eea42c52979d9c2c173db2d2e8e8ab81c3ae990b71bef6c0cc`.
- `assets/periodic-table/crystals/fluorite.png`: 73659 byte; SHA-256 `9a6cbaf88614360624707808e443d3f4f28fd773fadcfbe3653e1176fa527fb7`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
