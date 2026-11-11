# Iron — AMCSD 0008169

- Công thức bản ghi: `Fe`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 2.8654, 'b': 2.8654, 'c': 2.8654, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `23.526415870264003` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Fe': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Zhang J', 'Guyot F'] (1999). Thermal equation of iron and Fe0.91Si0.09
 Sample: P = 0.0 GPa, T = 298 K, prior to experiment. Physics and Chemistry of Minerals, 26, 206–211.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-fe.json`: 3909 byte; SHA-256 `c3a4ed729b918bdfe0b97033dc378ddcd4942ff17cffc965d79448746cecd9f2`.
- `assets/periodic-table/crystals/nguyen-to-fe.cif`: 2108 byte; SHA-256 `daf6357ae220dc55013936f253ee2b653b771d67769716c8237ba55b62c35828`.
- `assets/periodic-table/crystals/nguyen-to-fe.glb`: 25024 byte; SHA-256 `59cec8e455f4be4c2bad14b5babe81647afc12b6b917cbaec1e8655bc6cb4563`.
- `assets/periodic-table/crystals/nguyen-to-fe.png`: 75827 byte; SHA-256 `70b12d8201444747005fdd57290079f4c60517284b5042f38250f176a0844e4c`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
