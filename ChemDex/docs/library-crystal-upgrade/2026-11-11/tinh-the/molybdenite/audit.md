# Molybdenite — AMCSD 0009788

- Công thức bản ghi: `Mo S2`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.161, 'b': 3.161, 'c': 12.295, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `106.39179996177569` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mo': 2, 'S': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Moss S C', 'Schonfeld B', 'Huang J J'] (1983). Anisotropic mean-square displacements (MSD) in single crystals
 of 2H- and 3R-MoS2
 Note: 2H polytype, this is the most common in nature. Acta Crystallographica, Section B, 39, 404–407.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/molybdenite.json`: 3751 byte; SHA-256 `eb378db2d07f9a0cfcf8248b500854b5807a5a258294711b56bee556b0ec7ebc`.
- `assets/periodic-table/crystals/molybdenite.cif`: 1265 byte; SHA-256 `86227e6f0338eab2b2a2c72a7d2403306bd3bdddc48b90a16bdd11ae4aab5263`.
- `assets/periodic-table/crystals/molybdenite.glb`: 25772 byte; SHA-256 `c7cbfea78c2c4e40fa521fa343e5ee9d968df7b680937dd0b09fdeeca5312f70`.
- `assets/periodic-table/crystals/molybdenite.png`: 23740 byte; SHA-256 `1215b933fea62384277e00aa72a59fe0b3c1d0108e64c5e6548c7e2c0516bcc2`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
