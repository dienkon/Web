# Titanium — AMCSD 0020263

- Công thức bản ghi: `Ti`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.95, 'b': 2.95, 'c': 4.686, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `35.31644235417009` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ti': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Ma Z', 'Shi N', 'Li G', 'Xiong M', 'Bai W', 'Fang Q', 'Yang J', 'Rong H'] (2013). Titanium, Ti, a new mineral species from Luobusha, Tibet, China. Acta Geologica Sinica, 87, 1275–1280.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ti.json`: 2567 byte; SHA-256 `fe3bd0b0fe619ec9545ee6192f3064419a7b09effa8e5136f5d099a4d36acfd0`.
- `assets/periodic-table/crystals/nguyen-to-ti.cif`: 1165 byte; SHA-256 `272827b15a41e5ea9418e28245e33b1c27393897f487741168836f1498f114cc`.
- `assets/periodic-table/crystals/nguyen-to-ti.glb`: 24596 byte; SHA-256 `dcfc5db5674f97df6969e66dee064a876bf9d421f8cfd531ec19cd1850a70fb5`.
- `assets/periodic-table/crystals/nguyen-to-ti.png`: 38977 byte; SHA-256 `0c13e62167338d64f768ca3078701d636458ee318eaa74f13819d942f7c791db`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
