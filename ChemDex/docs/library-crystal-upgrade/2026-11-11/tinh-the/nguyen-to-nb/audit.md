# Niobium — AMCSD 0011224

- Công thức bản ghi: `Nb`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 3.3004, 'b': 3.3004, 'c': 3.3004, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `35.950069584063996` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Nb': 2}`.
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
 Body centered cubic, bcc, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-nb.json`: 3887 byte; SHA-256 `835daf811fb258436c9f09c2e7859c70bd4e5cc49872b57e2d79c3e9d6e77bef`.
- `assets/periodic-table/crystals/nguyen-to-nb.cif`: 2093 byte; SHA-256 `8bf57d645e80b4798c4e1aa3aaa235f51b23e3df93f7871fd4b54401feed50d7`.
- `assets/periodic-table/crystals/nguyen-to-nb.glb`: 24996 byte; SHA-256 `4528308cb70c721d1f53b51c52db73b29f5c9542cb2c97781e2c604b4e0cc413`.
- `assets/periodic-table/crystals/nguyen-to-nb.png`: 65576 byte; SHA-256 `5c20b93c24d38d6ce768a8d6217e742c494651635e3d879b5c7ef4574f750c38`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
