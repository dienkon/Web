# Borax — AMCSD 0009647

- Công thức bản ghi: `Na2 B4 O17 H20`; nhóm không gian `C 1 2/c 1`.
- Metric: `{'a': 11.885, 'b': 10.654, 'c': 12.206, 'alpha': 90.0, 'beta': 106.623, 'gamma': 90.0}`; V tính lại `1480.9655376624685` Å³.
- 23 vị trí bất đối xứng, 8 phép đối xứng, 172 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Na': 8, 'B': 16, 'O': 68, 'H': 80}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Levy H', 'Lisensky G'] (1978). Crystal structures of sodium sulfate decahydrate (Glauber's salt) and sodium
 tetraborate decahydrate (borax). Redetermination by neutron diffraction
 Note: anisoU's from ICSD. Acta Crystallographica, Section B, 34, 3502–3510.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/borax.json`: 46539 byte; SHA-256 `bf755d6d69fcdcaf9bc8a9abf1293f56893735e8dde0d3e19b18112fb80d379a`.
- `assets/periodic-table/crystals/borax.cif`: 1701 byte; SHA-256 `545e8522b1aad261ae7677f721d5d5f4aebce6a741a879b935b1be8adb2f3603`.
- `assets/periodic-table/crystals/borax.glb`: 64280 byte; SHA-256 `ede87173dddafdaefef86e8198db92ff10e064a571d61d677b83db19c764b5c9`.
- `assets/periodic-table/crystals/borax.png`: 89834 byte; SHA-256 `5838a885c418ec8af655951339ed5ca7838b3ba4f9f2c347fbe154d7927d3d0d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
