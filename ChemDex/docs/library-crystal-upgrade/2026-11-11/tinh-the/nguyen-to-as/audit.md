# Arsenic — AMCSD 0012835

- Công thức bản ghi: `As`; nhóm không gian `R -3 m`.
- Metric: `{'a': 3.7598, 'b': 3.7598, 'c': 10.5475, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `129.12479731860074` Å³.
- 1 vị trí bất đối xứng, 36 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'As': 6}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Schiferl D', 'Barrett CS'] (1969). The crystal structure of arsenic at 4.2, 78 and 299 K
 Sample: T = 299 K. Journal of Applied Crystallography, 2, 30–36.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-as.json`: 3861 byte; SHA-256 `0801638ea8f600375ec21cf80caa3071eecb33a28cc30d87f19081d28a651b13`.
- `assets/periodic-table/crystals/nguyen-to-as.cif`: 1448 byte; SHA-256 `15069efe217509569926631ec36788125f74b8d466a390d1ecd6f93260f2d883`.
- `assets/periodic-table/crystals/nguyen-to-as.glb`: 26600 byte; SHA-256 `2ecf389e6935802fa4e6b038c61e02b6ef25103ac10c20ba247ea627ba123ca7`.
- `assets/periodic-table/crystals/nguyen-to-as.png`: 32444 byte; SHA-256 `9bdd4b965133dd5f4c2a2a6802ea46136dbe6ef57ccda5ff9f3cb60964db6924`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
