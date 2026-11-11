# Tantalum — AMCSD 0011230

- Công thức bản ghi: `Ta`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.3058, 'b': 3.3058, 'c': 3.3058, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `36.126819231112` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ta': 2}`.
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
 Body centered cubic, bcc, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ta.json`: 3885 byte; SHA-256 `afe61ba3723a8f0fe5f6abe52552ae8ead377df0093a79e914dca07de9e6adbc`.
- `assets/periodic-table/crystals/nguyen-to-ta.cif`: 2094 byte; SHA-256 `6f5a8e7b10b2914a1bddaff85a166b1c377716cfdd96b435d5ffa4e66244d17c`.
- `assets/periodic-table/crystals/nguyen-to-ta.glb`: 24996 byte; SHA-256 `e318f9507603d1d8b61cd30fe9155848b7c2fa29c82ee3d6c350c134aa1fc1b3`.
- `assets/periodic-table/crystals/nguyen-to-ta.png`: 66171 byte; SHA-256 `08edbd1be07d763e5d73af6e02ab8c77f0307442149f070637e6b33844e0869e`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
