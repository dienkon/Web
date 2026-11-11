# Magnesium — AMCSD 0012871

- Công thức bản ghi: `Mg`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.2093, 'b': 3.2093, 'c': 5.2103, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `46.47442164543402` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mg': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Straumanis M E'] (1949). The precision determination of lattice constants by the powder and rotation
 crystal methods and applications
 Sample: at T = 25 C. Journal of Applied Physics, 20, 726–734.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-mg.json`: 2553 byte; SHA-256 `a1c285ace7cf830e4e55d7c05c26b3f8015104b3fc88d9be350c8c6992eb9610`.
- `assets/periodic-table/crystals/nguyen-to-mg.cif`: 1194 byte; SHA-256 `0ae6f3a6d08acfa4cef0f073de83bcf03e812e1066d37c11b70a33b38a44bb23`.
- `assets/periodic-table/crystals/nguyen-to-mg.glb`: 24624 byte; SHA-256 `65090d3e691360795bd4b0f8686bf0d1605adf6ecb62bd3b4c2ce800dc3e3d69`.
- `assets/periodic-table/crystals/nguyen-to-mg.png`: 35954 byte; SHA-256 `e198e026699629c1d0ba870a50e03254302e24c8ec15813280f6441cab2ddcc3`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
