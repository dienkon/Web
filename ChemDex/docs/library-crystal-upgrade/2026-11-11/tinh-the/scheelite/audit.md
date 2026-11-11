# Scheelite — AMCSD 0013201

- Công thức bản ghi: `Ca W O4`; nhóm không gian `I 41/a`.
- Metric: `{'a': 5.2429, 'b': 5.2429, 'c': 11.3737, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `312.64027026321696` Å³.
- 3 vị trí bất đối xứng, 16 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ca': 4, 'W': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Finger L W', 'Hazen R M', 'Mariathasan J W E'] (1985). High-pressure crystal chemistry of scheelite-type tungstates and molybdates
 Note: P = 0.0001 GPa, in air. Journal of Physics and Chemistry of Solids, 46, 253–263.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/scheelite.json`: 7962 byte; SHA-256 `62734fdf32c00f3b04266967b95e24b84fb59429837ad2ef8ca012f1d8fca555`.
- `assets/periodic-table/crystals/scheelite.cif`: 1241 byte; SHA-256 `236045961b75642d62cc101d50ffbe948a0889b6cecb94d4aeae3525a8383d85`.
- `assets/periodic-table/crystals/scheelite.glb`: 29512 byte; SHA-256 `6995059acb30be23b1b7cd945ca8a7e4faf733c04b4009d6fe5c19ccc6627ac1`.
- `assets/periodic-table/crystals/scheelite.png`: 42752 byte; SHA-256 `7d384cb62daa525a85979f0d41d0aebae8a949e6c8f62ade158b3367a36c44f4`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
