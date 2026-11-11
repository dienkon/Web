# Thortveitite — AMCSD 0001160

- Công thức bản ghi: `(Sc1.12 Y.88) (Si1.96 Al.04) O7`; nhóm không gian `C 1 2/m 1`.
- Metric: `{'a': 6.65, 'b': 8.616, 'c': 4.686, 'alpha': 90.0, 'beta': 102.2, 'gamma': 90.0}`; V tính lại `262.4273028446219` Å³.
- 7 vị trí bất đối xứng, 8 phép đối xứng, 22 vị trí hình học trong ô.
- 8 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Sc': 2.24, 'Y': 1.76, 'Si': 3.92, 'Al': 0.08, 'O': 14.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Pilati T', 'Bianchi R', 'Mannucci G', 'Diella V', 'Gamaccioli C M'] (1988). A re-examination of thortveitite
 Sample 1 from Iveland. American Mineralogist, 73, 601–607.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/thortveitite.json`: 9947 byte; SHA-256 `5a300e725216bf442f9628da272f2b23408cb201d133ca3bb4c071b8c0a60193`.
- `assets/periodic-table/crystals/thortveitite.cif`: 1169 byte; SHA-256 `42e0d7c60d021d245409d33b4b70777929cf8ed586ae0f0ae86cfb7ba9061846`.
- `assets/periodic-table/crystals/thortveitite.glb`: 91360 byte; SHA-256 `140d407ae6149ed5d13956ff5c53288d2b93713f3186ebccbe399a82de8f28f7`.
- `assets/periodic-table/crystals/thortveitite.png`: 60904 byte; SHA-256 `5709efbeec1e6a83ef5da73f1cbccede3836093ec0d4e126c472bdbc138d925d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
