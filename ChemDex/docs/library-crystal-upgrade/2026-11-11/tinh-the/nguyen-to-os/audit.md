# Osmium — AMCSD 0011188

- Công thức bản ghi: `Os`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.7352, 'b': 2.7352, 'c': 4.319, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `27.982854307068365` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Os': 2}`.
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
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-os.json`: 2506 byte; SHA-256 `c0e1b15642e69d527bf07484805663f0d696f2df83d37673793e9bd59d68b92f`.
- `assets/periodic-table/crystals/nguyen-to-os.cif`: 1151 byte; SHA-256 `942ca872f9d49990b14f83af41e77bb9acdb94d4a009ee470eb60269b689834e`.
- `assets/periodic-table/crystals/nguyen-to-os.glb`: 24568 byte; SHA-256 `b93edd378e7a3cf7b2516cebd7c710d2ae2fd02d945e432a7da25c39d3001e60`.
- `assets/periodic-table/crystals/nguyen-to-os.png`: 40435 byte; SHA-256 `05848265afbee6856b7b94d0a2a6f1a5e811c308e921cd1d87de36b5d33a6d57`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
