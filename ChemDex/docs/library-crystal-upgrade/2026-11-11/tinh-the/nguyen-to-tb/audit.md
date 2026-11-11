# Terbium — AMCSD 0009174

- Công thức bản ghi: `Tb`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 3.601, 'b': 3.601, 'c': 5.6936, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `63.93870372419551` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Tb': 2}`.
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

- `assets/periodic-table/crystals/nguyen-to-tb.json`: 2577 byte; SHA-256 `a531dd5c9720f88b9c613e34257eefe0d8f03d24dea36978dc29bb8f2af87cd7`.
- `assets/periodic-table/crystals/nguyen-to-tb.cif`: 1210 byte; SHA-256 `fd61416a5da8d38de5dd030a4299f892cae8665709e0bea6575cc99310b77455`.
- `assets/periodic-table/crystals/nguyen-to-tb.glb`: 24628 byte; SHA-256 `76a5d9f1d4e208b24d44678c99850889610ff46e04a9caf04ade7b351636d9ac`.
- `assets/periodic-table/crystals/nguyen-to-tb.png`: 35791 byte; SHA-256 `b90a22669382f6982454fb7c0e5d95495b36a6a2d59e96be03abef30271a222a`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
