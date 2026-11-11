# Yttrium — AMCSD 0009166

- Công thức bản ghi: `Y`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.6474, 'b': 3.6474, 'c': 5.7306, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `66.02334364359373` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Y': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-y.json`: 2573 byte; SHA-256 `fa021d225d790247520902a861fcf19a05ffd7fff283aee271f1bbf95eff47d2`.
- `assets/periodic-table/crystals/nguyen-to-y.cif`: 1209 byte; SHA-256 `f45719adac3bbc6da043f016db8d315cc393cd2bbe86f801537a74ffe6213bd9`.
- `assets/periodic-table/crystals/nguyen-to-y.glb`: 24636 byte; SHA-256 `9f402b5945acfc174ccba321aaabb079e0fe63ea071d70174ceb3ec7501ea8cb`.
- `assets/periodic-table/crystals/nguyen-to-y.png`: 36298 byte; SHA-256 `eebc84605a9d2db4c26db5d99c0d5c5648e68098bd2311d36bf64a3773f10170`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
