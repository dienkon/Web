# Zinc — AMCSD 0012940

- Công thức bản ghi: `Zn`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.6594, 'b': 2.6594, 'c': 4.9368, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `30.237333777167127` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Zn': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Jette E R', 'Foote F'] (1935). Precision determination of lattice constants
 Sample: at T = 25 C
 Note: lattice parameter is average of three samples. Journal of Chemical Physics, 3, 605–616.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-zn.json`: 2544 byte; SHA-256 `40d21d55b8f621b344d415d58088ef9807e8b6b92de339cfd045277e8e613f77`.
- `assets/periodic-table/crystals/nguyen-to-zn.cif`: 1182 byte; SHA-256 `eeafc46e27fae584dce1d9400d12f9a5137e9c475f39acfe48913d4e4814263a`.
- `assets/periodic-table/crystals/nguyen-to-zn.glb`: 24500 byte; SHA-256 `ebf55cc34b3333c31dece52225290835180f0caf6e78cc0c6cca337669252566`.
- `assets/periodic-table/crystals/nguyen-to-zn.png`: 36501 byte; SHA-256 `fbd8e7c8e0ec8deea5ea78ff115c61f56f89fa593d046fc21b06a896d9c54400`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
