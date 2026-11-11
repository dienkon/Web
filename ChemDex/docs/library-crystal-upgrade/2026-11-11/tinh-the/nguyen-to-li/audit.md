# Lithium — AMCSD 0011220

- Công thức bản ghi: `Li`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.5093, 'b': 3.5093, 'c': 3.5093, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `43.217683949357` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Li': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-li.json`: 3909 byte; SHA-256 `45315a773fce594b8afde2b47446c4fc7adb3fc8277623fe32db5dde23ae78b8`.
- `assets/periodic-table/crystals/nguyen-to-li.cif`: 2114 byte; SHA-256 `429e704bb519385640ae9a90bda183ee73b78fada4f365400b75d64bd3f2bfd7`.
- `assets/periodic-table/crystals/nguyen-to-li.glb`: 25040 byte; SHA-256 `f58f24396724142100cfac427d698a31079bc180ff76d13101d30be14cafdad0`.
- `assets/periodic-table/crystals/nguyen-to-li.png`: 64681 byte; SHA-256 `d34eeadef483a1cea76469bb7c26344982bb550c3f6ea117993ee913d2e6df41`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
