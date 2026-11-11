# Chalcopyrite — AMCSD 0009476

- Công thức bản ghi: `Cu Fe S2`; nhóm không gian `I -4 2 d`.
- Metric: `{'a': 5.289, 'b': 5.289, 'c': 10.423, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `291.568009383` Å³.
- 3 vị trí bất đối xứng, 16 phép đối xứng, 16 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cu': 4, 'Fe': 4, 'S': 8}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Stewart J M', 'Hall S R'] (1973). The crystal structure refinement of chalcopyrite, CuFeS2. Acta Crystallographica, Section B, 29, 579–585.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/chalcopyrite.json`: 5833 byte; SHA-256 `17d717774a23c4c54224baa3bdcb31de29bead053665d2c37ec319105075560f`.
- `assets/periodic-table/crystals/chalcopyrite.cif`: 1125 byte; SHA-256 `30959332235b14d3474420f35abb1052b7b537c8cdc2c201746414b774ca43ff`.
- `assets/periodic-table/crystals/chalcopyrite.glb`: 29460 byte; SHA-256 `28e87801f1dd2b18de214e76ee1f4432a7cbca6a2b7e9aff4f009cee14082800`.
- `assets/periodic-table/crystals/chalcopyrite.png`: 45411 byte; SHA-256 `a5c2f0f924024bad14f03472802a402d0b1498e30055052a15de3f01c948d29b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
