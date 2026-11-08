# Ổn định kết tủa và dạng mẫu — 2026-11-08

Các mảnh kho và hạt kết tủa là hai mô hình riêng. Thay đổi này giữ giới hạn
hiển thị của cả cảnh và xử lí vòng đời GPU khi đổi hình thái liên tục.

- Trước đây mỗi cốc nhận tối đa 900 glyph, không dùng giới hạn hạt chung của
  scene. Nay 70% `maxLiveParticles` được chia giữa các bình có kết tủa lỏng;
  phần còn lại dành cho hiệu ứng khác. Ví dụ 20 cốc ở high nhận 63 glyph/cốc
  thay vì 900/cốc. Đây là giới hạn tính toán, không phải phép đo FPS.
- Khi giảm số parcel, khối lượng được chuyển vào trọng số của các parcel
  giữ lại. Mật độ hạt, bán kính vật lí và phép tính độ đục không đổi. Cảnh quá
  đông vẫn giữ ít nhất một parcel vật lí cho mỗi loài, kể cả glyph bị ẩn.
  Sai khác quỹ đạo đại diện do lấy mẫu không được coi là đã hiệu chuẩn.
- Các InstancedMesh kết tủa/bọt/sương sở hữu buffer riêng. Bỏ `dispose={null}`
  cho phép Three/R3F thu hồi cả instanceMatrix/VAO khi thay mesh; cleanup
  geometry/material hiện có được giữ. Giới hạn viewport được đặt theo khoang
  bình để không vẽ các batch kết tủa ngoài frustum.
- Lớp cặn nằm ngang dùng mặt xoay trực tiếp thay cho dựng giao tuyến đa giác
  mỗi lần đổi lượng. Bộ dựng cặn nghiêng có kiểm tra tiến triển của chuỗi cạnh,
  loại tam giác suy biến và không xử lí lại cùng tam giác khi chia cap.
- Studio gom telemetry về tối đa 10 lần/s; thao tác chọn bình, pause, đổi tốc
  độ và thêm mẫu vẫn cập nhật ngay. Bấm lại cùng hình thái mở mẫu đang có,
  giữ nguyên inventory và phản ứng; sao bình vẫn tạo bản độc lập khi cần.
- Fe có nhãn “Bột mịn” dùng POWDER. Mạt sắt dùng mảnh ngắn; Fe (nail) dùng
  NAIL. Nhánh fallback nhận powder/dust/bột trước suy luận hình dạng kim loại.

Chế độ “Phóng đại cụm keo để quan sát” tăng riêng kích thước glyph gel/bông,
giữ tâm và co nhỏ glyph gần biên kính/mặt chất lỏng. Nó không sửa trạng thái
particle, khối lượng, bán kính vận chuyển, vận tốc lắng hay độ đục của mẫu.
Bột mịn tiếp tục hiển thị như huyền phù, không tự thành các viên lớn. Màu,
độ nhám, texture và phóng đại này là minh họa, không phải dữ liệu quang học đo.

## Kiểm chứng

`tests/precipitate_stress.test.ts` kiểm tra giới hạn tổng qua năm mức chất
lượng, 1–1.000 bình, lọc đúng inventory, giảm population không mất chất,
200 lần mở lại tám mẫu không tạo thêm chất, dạng Fe và glyph không vượt biên.
Các bài cặn nghiêng hiện có tiếp tục đối chiếu thể tích và mesh đóng cho 14
loại bình. Các phép thử này không chứng nhận tốc độ lắng thực nghiệm từng chất.

`scripts/auditPrecipitateStress.mjs` chạy giao diện Chrome: 60 lần click mẫu,
tám mẫu cùng cảnh, 40 lần đổi AgCl/Fe(OH)3, đếm createBuffer/deleteBuffer,
theo dõi mất context, kiểm tra phóng đại không sửa particle và render Fe 5 g.

Chạy đối chứng bằng `PRECIPITATE_LEAK_CONTROL=1` chỉ vô hiệu hóa dispose của
InstancedMesh trong browser thử nghiệm, tái hiện vòng đời cũ. Đối chứng ghi
tăng 45 buffer sau 40 lần đổi; đường chạy sửa ghi tăng 5 ở cùng phép thử đầu.
Đây là bằng chứng rò buffer, không phải so sánh FPS của hai phiên bản đầy đủ.
JSON và ảnh được ghi trong `artifacts/precipitate-stress`; bản mobile là giả
lập Chrome cảm ứng, không thay phép đo trên điện thoại thật.

Kiểm tra cuối: TypeScript và production build qua; 2.568 bài hồi quy cộng
một benchmark logic/physics qua. Benchmark ba bình ghi trung bình 1.86 ms và
p95 4.44 ms mỗi bước kiểm tra, không gồm GPU. Bản production đã mở mẫu 20 lần
trên mỗi viewport desktop và cảm ứng, không có pageerror/console error hay
mất WebGL context. Chế độ phóng đại được kiểm tra không sửa particle lúc pause.

Rà tiếp 94 tên thuốc thử bằng `tests/stock_label_forms.test.ts`: nhãn bột,
đinh, lá, dải, mạt và đá dạng mảnh phải khớp dạng mesh; nhãn dung dịch/khí
phải khớp pha kho. Mục CaCO3 cơ bản được ghi rõ là bột, đá vôi có mục chips
riêng. Tên Cu chung không còn ghép hai dạng phoi/lá; tên PbI2 chung không
mặc định hứa hiện tượng mưa vàng. Đường tạo tinh thể PbI2 vẫn theo lịch sử mẫu.
