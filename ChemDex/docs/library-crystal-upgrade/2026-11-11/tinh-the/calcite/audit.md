# Calcite — AMCSD 0000984

- Công thức bản ghi: `Ca C O3`; nhóm không gian `R -3 c`.
- Metric: `{'a': 4.988, 'b': 4.988, 'c': 17.061, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `367.6105818568375` Å³.
- 3 vị trí bất đối xứng, 36 phép đối xứng, 30 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ca': 6, 'C': 6, 'O': 18}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Reeder R J', 'Markgraf S A'] (1985). High-temperature structure refinements of calcite and magnesite
 Sample: T = 24 C. American Mineralogist, 70, 590–600.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/calcite.json`: 10008 byte; SHA-256 `4e4f8d6d6b951bfaadbbc8ee9b2d1fe0a50ee3441f3ed9a18aabd874271a0e77`.
- `assets/periodic-table/crystals/calcite.cif`: 1501 byte; SHA-256 `c289eebf84b34853da4d5531c7ab8be89d414254d27e48c189f671d7e93caeb6`.
- `assets/periodic-table/crystals/calcite.glb`: 34560 byte; SHA-256 `00998b26b9ec47167cbd4a0685f3def167d69f3775ce1f0052e1d5163d7fc7bf`.
- `assets/periodic-table/crystals/calcite.png`: 36451 byte; SHA-256 `1196a73d68282497584eea3889a3dd956ff714ac5d2202c52bf2c702110675b8`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
