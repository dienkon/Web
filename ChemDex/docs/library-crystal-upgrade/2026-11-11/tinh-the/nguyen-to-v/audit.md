# Vanadium — AMCSD 0014111

- Công thức bản ghi: `V`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.0241, 'b': 3.0241, 'c': 3.0241, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `27.655941287520996` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'V': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Straumanis M E', 'James W J'] (1960). Lattice parameter and expansion coefficient of vanadium
 Sample: at T = 25C. Journal of the Electrochemical Society, 107, 69–69.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-v.json`: 3901 byte; SHA-256 `b09b841b476e949a1d07a3f5277bf233a83c14bc1cda4e5b2aa30e840f7978d6`.
- `assets/periodic-table/crystals/nguyen-to-v.cif`: 2105 byte; SHA-256 `ff7c48ee21ea95440235aafb1e7a6445092a0d8af2a4e86e4b2bfe5df9e50926`.
- `assets/periodic-table/crystals/nguyen-to-v.glb`: 24744 byte; SHA-256 `cf6d616c1e8e2e242aaf9edf9700609535b28155f2c40c542f2da8935262d125`.
- `assets/periodic-table/crystals/nguyen-to-v.png`: 69405 byte; SHA-256 `be4f02c24060059322b93b2ccfb8f5a8c940aac9d8238cb8e0bd445b6dd03a77`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
