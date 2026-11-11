# Strontium — AMCSD 0013142

- Công thức bản ghi: `Sr`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 6.076, 'b': 6.076, 'c': 6.076, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `224.31240697599998` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sr': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hirst R G', 'King A J', 'Kanda F A'] (1956). The barium-strontium equilibrium system
 Sample: at T = 25 C
 note: known as alpha-strontium. Journal of Physical Chemistry, 60, 302–304.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-sr.json`: 6255 byte; SHA-256 `370eaf331eb20d6736da4cf6f7f081c9bdcff3634263f46b0fd64e59262ca7a2`.
- `assets/periodic-table/crystals/nguyen-to-sr.cif`: 3343 byte; SHA-256 `c502e3c0c31c85864c373059d28843e4f654f2794c4474790cb81bd85d804d49`.
- `assets/periodic-table/crystals/nguyen-to-sr.glb`: 25828 byte; SHA-256 `e7bcb53cecd09710ff331c7b13a4d8b06a48340d6033986008ca323ff276bcda`.
- `assets/periodic-table/crystals/nguyen-to-sr.png`: 54062 byte; SHA-256 `214ab52712e55ce0e92eba958dbcecca9b1e15512d8f1dcdbecbbb79617cb784`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
