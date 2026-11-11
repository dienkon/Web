# Palladium — AMCSD 0011155

- Công thức bản ghi: `Pd`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 3.8898, 'b': 3.8898, 'c': 3.8898, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `58.85479020679201` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pd': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Cubic closest packed, ccp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-pd.json`: 6224 byte; SHA-256 `380f805fde922d2cacff2af6f9874fa5cc3d17fdb5ddea94804cf838fdda8eb0`.
- `assets/periodic-table/crystals/nguyen-to-pd.cif`: 3320 byte; SHA-256 `5fe98c0ab11eee4125689e9c070b2c11238f8f8e4bed703e5d3742f9d89e9cd2`.
- `assets/periodic-table/crystals/nguyen-to-pd.glb`: 25864 byte; SHA-256 `1caf132a461186b3042297e2a638ff67cdbd8ac3141f5a878bab39ef6f88977c`.
- `assets/periodic-table/crystals/nguyen-to-pd.png`: 71587 byte; SHA-256 `132a34eb2ed184bd6e446b1d960b8e0b1280891898a205b88f1be5441ecf0894`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
