# Tantalite-(Mn) — AMCSD 0018628

- Công thức bản ghi: `Mn.88 Fe.09 (Ta1.72 Nb.28) O6`; nhóm không gian `P b c n`.
- Metric: `{'a': 14.3196, 'b': 5.7413, 'c': 5.0624, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `416.195696055552` Å³.
- 7 vị trí bất đối xứng, 8 phép đối xứng, 36 vị trí hình học trong ô.
- 12 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mn': 3.52, 'Fe': 0.36, 'Ta': 6.88, 'Nb': 1.12, 'O': 24.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Dùng mẫu tantalite-(Mn) có công thức đo Mn0.88Fe0.09(Ta1.72Nb0.28)O6; không gán tọa độ này cho tantalite-(Fe).
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['dos Santos C A', 'Zawislak L I', 'Kinast E J', 'Antonietti V', 'da Cunha J B M'] (2001). Crystal chemistry and structure of the orthorhombic
 (Fe,Mn)(Ta,Nb)2O6 family of compounds
 Note: Sample Mn0.88Fe0.09Ta1.72Nb0.28O6. Brazilian Journal of Physics, 31, 616–631.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/tantalite.json`: 14493 byte; SHA-256 `24a6b839ed793e4d48fe2af6ff756b1d08bc0f2ad6e5b2b2a8cb4f827dbab769`.
- `assets/periodic-table/crystals/tantalite.cif`: 1286 byte; SHA-256 `00779afc5d677d7bd6ba47d9a5ae7d945efca3337ca44513bbeee7b4da15654b`.
- `assets/periodic-table/crystals/tantalite.glb`: 112844 byte; SHA-256 `495eac346d92b020da73530c8c208aa66cdbd8cdf108ba1c9ac4c090b360a1ed`.
- `assets/periodic-table/crystals/tantalite.png`: 38077 byte; SHA-256 `cd781447940718ca09dc994334baa0092d55f79587922b5143f3456f5996bbb2`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
