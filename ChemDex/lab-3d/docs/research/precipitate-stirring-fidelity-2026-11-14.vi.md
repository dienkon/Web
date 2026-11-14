# Kết tủa, dung dịch và đũa khuấy — 2026-11-14

## Hành vi đã sửa

- Màu dung dịch được suy ra từ pha lỏng và thuốc thử dư. Chất rắn sản phẩm có
  inventory, hình thái và màu riêng. Sửa 19 chương trình dùng màu kết tủa làm
  màu dung dịch; giữ màu iodine hòa tan trong phản ứng tạo CuI.
- Tổng hợp nhiều kết tủa theo pha và nguồn gốc, không coi chất rắn thêm sẵn
  hay cặn trên giấy lọc là kết tủa lơ lửng. Khi một sản phẩm tan, sản phẩm khác
  vẫn tồn tại. Độ đục của kết tủa đã tan không xuất hiện lại khi đổi màu.
- Hạt chạm thành nghiêng được chiếu theo pháp tuyến thành để tiếp tục trượt
  xuống. Hạt đến điểm tựa theo trọng lực chuyển khối lượng vào cặn. Lớp cặn mới
  hình thành theo hướng trọng lực tại thời điểm tạo mẫu, kể cả bình nằm ngang.
- Khuấy cuốn lượng cặn hữu hạn vào vùng trộn; phép chiếu theo mặt cặn giữ độ sâu
  vùng trộn. Không đổi kích thước vật lý hay tăng giả vận tốc lắng để tạo cảnh.
- Đám đục được dựng từ các parcel mang khối lượng, giới hạn bởi mặt chất lỏng
  và biên trong bình. Atlas 12³ cập nhật 15 lần/giây; shader lấy sáu mẫu theo tia
  nhìn để hiển thị đám kết tủa bên trong. Hạt chưa được lấy mẫu giữ phần độ đục
  khối; hạt đã lắng hết không phát sinh lại một đám đục đồng đều.
- Renderer dùng inventory thực và tra population hiện hành; kết tủa không
  phụ thuộc cờ tóm tắt cũ. Hòa tan xóa population, không giữ mesh bị bỏ rơi.
  Chia ngân sách nguyên cho từng loài và chỉ tải phần buffer đang dùng lên GPU.
- Đũa có đầu neo đúng, quỹ đạo tránh cổ bình, nâng qua miệng trước khi đổi bình.
  Chỉ truyền tác động khi đầu đũa ngập. Một đũa chỉ khuấy một bình; không khuấy
  xuyên nút đậy, khi đang kéo/rót hoặc tạm dừng. Kinetics, hòa tan và dòng xoáy
  dùng chung cường độ. Chuột ngoài canvas không truyền lực.
- Dốc trộn bình định mức kín dùng xung riêng 1,4 giây mô phỏng. Nút trên bình
  và inspector cùng hoạt ảnh; không gọi đũa khuấy qua nút đậy.

## Kiểm chứng

- Toàn bộ lab-3d: **241 file / 3.286 kiểm thử đạt** với
  `npx vitest run --maxWorkers=2 --reporter=dot`.
- `npx tsc --noEmit` và `npm run build` đạt. Build vẫn có cảnh báo kích thước
  bundle lớn hiện có; chưa xem đây là chứng nhận hiệu năng GPU.
- Rà 149 chương trình: 43 chương trình tạo chất rắn, 35 chất rắn có profile.
  Kiểm thử bao gồm không phản ứng, thuốc thử dư, nhiều sản phẩm, hòa tan và
  chất rắn thêm sẵn. Không suy rộng thành hỗ trợ mọi phản ứng hóa học.
- `node scripts/auditPrecipitateFidelity.mjs`: sáu mẫu AgCl, Cu(OH)₂, Fe(OH)₃,
  BaSO₄, PbI₂, CaCO₃ trên renderer thật; tọa độ hữu hạn, hạt chuyển động,
  khối lượng mỗi mẫu giữ 0,05 g; Pause, khuấy và hòa tan đạt. Không lỗi JS/shader.
  Đây là mẫu chất rắn cấp sẵn để kiểm tra renderer, không thay phép thử phản ứng.
- Kiểm tra thêm giao diện bàn thí nghiệm: inventory AgCl có thật nhưng
  `hasPrecipitate=false` vẫn kích hoạt hạt; loại bỏ chất rắn xóa population.
- `node scripts/auditStirringRod.mjs`: ống nghiệm hẹp, tiếp xúc dung dịch,
  dòng xoáy, chuyển vị trí bình, Pause và xung khuấy inspector đạt.
- Ảnh/báo cáo: `artifacts/precipitate-fidelity/`, `artifacts/stirring-rod-fidelity/`.

## Giới hạn mô hình

Vận chuyển hạt dùng kích thước và mật độ hiệu dụng, lực cản cầu tương đương;
trượt thành chưa có mô hình ma sát bám dính riêng. Kết tủa mịn có thể lắng chậm.
Atlas và màu RGB là tái dựng thị giác thô, không phải phép đo quang phổ hay CFD.
Ba chương trình ferrocyanide vẫn khai báo thông số vận chuyển chưa hiệu chuẩn
thực nghiệm. Các thay đổi này không khẳng định độ chính xác thực nghiệm cho
mọi loại kết tủa.
