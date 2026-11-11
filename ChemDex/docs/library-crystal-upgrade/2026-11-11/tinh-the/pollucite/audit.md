# Pollucite — AMCSD 0000159

- Công thức bản ghi: `(Cs.7 Na.3) (Al.99 Si2.01) O6`; nhóm không gian `I a -3 d`.
- Metric: `{'a': 13.682, 'b': 13.682, 'c': 13.682, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `2561.2310505680002` Å³.
- 5 vị trí bất đối xứng, 96 phép đối xứng, 160 vị trí hình học trong ô.
- 64 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cs': 11.2, 'Na': 4.8, 'Al': 15.84, 'Si': 32.16, 'O': 96.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Bản ghi không định vị H của nước; không tự thêm các nguyên tử H vào mô hình.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Newnham R E'] (1967). Crystal structure and optical properties of pollucite. American Mineralogist, 52, 1515–1518.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/pollucite.json`: 58447 byte; SHA-256 `b71f785d7cbed1fdaf4bb42f9a7ab1a1cd5f78a8645c48b650dd35eb73edd56a`.
- `assets/periodic-table/crystals/pollucite.cif`: 2484 byte; SHA-256 `1f49c7a64d54777f3e02135de05f2e06b3502211d071d789722b3145a3b8a6db`.
- `assets/periodic-table/crystals/pollucite.glb`: 124872 byte; SHA-256 `e09bfbf322ed3d818b0995341efdde02d7d35d6cfc8db60e950d34f9bddc94dd`.
- `assets/periodic-table/crystals/pollucite.png`: 107805 byte; SHA-256 `9d5d7de2e5890a9d0530a2143f994a576b6857474866ca38aa5b79ebcc90018f`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
