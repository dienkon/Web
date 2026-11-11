# Praseodymium — AMCSD 0011205

- Công thức bản ghi: `Pr`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.6725, 'b': 3.6725, 'c': 11.8354, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `138.24110002174598` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pr': 4}`.
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
 Double hexagonal closest packed, dhcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-pr.json`: 3107 byte; SHA-256 `512ac64d6317fb534e31bf36c488e28a7b911d4eb378840672d4e3fd3c01b97a`.
- `assets/periodic-table/crystals/nguyen-to-pr.cif`: 1181 byte; SHA-256 `62bceea6ee24b392cae3e3ace2240d19357e2395327c5e941933b0b8b00ef139`.
- `assets/periodic-table/crystals/nguyen-to-pr.glb`: 26720 byte; SHA-256 `0ac78e079336b3fdac664380df650dad681103c9636a433a9d974ed727662cc9`.
- `assets/periodic-table/crystals/nguyen-to-pr.png`: 27932 byte; SHA-256 `eaf693ffabf926f4717cf12cc18efaa09577919e372bcae0a8317f82878d8c94`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
