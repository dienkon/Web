# Boron — AMCSD 0009230

- Công thức bản ghi: `B`; nhóm không gian `R -3 m`.
- Metric: `{'a': 4.908, 'b': 4.908, 'c': 12.567, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `262.16297388490034` Å³.
- 2 vị trí bất đối xứng, 36 phép đối xứng, 36 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'B': 36}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Dạng alpha boron rhombohedral trong bản ghi; không đại diện mọi dạng thù hình của boron.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Kasper J S', 'Decker B F'] (1959). The crystal structure of a simple rhombohedral form of boron. Acta Crystallographica, 12, 503–506.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-b.json`: 11535 byte; SHA-256 `7f5ea40524497b6b8a6c4a4c16201df12dad97c14128a5fbafe59a6dbaf58125`.
- `assets/periodic-table/crystals/nguyen-to-b.cif`: 1457 byte; SHA-256 `308e880379754cef0b2a77793a5077dca3bf823a3ea1e9423c8a985b110e587c`.
- `assets/periodic-table/crystals/nguyen-to-b.glb`: 32128 byte; SHA-256 `8158bc501874bc311237144118ef834b7741e901ef59c9a01526e57e7977fc0d`.
- `assets/periodic-table/crystals/nguyen-to-b.png`: 43074 byte; SHA-256 `19ee4092d3a6659b4bc375ca60a4ac230074fd8142fab7d92c084e80f056f048`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
