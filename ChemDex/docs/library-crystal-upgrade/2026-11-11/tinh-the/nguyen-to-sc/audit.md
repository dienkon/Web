# Scandium — AMCSD 0009167

- Công thức bản ghi: `Sc`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.309, 'b': 3.309, 'c': 5.2733, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `50.00421861614811` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sc': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Spedding F H', 'Daane A H', 'Herrmann K W'] (1956). The crystal structures and lattice parameters of high-purity scandium,
 yttrium and the rare earth metals
 Note: sample 99.6% pure. Acta Crystallographica, 9, 559–563.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-sc.json`: 2584 byte; SHA-256 `9f1b88465b3f6c667bab682f0e290bfe2204ef57aa77a92cc8034e61db6f8b6f`.
- `assets/periodic-table/crystals/nguyen-to-sc.cif`: 1211 byte; SHA-256 `6c8549d710b91569f3e4c150a2ec2e0fc5b337d14b1803e0ba15b422c3d7f301`.
- `assets/periodic-table/crystals/nguyen-to-sc.glb`: 24676 byte; SHA-256 `a4bbb18075a0548946e7c191935ac6e5aec9b42e4b5b1f9caaff52d96c3ecf73`.
- `assets/periodic-table/crystals/nguyen-to-sc.png`: 36609 byte; SHA-256 `fb476876dd01c457752637667ebc2c132b335b033527be71db1af820539134fb`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
