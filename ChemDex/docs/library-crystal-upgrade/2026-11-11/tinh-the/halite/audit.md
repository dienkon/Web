# Halite — AMCSD 0003397

- Công thức bản ghi: `Na Cl`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.6401, 'b': 5.6401, 'c': 5.6401, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `179.41568704920104` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Na': 4, 'Cl': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Walker D', 'Clark S M', 'Verma P K', 'Cranswick L M D', 'Jones R L', 'Buhre S'] (2004). Halite-sylvite thermoelasticity
 Sample: msl416031, T = 25 C, P = 0.0 kbar, cell volume = 179.42 ang**3. American Mineralogist, 89, 204–210.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/halite.json`: 7370 byte; SHA-256 `ac532908b58677f35127dd87eed711f4b243db7de640c567596d4df0ea430519`.
- `assets/periodic-table/crystals/halite.cif`: 3411 byte; SHA-256 `9a06231bf311c2dfc5710ac20d0806d86e59c2f2525b8356a5483a6fd9490bd8`.
- `assets/periodic-table/crystals/halite.glb`: 28448 byte; SHA-256 `7079672a44243b44c2812e34865bb51447af2587282c1a62f23471550cd3730b`.
- `assets/periodic-table/crystals/halite.png`: 80083 byte; SHA-256 `ecbe5c94b7ee15d097ee5ca5e219b4577c470c1b5e82716c3bd46072392c894c`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
