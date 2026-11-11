# Ruthenium — AMCSD 0011191

- Công thức bản ghi: `Ru`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.70389, 'b': 2.70389, 'c': 4.28168, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `27.109585490301882` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ru': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Hexagonal closest packed, hcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ru.json`: 2518 byte; SHA-256 `3a5127ca342f5aa74236ecfe39c9ced6c455cf97bc0ed92943b38ea910ed8959`.
- `assets/periodic-table/crystals/nguyen-to-ru.cif`: 1158 byte; SHA-256 `12cbc3712981d4cd603d3ef280b4811220856c02ddc4afe125644c6d641ba893`.
- `assets/periodic-table/crystals/nguyen-to-ru.glb`: 24584 byte; SHA-256 `66ff08fff64bf28a5992116a95eae2aafdde29d67a7ae5a1b3f2f10100392b68`.
- `assets/periodic-table/crystals/nguyen-to-ru.png`: 40148 byte; SHA-256 `dc7f0409cfe637f9f1c3eacc7d4977e07b3bcb93dec7556e7c5f3947f4db3101`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
