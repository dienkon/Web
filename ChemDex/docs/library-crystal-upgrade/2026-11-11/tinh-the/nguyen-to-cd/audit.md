# Cadmium — AMCSD 0012941

- Công thức bản ghi: `Cd`; nhóm không gian `P 63/m m c`.
- Metric: `{'a': 2.9731, 'b': 2.9731, 'c': 5.6069, 'alpha': 90.0, 'beta': 90.0, 'gamma': 120.0}`; V tính lại `42.92126131548668` Å³.
- 1 vị trí bất đối xứng, 24 phép đối xứng, 2 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Cd': 2}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Jette E R', 'Foote F'] (1935). Precision determination of lattice constants
 Sample: at T = 25 C
 Note: lattice parameter is average of two samples. Journal of Chemical Physics, 3, 605–616.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/nguyen-to-cd.json`: 2549 byte; SHA-256 `07d2a1c2e0841872a0a7dfadf3ecc513b695adc8bdaa315f2530834393c3b76c`.
- `assets/periodic-table/crystals/nguyen-to-cd.cif`: 1183 byte; SHA-256 `10ffc28ce7dbf2af70d5d5f443f129877991b1f2b71dc082402c7d5bf38b82df`.
- `assets/periodic-table/crystals/nguyen-to-cd.glb`: 24668 byte; SHA-256 `3b52be99e861b4e662d1af341a8efa254fcca8962ff96b1b15202e914dd10464`.
- `assets/periodic-table/crystals/nguyen-to-cd.png`: 34557 byte; SHA-256 `7c0748426eac4359ccc792c165b88609b8fac551372df065f5bd36433e10e9ed`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
