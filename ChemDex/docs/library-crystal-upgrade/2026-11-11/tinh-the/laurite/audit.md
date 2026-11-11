# Laurite — AMCSD 0010195

- Công thức bản ghi: `Ru S2`; nhóm không gian `P a 3`.
- Metric: `{'a': 5.6106, 'b': 5.6106, 'c': 5.6106, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `176.61513683901597` Å³.
- 2 vị trí bất đối xứng, 24 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ru': 4, 'S': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Lutz H D', 'Muller B', 'Schmidt T', 'Stingl T'] (1990). Structure refinement of pyrite-type ruthenium disulfide, RuS2,
 and ruthenium diselenide, RuSe2. Acta Crystallographica, Section C, 46, 2003–2005.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/laurite.json`: 5073 byte; SHA-256 `f99fa442363eff3682cfbb56a1c03f5b4e8d6ac5aaf7ef24c67e88b5691a9484`.
- `assets/periodic-table/crystals/laurite.cif`: 1252 byte; SHA-256 `51fc42e7ea3eeb4457bed0c28fb1539cce676242a1e8fd50d383da0753ed9ef0`.
- `assets/periodic-table/crystals/laurite.glb`: 27832 byte; SHA-256 `c88438057a92b8682f66bdf2c2e47432bb2b67fbf7b5e250cbe33a956f7a63bc`.
- `assets/periodic-table/crystals/laurite.png`: 71201 byte; SHA-256 `e40f24b35018e2cbad7e1a568bd3bb27f21f4eeeab3b59484330a605473983e1`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
