# Platinum — AMCSD 0014947

- Công thức bản ghi: `Pt`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.9158, 'b': 3.9158, 'c': 3.9158, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `60.042878732312` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pt': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Owen E A', 'Yates E L'] (1933). Precision measurements of crystal parameters
 Sample: at T = 18 C
 Note: lattice parameter is mean value of 5 radiation types. Philosophical Magazine, 15, 472–488.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-pt.json`: 6269 byte; SHA-256 `23eb3e7b59f31a36d7ef7539de45ddd48da0969c4bd24e24a41850fb57a9b182`.
- `assets/periodic-table/crystals/nguyen-to-pt.cif`: 3359 byte; SHA-256 `3b16b7541745a0fb4eca0ed27ce8eba46b934d315cce6d4b7d5998a528fa1b61`.
- `assets/periodic-table/crystals/nguyen-to-pt.glb`: 25636 byte; SHA-256 `076866e75244a67da7dc9a3d9a8e53c1495b7a1b3e4190b777c936d781f37cba`.
- `assets/periodic-table/crystals/nguyen-to-pt.png`: 71489 byte; SHA-256 `f7874729932a0e7bae9419c8f04333b6fd96f85f8a20994e357253a9d6d08c4b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
