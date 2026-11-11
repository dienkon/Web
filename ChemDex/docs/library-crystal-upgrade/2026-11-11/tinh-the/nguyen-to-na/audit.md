# Sodium — AMCSD 0011223

- Công thức bản ghi: `Na`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 4.2906, 'b': 4.2906, 'c': 4.2906, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `78.98672101341602` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Na': 2}`.
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
 Sample at T = 293 K
 Body centered cubic, bcc, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-na.json`: 3908 byte; SHA-256 `ad21a2de5829a1c52b44fa0850847b9b60675d5e51060796186427101841147f`.
- `assets/periodic-table/crystals/nguyen-to-na.cif`: 2112 byte; SHA-256 `512d8c7bfb2da448e0c848c718db128002fdd11e301a1cb5770a20f0fc99d4e2`.
- `assets/periodic-table/crystals/nguyen-to-na.glb`: 25028 byte; SHA-256 `29fc9e7711de84e50296d1b81995f67883ffbd461ffbe7de770b4d76dd4c5f0a`.
- `assets/periodic-table/crystals/nguyen-to-na.png`: 57749 byte; SHA-256 `387e8cef472ac75917b8a7199a97bc811f77a6922347f57f8363aad33523e5d9`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
