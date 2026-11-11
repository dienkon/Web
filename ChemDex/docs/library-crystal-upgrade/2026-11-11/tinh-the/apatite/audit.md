# Fluorapatite — AMCSD 0001256

- Công thức bản ghi: `Ca5 P3 O12 F`; nhóm không gian `P 63/m`.
- Metric: `{'a': 9.3973, 'b': 9.3973, 'c': 6.8782, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `526.031334117712` Å³.
- 7 vị trí bất đối xứng, 12 phép đối xứng, 42 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ca': 10, 'P': 6, 'O': 24, 'F': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hughes J M', 'Cameron M', 'Crowley K D'] (1989). Structural variations in natural F, OH, and Cl apatites. American Mineralogist, 74, 870–876.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/apatite.json`: 12762 byte; SHA-256 `2ed5b59666be139ce0c70a92e9e0899c69d3c64e18bd612e4ee261bb7710bbf9`.
- `assets/periodic-table/crystals/apatite.cif`: 1173 byte; SHA-256 `b258e530194473e448aa597c0f2a6804bf087cc8e5b117e97ce8c209084a3d32`.
- `assets/periodic-table/crystals/apatite.glb`: 34644 byte; SHA-256 `7f04f9982f7a643afac828d1671d669f8eb740588eefa256852f93a59928dc0a`.
- `assets/periodic-table/crystals/apatite.png`: 43815 byte; SHA-256 `6f530fb06d38121307ea184f59733bc06d43c6d3ee30155738b87013bbf78f8e`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
