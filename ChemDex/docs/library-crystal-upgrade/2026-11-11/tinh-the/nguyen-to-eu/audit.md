# Europium — AMCSD 0009172

- Công thức bản ghi: `Eu`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 4.606, 'b': 4.606, 'c': 4.606, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `97.71737701599999` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Eu': 2}`.
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
 Note: sample 98-99% pure. Acta Crystallographica, 9, 559–563.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-eu.json`: 3959 byte; SHA-256 `30c872220b4b093fabb05cd8519963377a803231551c9869d88bd438755d4550`.
- `assets/periodic-table/crystals/nguyen-to-eu.cif`: 2155 byte; SHA-256 `3b4e906df654a2b52a76990c1b9cfa694b8484d572c0af9751305802133c9173`.
- `assets/periodic-table/crystals/nguyen-to-eu.glb`: 25024 byte; SHA-256 `560d38cb6ef156aa574e5557e417fbd7aa9fd664af683fe4eaf84e1445b06d18`.
- `assets/periodic-table/crystals/nguyen-to-eu.png`: 54037 byte; SHA-256 `58aff180e5eff0fd06dcad93e31c124f13132fdaee70388333b87157394736e4`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
