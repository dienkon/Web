# Cerium — AMCSD 0009169

- Công thức bản ghi: `Ce`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.1612, 'b': 5.1612, 'c': 5.1612, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `137.48397045292802` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ce': 4}`.
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

- `assets/periodic-table/crystals/nguyen-to-ce.json`: 6300 byte; SHA-256 `528c5be8987bcd3e910fc5b9cb6d151be6d2a43917b6577799ac6d6b3cc89e51`.
- `assets/periodic-table/crystals/nguyen-to-ce.cif`: 3379 byte; SHA-256 `8449025243cf933082657798c5c295da6c1a7b10a879df3ff20562fec8eb6cd8`.
- `assets/periodic-table/crystals/nguyen-to-ce.glb`: 25928 byte; SHA-256 `d10934cd1c1f329434fe0977198d89e1c0aec178b1799a4175bfe7b187126e13`.
- `assets/periodic-table/crystals/nguyen-to-ce.png`: 59798 byte; SHA-256 `02c501cb77b931bd456f6586656729990ce83799e9d8548350fb6ddce2c05d4d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
