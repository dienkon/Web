# Gold — AMCSD 0013108

- Công thức bản ghi: `Au`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 4.072, 'b': 4.072, 'c': 4.072, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `67.518581248` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Au': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Pha Au tham chiếu; không mô phỏng hợp kim Au–Ag hay hình dạng hạt vàng tự nhiên.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Suh I-K', 'Ohta H', 'Waseda Y'] (1988). High-temperature thermal expansion of six metallic elements measured
 by dilatation method and X-ray diffraction
 Sample: at T = 293 K. Journal of Materials Science, 23, 757–760.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/native-gold.json`: 6377 byte; SHA-256 `fd13d89c3f3b42faecbf29227ec0fd34d63dd1a762a9323b3782387c0b1e2d48`.
- `assets/periodic-table/crystals/native-gold.cif`: 3374 byte; SHA-256 `c0939647cde9707ac97e1e96c247eec318c24b2be8d0353f33accd61f107667e`.
- `assets/periodic-table/crystals/native-gold.glb`: 25852 byte; SHA-256 `8923bd2cfa38755d0b0f3833a55255c9972f97a0700d7c023683c1d285583224`.
- `assets/periodic-table/crystals/native-gold.png`: 73967 byte; SHA-256 `75ea7a941c7a29cd5e77fd716fe32b4a81b91a61698ebb85e12db92bf6c7c82f`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
