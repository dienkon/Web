# Thorite — AMCSD 0009633

- Công thức bản ghi: `Th Si O4`; nhóm không gian `I 41/a m d`.
- Metric: `{'a': 7.1328, 'b': 7.1328, 'c': 6.3188, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `321.48055030579195` Å³.
- 3 vị trí bất đối xứng, 32 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Th': 4, 'Si': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Ewing R C', 'Taylor M'] (1978). The crystal structure of the ThSiO4 polymorphs: huttonite and thorite. Acta Crystallographica, Section B, 34, 1074–1079.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/thorite.json`: 8128 byte; SHA-256 `069ef000e11ace131b33d642efd49792c1b917bf03809cacb1e0fc63ece0bd55`.
- `assets/periodic-table/crystals/thorite.cif`: 1420 byte; SHA-256 `a61c9eb52ab7681fe61d1f43e7ee661aadec325e1d608fd8fa3e2461d8c7c86a`.
- `assets/periodic-table/crystals/thorite.glb`: 30192 byte; SHA-256 `0f36d6f29ee27859d53c3530a5dc169affff126a56855d122c5f34cb618c4c0f`.
- `assets/periodic-table/crystals/thorite.png`: 72918 byte; SHA-256 `2f42243c8e9714bba4e13a40acc3d0c374ab330444ffee1ed8c55e5f03bfe705`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
