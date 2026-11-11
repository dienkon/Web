# Molybdenum — AMCSD 0012937

- Công thức bản ghi: `Mo`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.141, 'b': 3.141, 'c': 3.141, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `30.988732221` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mo': 2}`.
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
 Note: lattice parameter is average of two samples. Journal of Chemical Physics, 3, 605–616.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-mo.json`: 3921 byte; SHA-256 `4daa4088e7ecf39c2bddfb5c18a0a289bd70696ca6b96738b3f0f92c11ab6114`.
- `assets/periodic-table/crystals/nguyen-to-mo.cif`: 2128 byte; SHA-256 `26bfa7ce536e441ff2d78524fd9851de0220ec82197b6d043fad1604f0bcc1b3`.
- `assets/periodic-table/crystals/nguyen-to-mo.glb`: 25008 byte; SHA-256 `a4e64b76684be82005d94f2c3467e4156f49ff3d700c98ef067502989b7770ec`.
- `assets/periodic-table/crystals/nguyen-to-mo.png`: 67538 byte; SHA-256 `307d52115937d538860c2e23a09e10c2b4ceb814f81f58f0295e9b23ab207292`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
