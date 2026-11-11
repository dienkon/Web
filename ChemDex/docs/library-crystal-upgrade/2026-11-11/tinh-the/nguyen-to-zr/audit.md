# Zirconium — AMCSD 0011201

- Công thức bản ghi: `Zr`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.232, 'b': 3.232, 'c': 5.147, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `46.56155803258272` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Zr': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-zr.json`: 2505 byte; SHA-256 `000805cf7aca0116525e6cbee8c253f85125ba24842f2af7ce039ab299b3ed3c`.
- `assets/periodic-table/crystals/nguyen-to-zr.cif`: 1151 byte; SHA-256 `664c45a179ddc2e923d8e148733c009ce9e0d8f30aef37ec0074484430467c27`.
- `assets/periodic-table/crystals/nguyen-to-zr.glb`: 24588 byte; SHA-256 `ca8e96d8375076a15dcb4bf5cd4744f155d1e9b297a5d0ebaff81554d21ff392`.
- `assets/periodic-table/crystals/nguyen-to-zr.png`: 37124 byte; SHA-256 `c557d87ff4220c54e98130e9a7e020f0161029b59646d68b6168737c8f5cd4b7`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
