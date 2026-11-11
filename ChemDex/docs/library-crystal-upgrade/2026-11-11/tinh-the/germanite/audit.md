# Germanite — AMCSD 0000959

- Công thức bản ghi: `Cu13 (Ge2 Fe2) S16`; nhóm không gian `P -4 3 n`.
- Metric: `{'a': 10.5862, 'b': 10.5862, 'c': 10.5862, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `1186.370349363928` Å³.
- 8 vị trí bất đối xứng, 24 phép đối xứng, 66 vị trí hình học trong ô.
- 8 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cu': 26.0, 'Ge': 4.0, 'Fe': 4.0, 'S': 32.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Tettenhorst R T', 'Corbato C E'] (1984). Crystal structure of germanite, Cu26Ge4Fe4S32, determined by powder X-ray
 diffraction. American Mineralogist, 69, 943–947.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/germanite.json`: 20459 byte; SHA-256 `b1b5ff291baa357887de4747fdc438414e08e1a46dff9259c819a0b00d91b723`.
- `assets/periodic-table/crystals/germanite.cif`: 1369 byte; SHA-256 `a73bbb3f09e78c3ed9ec86753fbbec318bb60fcf5644f2dd87aba06e6cecd3b8`.
- `assets/periodic-table/crystals/germanite.glb`: 72616 byte; SHA-256 `90abba9f880abf47afc2c9a4cff933374b479d46c9b7479648407cb37e0df75b`.
- `assets/periodic-table/crystals/germanite.png`: 98499 byte; SHA-256 `abd88c7cc50ef3881752f9ff9e872009fdbac22ab36019bf6cd69e7f86d84354`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
