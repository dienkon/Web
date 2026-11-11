# Antimony — AMCSD 0012838

- Công thức bản ghi: `Sb`; nhóm không gian `R -3 m`.
- Metric: `{'a': 4.3084, 'b': 4.3084, 'c': 11.274, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `181.23442598128116` Å³.
- 1 vị trí bất đối xứng, 36 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sb': 6}`.
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

- `assets/periodic-table/crystals/nguyen-to-sb.json`: 3860 byte; SHA-256 `74284c677d7b05dd6586d5b1900e4665458ccaa6dec63856fd3190efd75ee114`.
- `assets/periodic-table/crystals/nguyen-to-sb.cif`: 1448 byte; SHA-256 `7bf10501a3d17eb913968d4fa7220685e9d1792a818e786b651944844a6df56b`.
- `assets/periodic-table/crystals/nguyen-to-sb.glb`: 26572 byte; SHA-256 `2cc785e2a07bc5f5f046a93686b196d920a5e16b7a82eb40cd021865f688c238`.
- `assets/periodic-table/crystals/nguyen-to-sb.png`: 31523 byte; SHA-256 `5cbb0ed634c33d15e2f25bd75cf4eb570d5363b15a4d252564fc104a02fbe4b0`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
