# Stibnite — AMCSD 0008636

- Công thức bản ghi: `Sb2 S3`; nhóm không gian `P n m a`.
- Metric: `{'a': 11.314, 'b': 3.837, 'c': 11.234, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `487.68836341200006` Å³.
- 5 vị trí bất đối xứng, 8 phép đối xứng, 20 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sb': 8, 'S': 12}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Okamoto K', 'Kimata M', 'Kyono A', 'Matsuhisa M', 'Miyashita Y'] (2002). Low-temperature crystal structures of stibnite implying orbital
 overlap of Sb 5s2 inert pair electrons
 Sample: T = 293 K. Physics and Chemistry of Minerals, 29, 254–260.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/stibnite.json`: 7215 byte; SHA-256 `e9887dd567f7d67c29cb98a17bcb1271aee53406f7d5a1a800e9ccc73644c185`.
- `assets/periodic-table/crystals/stibnite.cif`: 1187 byte; SHA-256 `364f520f27cf7e7df344aa053ea7a4f4db9a64cc237836afcaa8a9d5b23b266e`.
- `assets/periodic-table/crystals/stibnite.glb`: 27908 byte; SHA-256 `fdd6471578fc361a65723974b00460c2d96b3d6508cc79f7e9efe95d3d62561d`.
- `assets/periodic-table/crystals/stibnite.png`: 40844 byte; SHA-256 `0417750a305ce14ef0e3a3d2b2bfb57131259667d9a94402bb5dad113b898e5c`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
