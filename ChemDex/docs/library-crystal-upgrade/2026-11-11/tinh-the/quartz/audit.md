# Quartz — AMCSD 0000789

- Công thức bản ghi: `Si O2`; nhóm không gian `P 32 2 1`.
- Metric: `{'a': 4.916, 'b': 4.916, 'c': 5.4054, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `113.13115406160388` Å³.
- 2 vị trí bất đối xứng, 6 phép đối xứng, 9 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Si': 3, 'O': 6}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Prewitt C T', 'Weidner D J', 'Levien L'] (1980). Structure and elastic properties of quartz at pressure
 P = 1 atm. American Mineralogist, 65, 920–930.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/quartz.json`: 4017 byte; SHA-256 `e0e3326b83668f63da773226c0deab7ce240292e42b7fe4e540a491e473643dc`.
- `assets/periodic-table/crystals/quartz.cif`: 968 byte; SHA-256 `d71875995452ded7c7bf8451bac037e02e3f2e3f93d447d48053e34fa341b73b`.
- `assets/periodic-table/crystals/quartz.glb`: 27136 byte; SHA-256 `4a397dddbe9da194cfd576814ff9950f7ee0c487336fc8ace69eb980f5970b76`.
- `assets/periodic-table/crystals/quartz.png`: 48114 byte; SHA-256 `6b367e2a6642c81c2f07d6c8daa67c80fe6676d1cb1ecbf8ceabee32f4ebe6b5`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
