# Lutetium — AMCSD 0009180

- Công thức bản ghi: `Lu`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.5031, 'b': 3.5031, 'c': 5.5509, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `58.99281295024035` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Lu': 2}`.
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
 Note: sample 99.9% pure. Acta Crystallographica, 9, 559–563.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-lu.json`: 2586 byte; SHA-256 `3ebd72a77a10919393952ac03c5e79c2f0c5f92c2b9a2422527d32c860bf26a9`.
- `assets/periodic-table/crystals/nguyen-to-lu.cif`: 1212 byte; SHA-256 `2edfd25e4b80ecef684d9e0dd0d14ca81b2da2179cfb8cdb40747b4cd0d66c4f`.
- `assets/periodic-table/crystals/nguyen-to-lu.glb`: 24676 byte; SHA-256 `d8da127a6fe63e6918b8d3f644d1ee23a94d93086cee0297871c3ca995cbce92`.
- `assets/periodic-table/crystals/nguyen-to-lu.png`: 36236 byte; SHA-256 `7aae6c10deb0f123fe993f4a3d00f171bd2f7f8883d6fb5986b0406e8f7e869c`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
