# Diaspore — AMCSD 0007340

- Công thức bản ghi: `Al O2 H`; nhóm không gian `P b n m`.
- Metric: `{'a': 4.4007, 'b': 9.4253, 'c': 2.8452, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `118.01297146849201` Å³.
- 4 vị trí bất đối xứng, 8 phép đối xứng, 16 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Al': 4, 'O': 8, 'H': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Hill R J'] (1979). Crystal structure refinement and electron density distribution in diaspore
 Sample: Neutral atom refinement. Physics and Chemistry of Minerals, 5, 179–200.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/diaspore.json`: 6015 byte; SHA-256 `934bcea638decae58ffea12f66a7938d861aa8132676332716c848c2af36575e`.
- `assets/periodic-table/crystals/diaspore.cif`: 1100 byte; SHA-256 `d140d246d4cb931aeed18a0583c504fa9e80f3fc62a0b9ef8160c42750b6a44c`.
- `assets/periodic-table/crystals/diaspore.glb`: 27332 byte; SHA-256 `42758f98857683fe7b6e0196f042f23969da2ca42b777c1b2483d356aba541f1`.
- `assets/periodic-table/crystals/diaspore.png`: 36251 byte; SHA-256 `dab8c0be31bb7bc7406b5886190fedad286a8107cf22a42806b7ab5e61069f1d`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
