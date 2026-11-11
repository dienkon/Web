# Zircon — AMCSD 0000697

- Công thức bản ghi: `Zr Si O4`; nhóm không gian `I 41/a m d`.
- Metric: `{'a': 6.6042, 'b': 6.6042, 'c': 5.9796, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `260.80299050414396` Å³.
- 3 vị trí bất đối xứng, 32 phép đối xứng, 24 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Zr': 4, 'Si': 4, 'O': 16}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Finger L W', 'Hazen R M'] (1979). Crystal structure and compressibility of zircon at high pressure
 crystal No. 1, 1 atm - before P. American Mineralogist, 64, 196–201.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/zircon.json`: 8125 byte; SHA-256 `0d902c762b70355d7985509c6c6793cdb9727e040cc53be215af124203a7d235`.
- `assets/periodic-table/crystals/zircon.cif`: 1438 byte; SHA-256 `cd34b37ab6cd3fd92f92b61ae4a8d608b2cb2b24b9382b0c233380f3336db35b`.
- `assets/periodic-table/crystals/zircon.glb`: 30204 byte; SHA-256 `42527699787c2b7a3f4c165b43492b39cdcb70ffb0c67be672237365b2b779f3`.
- `assets/periodic-table/crystals/zircon.png`: 77264 byte; SHA-256 `61acb5eedbe51e3d125d5e4e293620157f42085a490f77a3d89e718db36a9ddd`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
