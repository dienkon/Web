# Acanthite — AMCSD 0010584

- Công thức bản ghi: `Ag2 S`; nhóm không gian `P 1 21/n 1`.
- Metric: `{'a': 4.23, 'b': 6.91, 'c': 7.87, 'alpha': 90.0, 'beta': 99.58, 'gamma': 90.0}`; V tính lại `226.8265723633782` Å³.
- 3 vị trí bất đối xứng, 4 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ag': 8, 'S': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Frueh A J'] (1958). The crystallography of silver sulfide, Ag2S. Zeitschrift fur Kristallographie, 110, 136–144.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/acanthite.json`: 4764 byte; SHA-256 `3a63b2d5ba8e718886017fce6671de53b048e6dcc9d261c25c2868e9ed4e35af`.
- `assets/periodic-table/crystals/acanthite.cif`: 949 byte; SHA-256 `bc0f5afa5f760375b62d67b4340488f62bb6434370ee116115fb5d0cc0f21801`.
- `assets/periodic-table/crystals/acanthite.glb`: 27004 byte; SHA-256 `d5d2de977e7ef8d669499503d18dd37e3a00caf96cfe24b1cde90b8414c70638`.
- `assets/periodic-table/crystals/acanthite.png`: 47321 byte; SHA-256 `055fc690bd6431b19194b2c55dd68bebcd1d636e287c9460a4d56084deb76c8a`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
