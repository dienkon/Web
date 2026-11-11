# Holmium — AMCSD 0009176

- Công thức bản ghi: `Ho`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.5773, 'b': 3.5773, 'c': 5.6158, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `62.237621811845294` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ho': 2}`.
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
 Note: sample 99.4% pure. Acta Crystallographica, 9, 559–563.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ho.json`: 2585 byte; SHA-256 `fec4f43077276c8d1dda10a8fa79f2b471947556781c25e0822569933c0928bc`.
- `assets/periodic-table/crystals/nguyen-to-ho.cif`: 1212 byte; SHA-256 `16a391aca3070abf9573dd8e49e34a14a2318e7ccdb59c07fa13a51d09845859`.
- `assets/periodic-table/crystals/nguyen-to-ho.glb`: 24672 byte; SHA-256 `2d25043ee1efe792329a38de4aded9403243d3858430143d45313ca855872479`.
- `assets/periodic-table/crystals/nguyen-to-ho.png`: 36584 byte; SHA-256 `a257372216f2e2789bd42b0de767bb8d1f1263c2d2270ea2420ac828e693b588`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
