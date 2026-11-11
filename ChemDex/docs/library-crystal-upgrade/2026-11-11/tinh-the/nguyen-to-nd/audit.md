# Neodymium — AMCSD 0011204

- Công thức bản ghi: `Nd`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.6579, 'b': 3.6579, 'c': 11.7992, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `136.72465977513818` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Nd': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Wyckoff R W G'] (1963). Second edition. Interscience Publishers, New York, New York
 Double hexagonal closest packed, dhcp, structure. Crystal Structures, 1, 7–83.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-nd.json`: 3107 byte; SHA-256 `3a1a3157248a91616906bf80cc79c89c9b09b48be1185be96bd286d89f7769b5`.
- `assets/periodic-table/crystals/nguyen-to-nd.cif`: 1179 byte; SHA-256 `67262db53369e939b4d4058b92ac8679a2a2aaed9a8b6c5f6213fce4697740b4`.
- `assets/periodic-table/crystals/nguyen-to-nd.glb`: 26740 byte; SHA-256 `d543b2b7a2575d2a204fda8d88f5501f24bf81b01bea45ec66ab5bd2b56201e2`.
- `assets/periodic-table/crystals/nguyen-to-nd.png`: 27988 byte; SHA-256 `631031880d00b6a15ad0c35db8c3e6152a63b059b1fe6fc3dd39c62cab339b78`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
