# Galena — AMCSD 0010046

- Công thức bản ghi: `Pb S`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.9315, 'b': 5.9315, 'c': 5.9315, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `208.68613908087497` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pb': 4, 'S': 4}`.
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

- `assets/periodic-table/crystals/galena.json`: 7389 byte; SHA-256 `0021ac4caf9b8bd612faf131f159c9cf1efe29848d1eba9aa1c9f196aa0ee819`.
- `assets/periodic-table/crystals/galena.cif`: 3430 byte; SHA-256 `9533284b1f4a90f8c010b2b8f822d2dc789c45f35885ac3273ac2a8814cb83f3`.
- `assets/periodic-table/crystals/galena.glb`: 28424 byte; SHA-256 `538c212b059ac115789c33aaf39761b277d72b9967736aad29b0108683050994`.
- `assets/periodic-table/crystals/galena.png`: 76081 byte; SHA-256 `554f49219134b4bb2bea7d8dd432a08ffd347f21b989489ad04a40f14c0867c9`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
