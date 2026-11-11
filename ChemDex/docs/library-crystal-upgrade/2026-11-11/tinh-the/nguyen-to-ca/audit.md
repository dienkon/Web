# Calcium — AMCSD 0013147

- Công thức bản ghi: `Ca`; nhóm không gian `F m 3 m`.
- Metric: `{'a': 5.601, 'b': 5.601, 'c': 5.601, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `175.710096801` Å³.
- 1 vị trí bất đối xứng, 192 phép đối xứng, 4 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Ca': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['King A J', 'Kanda F A', 'Schottmiller J C'] (1958). The calcium-strontium metal phase system
 Sample: at T = 25 C. Journal of Physical Chemistry, 62, 1446–1449.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-ca.json`: 6229 byte; SHA-256 `aad75874b9111234d35cce969881dbaad5e85520233a27f9b90c993ebbf5525c`.
- `assets/periodic-table/crystals/nguyen-to-ca.cif`: 3317 byte; SHA-256 `440391069dd6296c9473ade20aab258f3fb85ecca25ae852ccc1da7e2fa20b1b`.
- `assets/periodic-table/crystals/nguyen-to-ca.glb`: 25836 byte; SHA-256 `a5953f07ee569ebc80e57acb93f1731a10768f38fe7a2eb3a533cbf36a561286`.
- `assets/periodic-table/crystals/nguyen-to-ca.png`: 58144 byte; SHA-256 `d47ed10762638ec3d1e30577012a159f6f8db86b9da20f91a82557112d10d55b`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
