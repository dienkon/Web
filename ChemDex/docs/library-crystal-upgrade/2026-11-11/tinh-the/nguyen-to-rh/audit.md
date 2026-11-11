# Rhodium — AMCSD 0014948

- Công thức bản ghi: `Rh`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.7957, 'b': 3.7957, 'c': 3.7957, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `54.685934706493` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Rh': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Owen E A', 'Yates E L'] (1933). Precision measurements of crystal parameters
 Sample: at T = 18 C
 Note: lattice parameter is mean value of 3 radiation types. Philosophical Magazine, 15, 472–488.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-rh.json`: 6274 byte; SHA-256 `e479e1b2418475745c1bfa0e3006090358663a26cf3b293733f96db6381a65a1`.
- `assets/periodic-table/crystals/nguyen-to-rh.cif`: 3358 byte; SHA-256 `bd35a46511c2f8233e9f8354d59993bbf929ecb1bc53948fb614965356d0d029`.
- `assets/periodic-table/crystals/nguyen-to-rh.glb`: 25924 byte; SHA-256 `828033e4e4fc3d2f800973cb77468e004e3a63dd7832baf77ae249faa0cdf75a`.
- `assets/periodic-table/crystals/nguyen-to-rh.png`: 73345 byte; SHA-256 `2a6e07b77af2fcc69e9d5c72efce15aeb3bb849966326ada45706c489845a6cc`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
