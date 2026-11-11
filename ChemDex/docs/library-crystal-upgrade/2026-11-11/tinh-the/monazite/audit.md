# Monazite-(Ce) — AMCSD 0001700

- Công thức bản ghi: `Ce P O4`; nhóm không gian `P 1 21/n 1`.
- Metric: `{'a': 6.788, 'b': 7.0163, 'c': 6.465, 'alpha': 90.0, 'beta': 103.43, 'gamma': 90.0}`; V tính lại `299.48637533121257` Å³.
- 6 vị trí bất đối xứng, 4 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ce': 4, 'P': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hughes J M', 'Mariano A N', 'Ni Y'] (1995). Crystal chemistry of the monazite and xenotime structures
 Ce(PO4). American Mineralogist, 80, 21–26.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/monazite.json`: 8241 byte; SHA-256 `f392cc82305378c119cb57590e6b2fdd4f2176b862557383699fca2bd4c6b47b`.
- `assets/periodic-table/crystals/monazite.cif`: 1086 byte; SHA-256 `a11cb2fa1a6aaf3b89cfceca5412ed22be44ea50a69e99b8008b43357cf9a08f`.
- `assets/periodic-table/crystals/monazite.glb`: 29988 byte; SHA-256 `5440410ae675ff8128e0f0683cd409239103e25a14728926b11af21f5907c514`.
- `assets/periodic-table/crystals/monazite.png`: 55145 byte; SHA-256 `ae64885fa25bf5bbe5d0f76596ac1a19d0e944f6ce33d293d679b2b89f6c5908`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
