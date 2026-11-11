# Ytterbium — AMCSD 0009179

- Công thức bản ghi: `Yb`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.4862, 'b': 5.4862, 'c': 5.4862, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `165.12578963192803` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Yb': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Spedding F H', 'Daane A H', 'Herrmann K W'] (1956). The crystal structures and lattice parameters of high-purity scandium,
 yttrium and the rare earth metals
 Note: sample 99.9% pure. Acta Crystallographica, 9, 559–563.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-yb.json`: 6304 byte; SHA-256 `2a8bea013df6e2bceb263acb92227f5b8a161ac92fc846a21035e3e667086739`.
- `assets/periodic-table/crystals/nguyen-to-yb.cif`: 3382 byte; SHA-256 `52f1aa1f54d20a52c53e05839c1d0b02c10d7e80a9130c295d80528084423adc`.
- `assets/periodic-table/crystals/nguyen-to-yb.glb`: 25932 byte; SHA-256 `077190f91bd8dccc50837d4e345956a3189142fa3a980202dd2cac843644f4ae`.
- `assets/periodic-table/crystals/nguyen-to-yb.png`: 57478 byte; SHA-256 `84163d3af2c6dd67f902d04ea610dfefa3c18f86a0fb6c938d97a4a36baaa03d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
