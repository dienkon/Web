# Tin — AMCSD 0011248

- Công thức bản ghi: `Sn`; nhóm không gian `I 41/a m d`.
- Metric: `{'a': 5.8197, 'b': 5.8197, 'c': 3.17488, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `107.52971891677919` Å³.
- 1 vị trí bất đối xứng, 32 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sn': 4}`.
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
 Sample known as white tin. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-sn.json`: 3101 byte; SHA-256 `591bbec5dfa485edda318ef8e3905a40e37f959ee8ceb0600a95a64c913e83e4`.
- `assets/periodic-table/crystals/nguyen-to-sn.cif`: 1305 byte; SHA-256 `afa7816f4b24c07eafb84b35155979f754a508877222c98a77439bdefb384d27`.
- `assets/periodic-table/crystals/nguyen-to-sn.glb`: 25720 byte; SHA-256 `d71bda2dc0a25a90a4ef7cd96043bd56f3d510cde8165004255958f56622e39a`.
- `assets/periodic-table/crystals/nguyen-to-sn.png`: 51105 byte; SHA-256 `177d0ad9c66cb9515f462aa9cb9a3e706a1b84a2de66a6996858982dafb609d6`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
