# Rutile — AMCSD 0001736

- Công thức bản ghi: `Ti.91 Al.08 Nb.01 Cr.01 O2`; nhóm không gian `P 42/m n m`.
- Metric: `{'a': 4.594, 'b': 4.594, 'c': 2.9586, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `62.44076778960001` Å³.
- 5 vị trí bất đối xứng, 16 phép đối xứng, 6 vị trí hình học trong ô.
- 2 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ti': 1.82, 'Al': 0.16, 'Nb': 0.02, 'Cr': 0.02, 'O': 4.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Smyth J R', 'Swope R J', 'Larson A C'] (1995). H in rutile-type compounds: I. Single-crystal neutron and X-ray diffraction
 study of H in rutile
 Sample: X-ray; natural, T = 300 K. American Mineralogist, 80, 448–453.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/rutile.json`: 5344 byte; SHA-256 `288d57f2b18f5f95851e6caea1cc6cd3738461771016d66c1bf1bb31e4698e79`.
- `assets/periodic-table/crystals/rutile.cif`: 1238 byte; SHA-256 `f14bdcb198d87ec90ad5418388ecff81ec647e3deb7b4f931ce678897e71968b`.
- `assets/periodic-table/crystals/rutile.glb`: 72036 byte; SHA-256 `ae9385b7dbbb6b844c0bc2801135021b094cfb5f381e27da834f167d8dc4ea89`.
- `assets/periodic-table/crystals/rutile.png`: 63781 byte; SHA-256 `25cab6a4197260490e80664c49b7ee855f4c74e4f5fec72e5f2dc5abfae185fa`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
