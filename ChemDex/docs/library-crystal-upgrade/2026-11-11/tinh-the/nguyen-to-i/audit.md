# Iodine — AMCSD 0011273

- Công thức bản ghi: `I`; nhóm không gian `B m a b`.
- Metric: `{'a': 7.27007, 'b': 9.79344, 'c': 4.79004, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `341.04603085220566` Å³.
- 1 vị trí bất đối xứng, 16 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'I': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-i.json`: 3693 byte; SHA-256 `3defd5aa38cfffd2d081df8f3e861eae66173b021bb4128b7461d24470644982`.
- `assets/periodic-table/crystals/nguyen-to-i.cif`: 1046 byte; SHA-256 `c55d8a8bd9411eb54bd821a3d57594d1d51dc13498da2d22fa2f54f7b2f2f59e`.
- `assets/periodic-table/crystals/nguyen-to-i.glb`: 25728 byte; SHA-256 `26b9bda12b47b32f065f8e370a13c982e70d9fd8f779c86e1cb99e7c004bf3fe`.
- `assets/periodic-table/crystals/nguyen-to-i.png`: 37947 byte; SHA-256 `3f1e52c30ce8ad8b4c8d0fbc50b1b2bf851808c87d8f201cc600744347f750d6`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
