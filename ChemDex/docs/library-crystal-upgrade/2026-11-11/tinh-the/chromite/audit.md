# Chromite — AMCSD 0004961

- Công thức bản ghi: `Mg.567 Mn.009 Fe.479 Al.19 Ti.004 Cr1.75 O4`; nhóm không gian `F d 3 m`.
- Metric: `{'a': 8.33273, 'b': 8.33273, 'c': 8.33273, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `578.5780183593173` Å³.
- 10 vị trí bất đối xứng, 192 phép đối xứng, 56 vị trí hình học trong ô.
- 24 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Mg': 4.536, 'Mn': 0.072, 'Fe': 3.832, 'Al': 1.52, 'Ti': 0.032, 'Cr': 14.0, 'O': 32.0}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Princivalle F', 'Logvinova A M', 'Lenaz D', 'Sobolev N V'] (2009). Structural parameters of chromite included in diamond and kimberlites
 from Siberia: A new tool for discriminating ultramafic source
 Note: sample UDK1. American Mineralogist, 94, 1067–1070.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/chromite.json`: 41767 byte; SHA-256 `7cd7d10f0b18a7be5ad123802959ceb370cc48e6ae54d72d679a5bd47885fccd`.
- `assets/periodic-table/crystals/chromite.cif`: 4273 byte; SHA-256 `ec0514f46c05a2db09ba2de77778324e6dd28e478c95174960b503e8266622af`.
- `assets/periodic-table/crystals/chromite.glb`: 194100 byte; SHA-256 `c137f56efb09c2434b6b2910be007840658bb9e5ba100a0a3681e3cc2e5ce09f`.
- `assets/periodic-table/crystals/chromite.png`: 98645 byte; SHA-256 `16ea864a9c519d82fa559506bbb00854133d50c5149f3c8506845adf63c73ef6`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
