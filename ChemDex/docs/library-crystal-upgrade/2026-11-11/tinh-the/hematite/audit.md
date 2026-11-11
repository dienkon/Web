# Hematite — AMCSD 0000143

- Công thức bản ghi: `Fe2 O3`; nhóm không gian `R -3 c`.
- Metric: `{'a': 5.038, 'b': 5.038, 'c': 13.772, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `302.7219916764188` Å³.
- 2 vị trí bất đối xứng, 36 phép đối xứng, 30 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Fe': 12, 'O': 18}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Zoltai T', 'Finger L W', 'Blake R L', 'Hessevick R E'] (1966). Refinement of the hematite structure. American Mineralogist, 51, 123–129.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/hematite.json`: 9861 byte; SHA-256 `14271d716a19811ead139180a76477ee08d6e2952969f7cbd1ba3f61ec8166f7`.
- `assets/periodic-table/crystals/hematite.cif`: 1469 byte; SHA-256 `940265f1e90b6fc64ea62a60fd285dc46fa3ca4de227bd038d39d8724013d810`.
- `assets/periodic-table/crystals/hematite.glb`: 33776 byte; SHA-256 `644fbdf682adbb4dd09ee115e72f421af6492ae456efe1a012bd358cd8f5d1e3`.
- `assets/periodic-table/crystals/hematite.png`: 45328 byte; SHA-256 `4900805553908f122b7899184397f653f194876937877d50af369a96c1d805be`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
