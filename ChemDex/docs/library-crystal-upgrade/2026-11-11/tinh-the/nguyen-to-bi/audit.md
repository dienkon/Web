# Bismuth — AMCSD 0012841

- Công thức bản ghi: `Bi`; nhóm không gian `R -3 m`.
- Metric: `{'a': 4.546, 'b': 4.546, 'c': 11.862, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `212.2987388020819` Å³.
- 1 vị trí bất đối xứng, 36 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Bi': 6}`.
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
 Sample: T = 298 K. Journal of Applied Crystallography, 2, 30–36.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-bi.json`: 3854 byte; SHA-256 `68c4fbb30baae5f5098473ffc4ba4185f97b205978d3bec0864ca770d0db36ba`.
- `assets/periodic-table/crystals/nguyen-to-bi.cif`: 1445 byte; SHA-256 `bc99119effb8af73e9608221401189f0604e7081289d34dd617e40110cbe94f6`.
- `assets/periodic-table/crystals/nguyen-to-bi.glb`: 26620 byte; SHA-256 `ca6d7da76fc3d8d2ff182f5e121fbc8c12d05008f209d02036ba8b05845dc23f`.
- `assets/periodic-table/crystals/nguyen-to-bi.png`: 30610 byte; SHA-256 `a5c5dfa759cdc3e4fb55e703501bec719c106f333635673b59eea7f75fa58635`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
