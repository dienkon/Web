# Gibbsite — AMCSD 0010761

- Công thức bản ghi: `Al O3 H3`; nhóm không gian `P 1 21/n 1`.
- Metric: `{'a': 8.684, 'b': 5.078, 'c': 9.736, 'alpha': 90.0, 'beta': 94.54, 'gamma': 90.0}`; V tính lại `427.9847114981603` Å³.
- 14 vị trí bất đối xứng, 4 phép đối xứng, 56 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Al': 8, 'O': 24, 'H': 24}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Saalfeld H', 'Wedde M'] (1974). Refinement of the crystal structure of gibbsite, Al(OH)3. Zeitschrift fur Kristallographie, 139, 129–135.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/gibbsite.json`: 17018 byte; SHA-256 `a7ae38d49ff5f14f4298424e1e6d3888ac5a0938f3bdec138a4a5023e48bbc3f`.
- `assets/periodic-table/crystals/gibbsite.cif`: 1291 byte; SHA-256 `ac88c56832b2c7fde4433253d32ac72471c52c987a9dfb437f8fa58afa98bf88`.
- `assets/periodic-table/crystals/gibbsite.glb`: 36572 byte; SHA-256 `8b5d2d51ba6fea5e508d65f3a7a6b84fa8f5dc243301559123e44399cdad43d9`.
- `assets/periodic-table/crystals/gibbsite.png`: 66537 byte; SHA-256 `71c93613de27a0688de5ca021688e6875cde9afa5d07d0850908801fe2e5df9e`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
