# Cassiterite — AMCSD 0009162

- Công thức bản ghi: `Sn O2`; nhóm không gian `P 42/m n m`.
- Metric: `{'a': 4.737, 'b': 4.737, 'c': 3.185, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `71.468753265` Å³.
- 2 vị trí bất đối xứng, 16 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sn': 2, 'O': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Baur W H'] (1956). Uber die verfeinerung der kristallstrukturbestimmung einiger vertreter
 des rutiltyps: TiO2, SnO2, GeO2 und MgF2. Acta Crystallographica, 9, 515–520.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/cassiterite.json`: 3390 byte; SHA-256 `4871de19a35657c1e0cfa3f670d4fdaeed274dcb1b83528a10d6ca6a8be82e10`.
- `assets/periodic-table/crystals/cassiterite.cif`: 1117 byte; SHA-256 `f7b7f615c2110920c8f38b3b98573a9cb8d88cccf38fc0ca6daf29647d397112`.
- `assets/periodic-table/crystals/cassiterite.glb`: 26424 byte; SHA-256 `bbb0bad1c95be8600e52fdecbbd1ea486d147f18537fe6b4309a41026bd00cdc`.
- `assets/periodic-table/crystals/cassiterite.png`: 63468 byte; SHA-256 `9a524295e500a3292c4f7b1eb59969f6c8daa5d4fef966b9ec0102aa53a48bf1`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
