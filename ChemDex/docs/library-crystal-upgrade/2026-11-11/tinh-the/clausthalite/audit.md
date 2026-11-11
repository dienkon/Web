# Clausthalite — AMCSD 0010048

- Công thức bản ghi: `Pb Se`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 6.1213, 'b': 6.1213, 'c': 6.1213, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `229.36703119059698` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pb': 4, 'Se': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Noda Y', 'Masumoto K', 'Ohba S', 'Saito Y', 'Toriumi K', 'Iwata Y', 'Shibuya I'] (1987). Temperature dependence of atomic thermal parameters of lead chalcogenides, PbS,
 PbSe and PbTe
 Sample: T = 298 K. Acta Crystallographica, Section C, 43, 1443–1445.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/clausthalite.json`: 7413 byte; SHA-256 `c151f233c11ef9e527dae05dec23559b5d9c5b1681f562f485cc52e07fbafc5d`.
- `assets/periodic-table/crystals/clausthalite.cif`: 3439 byte; SHA-256 `b0b2e5699dec4483da40a31d53512c7ad43c56a9f23a1b4afb3b04410bae5afd`.
- `assets/periodic-table/crystals/clausthalite.glb`: 28460 byte; SHA-256 `1dea7b5437ef7ed9d690c16e7637338b4da528458d2ed30eb8cd804a3a441568`.
- `assets/periodic-table/crystals/clausthalite.png`: 74261 byte; SHA-256 `bdbea4af5e58fae4d43c51d778b88f0f87818c307f7d431d6f7a361b7f54bff9`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
