# Sphalerite — AMCSD 0000110

- Công thức bản ghi: `Zn S`; nhóm không gian `F -4 3 m`.
- Metric: `{'a': 5.4093, 'b': 5.4093, 'c': 5.4093, 'alpha': 90.0, 'beta': 90.0, 'gamma': 90.0}`; V tính lại `158.278965942357` Å³.
- 2 vị trí bất đối xứng, 96 phép đối xứng, 8 vị trí hình học trong ô.
- 0 vị trí hỗn hợp; thành phần theo độ chiếm chỗ `{'Zn': 4, 'S': 4}`.
- Sơ suất trước: mô hình hình thái không chứa dữ liệu nguyên tử, các mạng đơn giản dùng kiểu mạng lý tưởng và chưa chỉ ra mẫu đo cụ thể.
- Đã sửa: dùng đủ sáu thông số ô mạng, đổi tọa độ phân số sang Cartesian bằng metric nghiêng, khai triển các phép đối xứng từ bản ghi, gộp vị trí tương đương theo dung sai và giữ nguyên độ chiếm chỗ.
- Độ chiếm chỗ: dùng phần cầu theo tỉ lệ, phần trống dùng lưới; không tự chọn ngẫu nhiên nguyên tố thay thế. Không giả định mọi vị trí là đầy.
- Không thêm liên kết từ ngưỡng khoảng cách; cầu màu và bán kính là quy ước hiển thị.
- Vị trí trên biên được lặp khi vẽ ô đóng; không đếm các bản sao đó là nguyên tử độc lập trong thống kê ô nửa mở.
- Lưu ý riêng: Chỉ áp dụng cho pha và mẫu trong trích dẫn.
- Giới hạn tọa độ: Chỉ giữ các vị trí có trong bản ghi.
- Nhiệt độ/áp suất: giữ nguyên trong ghi chú bên dưới; không tự gán điều kiện phòng nếu nguồn không ghi.

## Trích dẫn bản ghi

['Skinner B J'] (1961). Unit-cell edges of natural and synthetic sphalerites. American Mineralogist, 46, 1399–1411.

## Tệp xuất và kiểm tra

- `assets/periodic-table/crystals/sphalerite.json`: 5373 byte; SHA-256 `1f7ea1f2f525cafebfb7ae5bb2eb81ed446d91d32bc8fab25ad94c9a49a615af`.
- `assets/periodic-table/crystals/sphalerite.cif`: 2079 byte; SHA-256 `b4b3e508c766d6aa482d8c543a0d05ae3a784f25dcce2cb1fd3585bbd783d802`.
- `assets/periodic-table/crystals/sphalerite.glb`: 26664 byte; SHA-256 `7fbcad7e9538ee603bb1bb2051171e76b07f46a6e07b6c8011b8cb519263c75b`.
- `assets/periodic-table/crystals/sphalerite.png`: 66619 byte; SHA-256 `3eee4266c0c1ddfe3468d0d0b2faf472eedc439b98362423d572280244c7ea33`.

- Đã render preview bằng Chromium WebGL/Three.js; GLB và trình xem dùng cùng bộ dựng hình.
- Tái đọc toàn bộ CIF bằng parser JavaScript độc lập để đối chiếu kết quả khai triển Gemmi; kiểm tra phép đối xứng bảo toàn metric.
- Đây là cấu trúc nguyên tử tuần hoàn; hình thái thật của một mẫu quặng riêng cần dữ liệu quét bề mặt, không suy ra từ CIF.
