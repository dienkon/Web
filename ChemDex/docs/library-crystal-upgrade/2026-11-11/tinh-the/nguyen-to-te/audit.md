# Tellurium — AMCSD 0011258

- Công thức bản ghi: `Te`; nhóm không gian `P 32 2 1`.
- Metric: `{'a': 4.44693, 'b': 4.44693, 'c': 5.91492, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `101.29781861238916` Å³.
- 1 vị trí bất đối xứng, 6 phép đối xứng, 3 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Te': 3}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-te.json`: 2380 byte; SHA-256 `c83612441eeaed05f8ce24829386943d6071839a1562201aa1dc6de00ebffcaf`.
- `assets/periodic-table/crystals/nguyen-to-te.cif`: 915 byte; SHA-256 `fb4a72299bbb2a9922f103340b67837b6ba311949450f1f1229cde313dbd6866`.
- `assets/periodic-table/crystals/nguyen-to-te.glb`: 25172 byte; SHA-256 `157e078b00a24a0ef865fdc87fd8403b8d2a0ef8ed68289c523960838d1daa36`.
- `assets/periodic-table/crystals/nguyen-to-te.png`: 40142 byte; SHA-256 `30f982e6f323d8d6050dfa105b069e2e2f6c5411dc0a122f01bc1f318618613f`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
