# Indium — AMCSD 0014125

- Công thức bản ghi: `In`; nhóm không gian `I 4/m m m`.
- Metric: `{'a': 3.253, 'b': 3.253, 'c': 4.9455, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `52.33332550950001` Å³.
- 1 vị trí bất đối xứng, 32 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'In': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Smith J F', 'Schneider V L'] (1964). Anisotropic thermal expansion of indium
 Sample: 99.9999% indium
 Note: converted from kx units. Journal of the Less-Common Metals, 7, 17–22.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-in.json`: 2652 byte; SHA-256 `bf1ed20572d45b2efe1c8c260a19d95243c6495bd224dced60b33e4bb27112b1`.
- `assets/periodic-table/crystals/nguyen-to-in.cif`: 1302 byte; SHA-256 `fead33193e85b326e56c92250951723ff55ceacb7f1fffbf67008f8abf013116`.
- `assets/periodic-table/crystals/nguyen-to-in.glb`: 25020 byte; SHA-256 `b73ec7542b959348749c8da18817ad9cbb5f18d0b05083cb1be6b765e5851afb`.
- `assets/periodic-table/crystals/nguyen-to-in.png`: 44832 byte; SHA-256 `958967addfa5d03b6fce55707b330d17e00d4cb56de92f550d531ee47f8a411d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
