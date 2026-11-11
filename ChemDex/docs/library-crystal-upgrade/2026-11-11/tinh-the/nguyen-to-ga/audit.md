# Gallium — AMCSD 0010597

- Công thức bản ghi: `Ga`; nhóm không gian `C m c a`.
- Metric: `{'a': 4.523, 'b': 7.661, 'c': 4.524, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `156.75978037199997` Å³.
- 1 vị trí bất đối xứng, 16 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ga': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Sharma B D', 'Donohue J'] (1962). A refinement of the crystal structure of gallium. Zeitschrift fur Kristallographie, 117, 293–300.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ga.json`: 3706 byte; SHA-256 `c5e91bd4cdb50e5869d8d9478ecc93a36d07b4cb912cb9cd5efebb98d18e59b3`.
- `assets/periodic-table/crystals/nguyen-to-ga.cif`: 1056 byte; SHA-256 `dfbae6405bafd4f73ee52d9d44529bc38941eb31eaf8dbce8f4893a0f2171c47`.
- `assets/periodic-table/crystals/nguyen-to-ga.glb`: 25776 byte; SHA-256 `791db5f3fb5441a8e3041c44325f41353fe331219b891ee7d6d2440bb558b7bb`.
- `assets/periodic-table/crystals/nguyen-to-ga.png`: 40895 byte; SHA-256 `fac7b3b23e21640ff69b86e390ec95c382561175e5da4e284aacd76862b8fd3b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
