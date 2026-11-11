# Lanthanum — AMCSD 0011203

- Công thức bản ghi: `La`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.77, 'b': 3.77, 'c': 12.159, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `149.66187799874442` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'La': 4}`.
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

- `assets/periodic-table/crystals/nguyen-to-la.json`: 3097 byte; SHA-256 `64b5fd2359071a72ffdb757ee7a408a3da4ca2e717046cc8b679393135b7fed6`.
- `assets/periodic-table/crystals/nguyen-to-la.cif`: 1175 byte; SHA-256 `b80dd791e586af87eb9b8f11a2251e78b0d7a0da98ee6cb79b89f97284d963ab`.
- `assets/periodic-table/crystals/nguyen-to-la.glb`: 26544 byte; SHA-256 `622bf06cb4f49a07353d6f287af987951fdfa5fbd2f501b2c672c963687a47b4`.
- `assets/periodic-table/crystals/nguyen-to-la.png`: 27501 byte; SHA-256 `88a500d52823bd6fe2c2f437c0f058098804cf524e4725645503ac22370d7c9f`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
