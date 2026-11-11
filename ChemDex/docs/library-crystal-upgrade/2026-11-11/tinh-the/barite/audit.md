# Barite — AMCSD 0005144

- Công thức bản ghi: `Ba S O4`; nhóm không gian `P n m a`.
- Metric: `{'a': 8.8842, 'b': 5.4559, 'c': 7.1569, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `346.904295493782` Å³.
- 5 vị trí bất đối xứng, 8 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ba': 4, 'S': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hill R J'] (1977). A further refinement of the barite structure. The Canadian Mineralogist, 15, 522–526.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/barite.json`: 7966 byte; SHA-256 `aaa96ed85e17eead4f6f89b0253b90bd26e7a5b817812ff26705342682eca3f4`.
- `assets/periodic-table/crystals/barite.cif`: 1042 byte; SHA-256 `caec8bae5dbc5b99dd6fb546bccb85e6e98e501050b83ce82fc16b8a0cdd1406`.
- `assets/periodic-table/crystals/barite.glb`: 28640 byte; SHA-256 `761fc9d665d0f3b79460091c32fc0c9df396d77b957ccbc53dca26c703f6a6ba`.
- `assets/periodic-table/crystals/barite.png`: 55898 byte; SHA-256 `9270ad4c45482e1b8bd2e562b81ad4d9f02e2ab8b7ab698318651db70803ee36`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
