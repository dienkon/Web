# Calaverite — AMCSD 0009826

- Công thức bản ghi: `(Au.9 Ag.1) Te2`; nhóm không gian `C 1 2/m 1`.
- Metric: `{'a': 7.1947, 'b': 4.4146, 'c': 5.0703, 'alpha': 90.0, 'beta': 90.038, 'gamma': 90.0}`; V tính lại `161.04142678173022` Å³.
- 3 vị trí bất đối xứng, 8 phép đối xứng, 6 vị trí hình học trong ô.
- 2 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Au': 1.8, 'Ag': 0.2, 'Te': 4.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ biểu diễn cấu trúc trung bình tuần hoàn trong bản ghi CIF; không tái dựng đầy đủ điều biến bất tương xứng của calaverite.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['de Boer J L', 'Schutte W J'] (1988). Valence fluctuations in the incommensurately modulated structure of calaverite AuTe2
 Sample: T = 298 K. Acta Crystallographica, Section B, 44, 486–494.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/calaverite.json`: 4109 byte; SHA-256 `c2bce5b3d369b44b0283036056bd4614de1ec43a26ca42b0fa56d8ca524978e6`.
- `assets/periodic-table/crystals/calaverite.cif`: 1058 byte; SHA-256 `aa9684520f4ed142e48ea703f7e141cae675b3ac6ca9dff7707a6042efcc5a7c`.
- `assets/periodic-table/crystals/calaverite.glb`: 57856 byte; SHA-256 `696e3b31a39f4d5d0cce21cddcba5a87a272ade24abe5c8acfa3692392386771`.
- `assets/periodic-table/crystals/calaverite.png`: 47026 byte; SHA-256 `8a1b25cd7494112a80890fdb75c2d48fefc28e4f2ec580a59e0bd2da3b8d33e0`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
