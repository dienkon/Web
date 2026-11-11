# Silicon — AMCSD 0012843

- Công thức bản ghi: `Si`; nhóm không gian `F d 3 m`.
- Metric: `{'a': 5.430941, 'b': 5.430941, 'c': 5.430941, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `160.1862572980187` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Si': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hom T', 'Kiszenick W', 'Post B'] (1975). Accurate lattice constants from multiple reflection mesurements II.
 lattice constants of germanium, silicon and diamond
 Sample: at T = 25 C. Journal of Applied Crystallography, 8, 457–458.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-si.json`: 7823 byte; SHA-256 `e81305ed8c19a142f52d7fc296a330064a038ab69cf4a0ac127dec658b2ecdf2`.
- `assets/periodic-table/crystals/nguyen-to-si.cif`: 3939 byte; SHA-256 `4e0aeae3586b32b2b5c2b161bf4791d9df44f14dfdf7d47a80302f617de7a3b9`.
- `assets/periodic-table/crystals/nguyen-to-si.glb`: 26864 byte; SHA-256 `321076ebe6b3a5d176ec26f9c21e844dacc84b2064effb9f6b1552e49e90f1a9`.
- `assets/periodic-table/crystals/nguyen-to-si.png`: 65504 byte; SHA-256 `6cce491a720a2d43913c12fc12d20c9ffd739ce9e9f7c7fe9d354289742e4aaf`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
