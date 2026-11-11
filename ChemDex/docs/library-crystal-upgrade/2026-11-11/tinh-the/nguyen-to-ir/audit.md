# Iridium — AMCSD 0014950

- Công thức bản ghi: `Ir`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.8312, 'b': 3.8312, 'c': 3.8312, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `56.234711587328` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ir': 4}`.
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
 Sample: at T = 18C
 Note: lattice parameter is mean value of 3 radiation types. Philosophical Magazine, 15, 472–488.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ir.json`: 6266 byte; SHA-256 `f6067d3e0e2c8a355508f77ab9329bd024c83b5a09657e3a3cd618ee43a5f625`.
- `assets/periodic-table/crystals/nguyen-to-ir.cif`: 3357 byte; SHA-256 `0579a5861a677eff97fd08afe2ef298cb5d78e9b5ba9cc94fb106d35c4530af6`.
- `assets/periodic-table/crystals/nguyen-to-ir.glb`: 25896 byte; SHA-256 `13780f36fa2ab8c9443b3294e9681f4eda6995e475d88c05d9183699a1909cfd`.
- `assets/periodic-table/crystals/nguyen-to-ir.png`: 72883 byte; SHA-256 `d029b084a770a33de53cd589ba314b0b7f9a5276b5da13865306a68498a9eff6`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
