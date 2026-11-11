# Vanadinite — AMCSD 0005225

- Công thức bản ghi: `Pb5 V3 O12 Cl`; nhóm không gian `P 63/m`.
- Metric: `{'a': 10.3174, 'b': 10.3174, 'c': 7.3378, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `676.452083170141` Å³.
- 7 vị trí bất đối xứng, 12 phép đối xứng, 42 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Pb': 10, 'V': 6, 'O': 24, 'Cl': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hughes J M', 'Dai Y S'] (1989). Crystal-structure refinements of vanadinite and pyromorphite. The Canadian Mineralogist, 27, 189–192.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/vanadinite.json`: 12661 byte; SHA-256 `2d44813befb9632e72f06c4c5d93c293c38cc25d6aadb0223a9a4851293c16fd`.
- `assets/periodic-table/crystals/vanadinite.cif`: 1157 byte; SHA-256 `7377fe799a1271f352eb07d1f99c9671d9f2521323e18cda78c0046062629f27`.
- `assets/periodic-table/crystals/vanadinite.glb`: 35336 byte; SHA-256 `a27169098de280a3343d99eeff773dcfb89c18cfe81dab906edb7f67e19f93e1`.
- `assets/periodic-table/crystals/vanadinite.png`: 42969 byte; SHA-256 `3c15c6e055bb0fcc4c15925fa5e95f7c888d210e72452f5cc304060e18ce3776`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
