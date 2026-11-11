# Rubidium — AMCSD 0012170

- Công thức bản ghi: `Rb`; nhóm không gian `I m 3 m`.
- Metric: `{'a': 5.7, 'b': 5.7, 'c': 5.7, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `185.193` Å³.
- 1 vị trí bất đối xứng, 96 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Rb': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Bản ghi ghi rõ hằng số mạng ở 297 K là giá trị ước lượng; giữ nguyên ghi chú nguồn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Pearson W B', 'Kelly F M'] (1955). The rubidium transition at ~180 K
 Sample: at T = 297 K
 Note: specimen III lattice parameter for this T is estimated. Canadian Journal of Physics, 33, 17–24.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-rb.json`: 3993 byte; SHA-256 `145e0a8b48411844f2d8e9d2b644b7ff9cea101341a285b74195f4b10755c001`.
- `assets/periodic-table/crystals/nguyen-to-rb.cif`: 2123 byte; SHA-256 `771d8acb576ef9a63e28ed681fc45d7ad0fff9b762825eb258cb9f4d762d1fb7`.
- `assets/periodic-table/crystals/nguyen-to-rb.glb`: 24912 byte; SHA-256 `97e28582037e7bc7be4032b24cccc3e0b7a43ad5ae383fc1b14a832bbf09003d`.
- `assets/periodic-table/crystals/nguyen-to-rb.png`: 47408 byte; SHA-256 `1031e6a350b3b0fcee70c6ea58757209bdbdab1dcf86491f91890eeb67ca1254`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
