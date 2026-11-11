# Pentlandite — AMCSD 0000437

- Công thức bản ghi: `Fe3.969 Ni4.842 Co.072 S8`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 10.038, 'b': 10.038, 'c': 10.038, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `1011.4433748720002` Å³.
- 8 vị trí bất đối xứng, 192 phép đối xứng, 68 vị trí hình học trong ô.
- 36 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Fe': 15.876, 'Ni': 19.368, 'Co': 0.288, 'S': 32.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Prewitt C T', 'Rajamani V'] (1975). Thermal expansion of the pentlandite structure
 Frood, at 24 deg C. American Mineralogist, 60, 39–48.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/pentlandite.json`: 40050 byte; SHA-256 `a35294632c9deea6b975667df5edcc5a3fc13a26662ddde02ca5c45448d6e6b4`.
- `assets/periodic-table/crystals/pentlandite.cif`: 3543 byte; SHA-256 `dc26c4f8fe24a3f5b217a2ebcddf430c4afe729e02d29325e746784dddb91847`.
- `assets/periodic-table/crystals/pentlandite.glb`: 136536 byte; SHA-256 `6b2cfdc42f3741190e9b846fcd260e4a47f492565ae6ff325da78d9955c10548`.
- `assets/periodic-table/crystals/pentlandite.png`: 109566 byte; SHA-256 `a6b9f70f1bdd936e20f8f177abceafbfa0a26689b64e9f1b3d15abf2fd508493`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
