# Celestine — AMCSD 0005112

- Công thức bản ghi: `Sr S O4`; nhóm không gian `P n m a`.
- Metric: `{'a': 8.36, 'b': 5.352, 'c': 6.858, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `306.84557376` Å³.
- 5 vị trí bất đối xứng, 8 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sr': 4, 'S': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hawthorne F C', 'Ferguson R B'] (1975). Anhydrous sulphates. I: Refinement of the crystal structure of celestite
 with an appendix on the structure of thenardite. The Canadian Mineralogist, 13, 181–187.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/celestine.json`: 8028 byte; SHA-256 `3e8208673ab2a755f90ac5e7157f7c6c363a1a1a7ff0c2ba03f1f905ca0cfc4f`.
- `assets/periodic-table/crystals/celestine.cif`: 1141 byte; SHA-256 `9bd0c0b25aa3b876d6d67a2908c5e41bef4a14d99fbd89fd444f441df31cdcfb`.
- `assets/periodic-table/crystals/celestine.glb`: 28772 byte; SHA-256 `ec7be80ddb3f1239b8c07077f95c1dcf4ac9f710f3ca243adb3e90e9f7c717e3`.
- `assets/periodic-table/crystals/celestine.png`: 58638 byte; SHA-256 `e8fcfd4d2d759b719a2b8979709bfa3abc302ee4ca2af0290084882a16d94f98`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
