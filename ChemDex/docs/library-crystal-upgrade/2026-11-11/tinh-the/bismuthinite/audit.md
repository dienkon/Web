# Bismuthinite — AMCSD 0003562

- Công thức bản ghi: `Bi2 S3`; nhóm không gian `P n m a`.
- Metric: `{'a': 11.316, 'b': 3.9709, 'c': 11.178, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `502.28012578320005` Å³.
- 5 vị trí bất đối xứng, 8 phép đối xứng, 20 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Bi': 8, 'S': 12}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Kimata M', 'Kyono A'] (2004). Structural variations induced by difference of the inert pair effect
 in the stibnite-bismuthinite solid solution series (Sb,Bi)2S3
 Sample #1. American Mineralogist, 89, 932–940.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/bismuthinite.json`: 7174 byte; SHA-256 `36c890361644fa1003a46cd56a7a296791ba7ac254c4d70e31b6ea64d6363ab2`.
- `assets/periodic-table/crystals/bismuthinite.cif`: 1159 byte; SHA-256 `b44b81d1fa23a5d9149555d2c41d5a0e7f22743b4b0dc25f5304f92063244c06`.
- `assets/periodic-table/crystals/bismuthinite.glb`: 27872 byte; SHA-256 `4405b65236697a75d2aaf5d180901faeb1cc8b4070f7cacc42e55943b4321d5c`.
- `assets/periodic-table/crystals/bismuthinite.png`: 39987 byte; SHA-256 `538095c7e7ea929643f8cc2d4083ccbc30105aa4c76f1e5121b82b6dccfce918`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
