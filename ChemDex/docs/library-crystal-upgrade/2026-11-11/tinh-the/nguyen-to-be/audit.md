# Beryllium — AMCSD 0012878

- Công thức bản ghi: `Be`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.2858, 'b': 2.2858, 'c': 3.5843, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `16.218528215582335` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Be': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Gordon P'] (1949). A high temperature precision X-ray camera: some measurements of the thermal
 coefficients of expansion of beryllium
 Sample: at T = 25 C. Journal of Applied Physics, 20, 908–917.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-be.json`: 2554 byte; SHA-256 `dfe9d9f5a4ce795aa104254ffd88f9bd69af42dd5329e35ffab10e275707c0ef`.
- `assets/periodic-table/crystals/nguyen-to-be.cif`: 1194 byte; SHA-256 `80839a623605370ff49fb869658d847f6693109be2aa86172acc9f67e94db137`.
- `assets/periodic-table/crystals/nguyen-to-be.glb`: 24648 byte; SHA-256 `006840806bff954908323d039af4bbfe9fb4b46eba9e8da1acfdc4ca22599be0`.
- `assets/periodic-table/crystals/nguyen-to-be.png`: 45215 byte; SHA-256 `4f11ca2bb0804d73247db4e8f3dd75a4b1017fde49a24013895fe68bf73b27e2`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
