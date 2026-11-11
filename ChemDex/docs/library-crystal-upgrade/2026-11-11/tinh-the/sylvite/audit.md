# Sylvite — AMCSD 0003201

- Công thức bản ghi: `K Cl`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 6.2879, 'b': 6.2879, 'c': 6.2879, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `248.60901837743893` Å³.
- 2 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'K': 4, 'Cl': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Walker D', 'Clark S M', 'Verma P K', 'Cranswick L M D', 'Jones R L', 'Buhre S'] (2004). Halite-sylvite thermoelasticity
 Sample: msl515031, T = 25 C, P = 0.0 kbar, cell volume = 248.61 ang**3. American Mineralogist, 89, 204–210.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/sylvite.json`: 7359 byte; SHA-256 `7bafce8849905a8da242f6c2983866891fde6d5b064dc46f9b2974da521aa109`.
- `assets/periodic-table/crystals/sylvite.cif`: 3409 byte; SHA-256 `24c8d6661421f533cdf9ea259d00a298820577e952b1431ef1cd111a62379ef3`.
- `assets/periodic-table/crystals/sylvite.glb`: 28140 byte; SHA-256 `31698254ffb3b41a73f46476116423ce3441d1991c82eddac82f3eec0b054253`.
- `assets/periodic-table/crystals/sylvite.png`: 72884 byte; SHA-256 `a1db3c2905da9029be6f9811ca67c3bed621e5c8bbfbd5547762d16aa2d859ba`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
