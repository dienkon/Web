# Magnesite — AMCSD 0000990

- Công thức bản ghi: `Mg C O3`; nhóm không gian `R -3 c`.
- Metric: `{'a': 4.635, 'b': 4.635, 'c': 15.019, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `279.42877443175337` Å³.
- 3 vị trí bất đối xứng, 36 phép đối xứng, 30 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mg': 6, 'C': 6, 'O': 18}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Reeder R J', 'Markgraf S A'] (1985). High-temperature structure refinements of calcite and magnesite
 Sample: T = 24 C. American Mineralogist, 70, 590–600.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/magnesite.json`: 10010 byte; SHA-256 `12820878af44da3def6550cda02e65627f48eeea78be4f97ef68e6b6605c4967`.
- `assets/periodic-table/crystals/magnesite.cif`: 1503 byte; SHA-256 `9685c03436967fcdb458f5f648ab2504ee078fb8995d89b8a91ad64d387b8f82`.
- `assets/periodic-table/crystals/magnesite.glb`: 34584 byte; SHA-256 `79dd77d077fda03d6415cfd5c93c59a85decf4d5fdbc7829f5836aa23aa321d9`.
- `assets/periodic-table/crystals/magnesite.png`: 40515 byte; SHA-256 `7aa85342d1e08829ae559690343ec307c0baedd542c48d624f6b4a6ab86ad30e`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
