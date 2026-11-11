# Tungsten — AMCSD 0008068

- Công thức bản ghi: `W`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.1648, 'b': 3.1648, 'c': 3.1648, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `31.698507169792002` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'W': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Dubrovinsky L S', 'Saxena S K'] (1997). Thermal expansion of periclase (MgO) and tungsten (W)
 to melting temperatures
 Sample: T = 298 K. Physics and Chemistry of Minerals, 24, 547–550.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-w.json`: 3920 byte; SHA-256 `38806ef60d9a63491200ca2d71627c6e45579b7658637bf3f23b76457979b019`.
- `assets/periodic-table/crystals/nguyen-to-w.cif`: 2123 byte; SHA-256 `44d889713fcac7b5725863487da89c307667e8f3ec192a033921d85d28e58228`.
- `assets/periodic-table/crystals/nguyen-to-w.glb`: 25008 byte; SHA-256 `3fb11348bc22da85a45ef7f30f1e264949785f178fe6c91dfed40d5cabd84395`.
- `assets/periodic-table/crystals/nguyen-to-w.png`: 68466 byte; SHA-256 `dfcc8e64f874097dfe06f242d86d5c27d6a6ffae54c0bc9c1f3a6d3811132911`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
