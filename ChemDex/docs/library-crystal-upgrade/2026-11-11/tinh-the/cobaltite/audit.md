# Cobaltite — AMCSD 0000883

- Công thức bản ghi: `Co As S`; nhóm không gian `P c a 21`.
- Metric: `{'a': 5.592, 'b': 5.587, 'c': 5.567, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `173.92701976799998` Å³.
- 3 vị trí bất đối xứng, 4 phép đối xứng, 12 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Co': 4, 'As': 4, 'S': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Bayliss P'] (1982). A further crystal structure refinement of cobaltite. American Mineralogist, 67, 1048–1057.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/cobaltite.json`: 4766 byte; SHA-256 `0e74288a4ba3c4ede4121983f1ee892b2296b5b06f08c5fd93ee56f2dc562fcb`.
- `assets/periodic-table/crystals/cobaltite.cif`: 938 byte; SHA-256 `e508052ff912134aa7ac25dc568e859f05adc331b145c6f397e3a8981414f5e3`.
- `assets/periodic-table/crystals/cobaltite.glb`: 26884 byte; SHA-256 `8fd71274915f14fd6fdcce3b8505d14ebd3cf6bc8c90f1d09c1e7f55c5b3f56a`.
- `assets/periodic-table/crystals/cobaltite.png`: 59012 byte; SHA-256 `09266c06fbecdc3b9b6a655df75c0e2fd8d2dd3c4506eebb47a644062215fbce`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
