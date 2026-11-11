# Germanium — AMCSD 0012844

- Công thức bản ghi: `Ge`; nhóm không gian `F d 3 m`.
- Metric: `{'a': 5.65782, 'b': 5.65782, 'c': 5.65782, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `181.11206386139176` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ge': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hom T', 'Kiszenick W', 'Post B'] (1975). Accurate lattice constants from multiple reflection mesurements II.
 lattice constants of germanium, silicon and diamond
 Sample: at T = 25 C. Journal of Applied Crystallography, 8, 457–458.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ge.json`: 7796 byte; SHA-256 `7cccde831adc747f4b63d1597fe3e2a3aaa6e147e3102c52ea41aae3cfa9a47e`.
- `assets/periodic-table/crystals/nguyen-to-ge.cif`: 3938 byte; SHA-256 `d49308a9ecfac12848a0533a1928e25d4f8c6ef745f724c9f672e22756529eca`.
- `assets/periodic-table/crystals/nguyen-to-ge.glb`: 26748 byte; SHA-256 `d24dea142f89639b8bb115b945d067a6fa464db3591ee57152bfb049ae9d99be`.
- `assets/periodic-table/crystals/nguyen-to-ge.png`: 62918 byte; SHA-256 `388015fa245dff38aea412fd12cdcbfa554e078dedcd9ed4145a3bc37eb407bb`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
