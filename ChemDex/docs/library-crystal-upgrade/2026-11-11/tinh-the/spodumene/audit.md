# Spodumene — AMCSD 0000355

- Công thức bản ghi: `Si2 Al Li O6`; nhóm không gian `C 1 2/c 1`.
- Metric: `{'a': 9.463, 'b': 8.392, 'c': 5.218, 'alpha': 90.0, 'beta': 110.15, 'gamma': 90.0}`; V tính lại `389.0171008599483` Å³.
- 6 vị trí bất đối xứng, 8 phép đối xứng, 40 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Si': 8, 'Al': 4, 'Li': 4, 'O': 24}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Prewitt C T', 'Cameron M', 'Papike J J', 'Sueno S'] (1973). High-temperature crystal chemistry of acmite, diopside, hedenbergite, jadeite,
 spodumene, and ureyite
 T = 24 C
 pyroxene. American Mineralogist, 58, 594–618.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/spodumene.json`: 12213 byte; SHA-256 `cee572c148ab8dcf0fd9c7cf52c3e012cfa90c421a83a650ed43802cd94acaff`.
- `assets/periodic-table/crystals/spodumene.cif`: 1195 byte; SHA-256 `a4eab72a42b9bc13a67c8d9b23364fe7abf1a74914423dbc13839ef082d4ff5f`.
- `assets/periodic-table/crystals/spodumene.glb`: 34524 byte; SHA-256 `80fc78da47afccf0fb402780366317ab292fc6d6fddbbe3005dc1b039a276dfd`.
- `assets/periodic-table/crystals/spodumene.png`: 56108 byte; SHA-256 `a16a1b49107a6b6d4e793583ee45de5f03be9afbc00c82bed992e77d60369d0b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
