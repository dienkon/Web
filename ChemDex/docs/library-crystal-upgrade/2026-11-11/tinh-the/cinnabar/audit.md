# Cinnabar — AMCSD 0012137

- Công thức bản ghi: `Hg S`; nhóm không gian `P 32 2 1`.
- Metric: `{'a': 4.145, 'b': 4.145, 'c': 9.496, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `141.29292225757538` Å³.
- 2 vị trí bất đối xứng, 6 phép đối xứng, 6 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Hg': 3, 'S': 3}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Auvray P', 'Genet F'] (1973). Affinement de la structure cristalline du cinabre a-HgS. Bulletin de la Societe Francaise de Mineralogie et de Cristallographie, 96, 218–219.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/cinnabar.json`: 3301 byte; SHA-256 `a2143bc8da12671c77ec6469c74edd51ea5fb68bf9d7c8996eb93d5df923a60a`.
- `assets/periodic-table/crystals/cinnabar.cif`: 993 byte; SHA-256 `19be65b75a3f938ed85e14ea2ed2466443f1fe770d98e85d222cd263dd2af525`.
- `assets/periodic-table/crystals/cinnabar.glb`: 26700 byte; SHA-256 `da60310c637d8f2874f5e7ee99aebaec872c360b231e4de1fcb7ba4ba08c1591`.
- `assets/periodic-table/crystals/cinnabar.png`: 33571 byte; SHA-256 `c39d7fbe4b5f13d1548b547d6b8b1b08fe643be7b8cc0f29165198fb772f8771`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
