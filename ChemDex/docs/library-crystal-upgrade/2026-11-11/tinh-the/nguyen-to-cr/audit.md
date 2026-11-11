# Chromium — AMCSD 0011209

- Công thức bản ghi: `Cr`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 2.8839, 'b': 2.8839, 'c': 2.8839, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `23.985047953719004` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cr': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-cr.json`: 3891 byte; SHA-256 `ce8da7b8c142d6a8a634da10e1b4d9e495b21c57d8b43c6af48bd7111cacd7cf`.
- `assets/periodic-table/crystals/nguyen-to-cr.cif`: 2093 byte; SHA-256 `2d2fa60059a523a76bd34efc8e71b2f134c59e8b18ba02d6d50428d1009ce8dd`.
- `assets/periodic-table/crystals/nguyen-to-cr.glb`: 25028 byte; SHA-256 `78e5a0af024b1e57bc69f7775288d41abfd96916e3608975b17bec11096ebe4e`.
- `assets/periodic-table/crystals/nguyen-to-cr.png`: 72029 byte; SHA-256 `8a45d3499ddd7802a70e48c09a29cd6157d9ffd48eb5651f5a304deba9c03682`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
