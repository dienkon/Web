# Arsenopyrite — AMCSD 0000112

- Công thức bản ghi: `Fe As S`; nhóm không gian `P -1`.
- Metric: `{'a': 5.744, 'b': 5.675, 'c': 5.785, 'alpha': 90.0, 'beta': 112.28, 'gamma': 90.0}`; V tính lại `174.49620653383698` Å³.
- 6 vị trí bất đối xứng, 2 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Fe': 4, 'As': 4, 'S': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Morimoto N', 'Clark L A'] (1961). Arsenopyrite crystal-chemical relations
 From Freiberg, Germany. American Mineralogist, 46, 1448–1469.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/arsenopyrite.json`: 5229 byte; SHA-256 `ccb4a56e976fcfed1131939cb9414f2aa2fcd8399e8a349fec447a6d7c04ae5e`.
- `assets/periodic-table/crystals/arsenopyrite.cif`: 1015 byte; SHA-256 `77107db0f0029f785d72bd6b32f33cc099076346c45612474d5e7b84fac6ae7e`.
- `assets/periodic-table/crystals/arsenopyrite.glb`: 27664 byte; SHA-256 `a3d738b55ac583b3c002fd0853ec60be47527693da8dbaa21b0a82a9fdcafb98`.
- `assets/periodic-table/crystals/arsenopyrite.png`: 45441 byte; SHA-256 `2f33dfe21cad1685a6e4e766ca2dbc9bac75ba97ba9408d4594b7f39e2d44428`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
