# Pyrolusite — AMCSD 0011760

- Công thức bản ghi: `Mn O2`; nhóm không gian `P 42/m n m`.
- Metric: `{'a': 4.396, 'b': 4.396, 'c': 2.871, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `55.481546736` Å³.
- 2 vị trí bất đối xứng, 16 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mn': 2, 'O': 4}`.
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
 Note: beta phase of MnO2, rutile structure. Crystal Structures, 1, 239–444.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/pyrolusite.json`: 3381 byte; SHA-256 `fc4efb7834f1baeca9cc18409265652a93071feb9fa1637083ce9ea0fc445d00`.
- `assets/periodic-table/crystals/pyrolusite.cif`: 1108 byte; SHA-256 `ab2b9ce7fd0e415fada325ac74f11d852cfe8f8732fe618ca41a6992ebbbc053`.
- `assets/periodic-table/crystals/pyrolusite.glb`: 26380 byte; SHA-256 `7f9c6b8e22d26b9f63ef5c675dcb148c5fa4a2d361deaa6f6e0fe5e17e119085`.
- `assets/periodic-table/crystals/pyrolusite.png`: 65630 byte; SHA-256 `a30db9b24bfba457f2726011b6596b42a79dbf7b4edf0c7b943cc435bc74de2d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
