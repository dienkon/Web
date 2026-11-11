# Thorium — AMCSD 0011162

- Công thức bản ghi: `Th`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.0843, 'b': 5.0843, 'c': 5.0843, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `131.429696427107` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Th': 4}`.
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
 Cubic closest packed, ccp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-th.json`: 6227 byte; SHA-256 `f3049572227c993c798d249c2d869dc2fe9e451329cf66ac1a094fb73300ae89`.
- `assets/periodic-table/crystals/nguyen-to-th.cif`: 3318 byte; SHA-256 `13319262283a4aff0faf9776033aff854ee591c049571ac153ac1efa5eef2a7d`.
- `assets/periodic-table/crystals/nguyen-to-th.glb`: 25892 byte; SHA-256 `d5aa51873ee4c3c4c97c650219eb377c7a7f1ff17fabea546bdae30e7eaa356c`.
- `assets/periodic-table/crystals/nguyen-to-th.png`: 60927 byte; SHA-256 `66d8f8091aef134eb3070c662a9667c2375cf1e6619b497c4cacb233b3be9346`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
