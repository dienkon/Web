# Selenium — AMCSD 0012674

- Công thức bản ghi: `Se`; nhóm không gian `P 31 2 1`.
- Metric: `{'a': 4.3662, 'b': 4.3662, 'c': 4.9536, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `81.7822052281472` Å³.
- 1 vị trí bất đối xứng, 6 phép đối xứng, 3 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Se': 3}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Cherin P', 'Unger P'] (1967). The crystal structure of trigonal selenium. Inorganic Chemistry, 6, 1589–1591.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-se.json`: 2369 byte; SHA-256 `a50529eb4f7239b705f614436903ee0ef0e5f4f40bc6908baa7da7d864caa86b`.
- `assets/periodic-table/crystals/nguyen-to-se.cif`: 904 byte; SHA-256 `6457fb6928594baa776f38bbbaa0da1480aae49b875643e4f83792cc8eb99a4d`.
- `assets/periodic-table/crystals/nguyen-to-se.glb`: 25332 byte; SHA-256 `9f093698c8b968206fc630730882ada14de75fc5f914c13616007b708025eef2`.
- `assets/periodic-table/crystals/nguyen-to-se.png`: 42032 byte; SHA-256 `6c1024e0f9775f54909a60de8e998dcf33daaf387ba327c9c51f8a25490159cf`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
