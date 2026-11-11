# Nickel — AMCSD 0013097

- Công thức bản ghi: `Ni`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.524, 'b': 3.524, 'c': 3.524, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `43.763061824` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ni': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Suh I-K', 'Ohta H', 'Waseda Y'] (1988). High-temperature thermal expansion of six metallic elements measured
 by dilatation method and X-ray diffraction
 Sample: at T = 293 K. Journal of Materials Science, 23, 757–760.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ni.json`: 6281 byte; SHA-256 `d99ae59c01577f980cd060ff36a255a16609403c2e51abd2598cc1a8200b70d0`.
- `assets/periodic-table/crystals/nguyen-to-ni.cif`: 3376 byte; SHA-256 `a9805e0a75716ddafc53ec9ef3ee7d504f5b5bdd02beb29abb3722ab7862a38a`.
- `assets/periodic-table/crystals/nguyen-to-ni.glb`: 25852 byte; SHA-256 `fbff1448344e366197ef0b4a88c9ef367490a4f7d3cbaae05d85dae352c6f1ac`.
- `assets/periodic-table/crystals/nguyen-to-ni.png`: 81245 byte; SHA-256 `e43e4b3fb0ff3bd71a14be65b65a06d7275b314dd4a7f8ac2f39fbae4ce75777`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
