# Samarium — AMCSD 0009181

- Công thức bản ghi: `Sm`; nhóm không gian `R -3 m`.
- Metric: `{'a': 8.996, 'b': 8.996, 'c': 8.996, 'alpha': 23.22, 'beta': 23.22, 'gamma': 23.22}`; V tính lại `99.3461774792358` Å³.
- 2 vị trí bất đối xứng, 12 phép đối xứng, 3 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sm': 3}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Rundle R E', 'Smith H G', 'Spedding F H', 'Daane A H'] (1954). The crystal structure of samarium
 Note: sample 99% pure. Acta Crystallographica, 7, 532–535.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-sm.json`: 2675 byte; SHA-256 `0a02d7c2ac4d7cc2c75c4da451ff15aa9290a9292581527f9033a8cd0fac29cd`.
- `assets/periodic-table/crystals/nguyen-to-sm.cif`: 999 byte; SHA-256 `527e697379b000d3d7b3e598c9f1abffb30200c12a0a08fff7fd8b658ff280bc`.
- `assets/periodic-table/crystals/nguyen-to-sm.glb`: 26672 byte; SHA-256 `72da537ce65560f3ffaf12593c3ae3015f2014ec3c1daa2cd5fdd4673f340abf`.
- `assets/periodic-table/crystals/nguyen-to-sm.png`: 15499 byte; SHA-256 `434c08d111f26adc10aecd44706ae9c5e300e4611dc484275772d95ea67b263b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
