# Beryl — AMCSD 0001040

- Công thức bản ghi: `Be3 Al2 Si6 O18`; nhóm không gian `P 6/m c c`.
- Metric: `{'a': 9.208, 'b': 9.208, 'c': 9.188, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `674.6557706861795` Å³.
- 5 vị trí bất đối xứng, 24 phép đối xứng, 58 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Be': 6, 'Al': 4, 'Si': 12, 'O': 36}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Finger L W', 'Hazen R M', 'Au A Y'] (1986). High-pressure crystal chemistry of beryl (Be3Al2Si6O18) and euclase (BeAlSiO4OH)
 Sample: Pressure = .001 kbar. American Mineralogist, 71, 977–984.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/beryl.json`: 16357 byte; SHA-256 `2efef58589f186d8009c4731a0937cc67d4e732671bb1ffcd9f64e7b5eeba51d`.
- `assets/periodic-table/crystals/beryl.cif`: 1287 byte; SHA-256 `f1c99a40a22f6f62b28e5be6c0a7225f71d4c5d4961f7499a2153cf4bc241b5a`.
- `assets/periodic-table/crystals/beryl.glb`: 40156 byte; SHA-256 `388e6d22c3156083603356862ac8f87bb52f2ac8be5f71dee32b744a50625b28`.
- `assets/periodic-table/crystals/beryl.png`: 61330 byte; SHA-256 `8420b1bc3772b424671b926edf3d8df23c393c55116ac511ee0898f57b4ffc03`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
