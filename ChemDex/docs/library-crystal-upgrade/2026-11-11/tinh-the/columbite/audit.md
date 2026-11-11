# Columbite-(Fe) — AMCSD 0001436

- Công thức bản ghi: `(Nb.5 Ta.167 Fe.333) O2`; nhóm không gian `P b c n`.
- Metric: `{'a': 14.221, 'b': 5.727, 'c': 5.102, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `415.52558903400006` Å³.
- 9 vị trí bất đối xứng, 8 phép đối xứng, 36 vị trí hình học trong ô.
- 12 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Nb': 5.996, 'Ta': 2.004, 'Fe': 4.0, 'O': 24.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Armbruster T', 'Wenger M', 'Geiger C A'] (1991). Cation distribution in partially ordered columbite from the Kings Mountain
 pegmatite, North Carolina
 SAMPLE ncp1, T = 293 K. American Mineralogist, 76, 1897–1904.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/columbite.json`: 17556 byte; SHA-256 `c2d2f827828056e18fcfcb2ab2ea0339d94837b10b571894286c4264a5dce7fe`.
- `assets/periodic-table/crystals/columbite.cif`: 1303 byte; SHA-256 `dbf6e2834aa63f99354712ee7f0dec182bafb88645272725481dc656442ec10f`.
- `assets/periodic-table/crystals/columbite.glb`: 122552 byte; SHA-256 `79b4ff84ad98d62a65ead7a4bbfb45ba298d062ca1de2eea75846a8690849375`.
- `assets/periodic-table/crystals/columbite.png`: 38497 byte; SHA-256 `1b704849dbd104120db9a52178c1465d823c6aedc215040b25e47e0af2977afd`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
