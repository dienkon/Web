# Lead — AMCSD 0012874

- Công thức bản ghi: `Pb`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 4.94006, 'b': 4.94006, 'c': 4.94006, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `120.5581767013522` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pb': 4}`.
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

- `assets/periodic-table/crystals/nguyen-to-pb.json`: 6275 byte; SHA-256 `8462fcb6df8a3067259876fc9b8b3bed0858f3c379eba4b2fceccc8547ec2f67`.
- `assets/periodic-table/crystals/nguyen-to-pb.cif`: 3361 byte; SHA-256 `23ae56f510d67880526853420de14d71722fd2af2dc3fe5a2ec00f0cc5affafb`.
- `assets/periodic-table/crystals/nguyen-to-pb.glb`: 25972 byte; SHA-256 `83be35e3c046b9e25a67c9292c787f3db3116fe1b7381be9c2c04e7e854b3b3a`.
- `assets/periodic-table/crystals/nguyen-to-pb.png`: 63547 byte; SHA-256 `1617a0d40c26983bdb0ed537e258117779aeeffdf390f3b4d52cd2e21e5492d3`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
