# Lepidolite — AMCSD 0000640

- Công thức bản ghi: `K.667 Li1.153 Al1.107 Mn.037 Si2.334 O7.004 F H1.334`; nhóm không gian `P 31 1 2`.
- Metric: `{'a': 5.2, 'b': 5.2, 'c': 29.76, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `696.8996490895374` Å³.
- 17 vị trí bất đối xứng, 6 phép đối xứng, 60 vị trí hình học trong ô.
- 21 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'K': 2.001, 'Li': 3.459, 'Al': 3.321, 'Mn': 0.111, 'Si': 7.002, 'O': 21.012, 'F': 3.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Mẫu lepidolite 3T cụ thể; nhóm mica lithium có nhiều polytype. Không áp cấu trúc 3T cho mọi mẫu lepidolite.
- Giới hạn tọa độ: Nguồn có H trong công thức nhưng không cho tọa độ H; mô hình chỉ vẽ các vị trí đã công bố.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Brown B E'] (1978). The crystal structure of a 3T lepidolite. American Mineralogist, 63, 332–336.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/lepidolite.json`: 24202 byte; SHA-256 `f9ee2599a8aa8ebc01c2eedf6e407481119da178dadc31a4005bb300fb4b9902`.
- `assets/periodic-table/crystals/lepidolite.cif`: 1473 byte; SHA-256 `3dd14a7d87600168a742e7528c763e98f623ad125cf5cc71918b6592ab1000df`.
- `assets/periodic-table/crystals/lepidolite.glb`: 263364 byte; SHA-256 `a5798735744857f274962802a9e705a378480e719db100ba3c52f2d859d9726c`.
- `assets/periodic-table/crystals/lepidolite.png`: 25927 byte; SHA-256 `9346e2817f9c7e8342217dff9077fd767c7711ae83640c5ef08309632987fbe2`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
