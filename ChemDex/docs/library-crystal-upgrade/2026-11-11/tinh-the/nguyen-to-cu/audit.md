# Copper — AMCSD 0013087

- Công thức bản ghi: `Cu`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.613, 'b': 3.613, 'c': 3.613, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `47.163267397` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cu': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Suh I-K', 'Ohta H', 'Waseda Y'] (1988). High-temperature thermal expansion of six metallic elements measured
 by dilatation method and X-ray diffraction
 Sample: at T = 293 K. Journal of Materials Science, 23, 757–760.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-cu.json`: 6286 byte; SHA-256 `e9af7ae539cb16c119daa407a86b73e646da59154fbbac6213aae4343aaa4104`.
- `assets/periodic-table/crystals/nguyen-to-cu.cif`: 3376 byte; SHA-256 `1639fc7f770ea750498727347729daba3fe875e77b1cd771e8e0aa8ade82f16d`.
- `assets/periodic-table/crystals/nguyen-to-cu.glb`: 25884 byte; SHA-256 `ae93f692b5ddf6fe1fc5c575aecd4b9fbd6743d7c9179ee33658b42fbf836760`.
- `assets/periodic-table/crystals/nguyen-to-cu.png`: 80970 byte; SHA-256 `af2b485b64d94895b85b05a78454d53720f216ebbc54388de61ac42f02d47aa0`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
