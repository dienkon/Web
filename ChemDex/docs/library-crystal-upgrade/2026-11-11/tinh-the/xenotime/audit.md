# Xenotime-(Y) — AMCSD 0001706

- Công thức bản ghi: `Y P O4`; nhóm không gian `I 41/a m d`.
- Metric: `{'a': 6.8947, 'b': 6.8947, 'c': 6.0276, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `286.53334665128403` Å³.
- 3 vị trí bất đối xứng, 32 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Y': 4, 'P': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hughes J M', 'Mariano A N', 'Ni Y'] (1995). Crystal chemistry of the monazite and xenotime structures. American Mineralogist, 80, 21–26.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/xenotime.json`: 8156 byte; SHA-256 `f21b344b9599e3a0193207e17fd848453109691e5dcc48dc0539181a3f1c518b`.
- `assets/periodic-table/crystals/xenotime.cif`: 1407 byte; SHA-256 `3848f0b55dda18ab19588096b6e58984f66d003ebd41b9a838bd8a1e0b63d34d`.
- `assets/periodic-table/crystals/xenotime.glb`: 30044 byte; SHA-256 `e8cc6ab1260658599e103de0d2e2622e280f3983eae52d0a07f798b1ad19df9c`.
- `assets/periodic-table/crystals/xenotime.png`: 74760 byte; SHA-256 `b50d3a9e0372570b9ccc2807c43a84e985267df8ef0020f6871da666d9fc798a`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
