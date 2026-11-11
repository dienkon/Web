# Barium — AMCSD 0013145

- Công thức bản ghi: `Ba`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 5.013, 'b': 5.013, 'c': 5.013, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `125.97753719699999` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ba': 2}`.
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
 Sample: at T = 25 C. Journal of Physical Chemistry, 60, 302–304.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ba.json`: 3891 byte; SHA-256 `b1eaf9cfadd603f0c4d93b5db418cfe6e281906936007317fec22c0535452ac5`.
- `assets/periodic-table/crystals/nguyen-to-ba.cif`: 2084 byte; SHA-256 `c7e5d729a10c73afee2abdaf07c5be8d727dbe2161f50cb79c4740a77cc4e240`.
- `assets/periodic-table/crystals/nguyen-to-ba.glb`: 24964 byte; SHA-256 `b794ad530f24bf09ee61a7683010ffdc67f5448fc8f27a812df8d22b47386575`.
- `assets/periodic-table/crystals/nguyen-to-ba.png`: 51774 byte; SHA-256 `1215526550c372722c7dd4cdbb0bd568050201bf0ffba7caf0c06691a689de93`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
