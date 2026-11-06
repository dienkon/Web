# Hiệu ứng vỡ bình, bức xạ và rung camera — 06/11/2026

## Các lỗi đã sửa

- `shatterVessel` từng phát 50 tia lửa vàng với mọi lý do chứa “nổ”, “explosion” hoặc “overpressure”. Director đồng thời bật đèn chớp mạnh cho mọi sự kiện nổ. Na trong môi trường O₂ bằng 0 vì vậy vẫn có tia lửa/chớp dù chưa có nguồn cháy được mô hình hóa. Vỡ bình hiện giữ phần kính văng, văng dung dịch, âm thanh và xung khung nhìn; bản thân hành động vỡ không tự phát tia lửa.
- Kịch bản Na lớn gửi loại sự kiện `fragmentation` sau bước tiêu thụ Na đầu tiên. Vỡ do áp suất dùng `pressure`. Nguyên nhân chưa được cung cấp chỉ ghi “Glass failure”, không mặc định gán đồng thời sốc nhiệt, quá áp và nổ.
- Chớp sáng từ sự kiện nổ cần `kind: combustion` và `radiantEnergy_J` dương, hữu hạn được cấp tường minh. Đây là cổng cho biểu diễn quang học; không suy ra nguồn sáng từ tên phản ứng, chữ “nổ” hoặc nhãn nguy hiểm. Những nguồn tia lửa riêng đã có của các renderer khác không được hiệu chuẩn lại trong vòng này.
- Hai atom `cameraShake`/`cameraTraumaShake` từng gửi sự kiện nổ, kích hoạt thêm vòng xung và đèn chớp. Nay chúng gửi `camera:shake`, chỉ mang cường độ và thời gian tắt dần.
- Callback camera từng thoát sớm khi đã chuyển góc nhìn xong, nên rung có thể không chạy ở góc nhìn đứng yên. Cách cộng trực tiếp độ lệch vào vị trí/góc quay mỗi frame cũng có thể làm khung nhìn trôi. Nay rung là lớp dịch/roll của phép chiếu, độc lập với quá trình chuyển góc nhìn. Vị trí, quaternion và đích OrbitControls giữ nguyên. Phép chiếu nghịch đảo được cập nhật để khớp tia chọn; lớp rung được gỡ trước bước OrbitControls tiếp theo.
- Rung dùng đồng hồ Pause/timeScale chung, tham số thời gian tắt dần và tùy chọn hệ điều hành giảm chuyển động. Khi hết xung hoặc tháo camera, phép chiếu nền được khôi phục. Thay đổi aspect/FOV thật không bị đè bằng phép chiếu cũ.

## Studio

Mở **Atoms → CAMERA → cameraTraumaShake** hoặc **cameraShake**, rồi chọn **Rung camera · giữ nguyên mẫu**. Cả bốn preset của hai atom có đường chạy được hỗ trợ; không cần bình đích, không thay thuốc thử, không tạo khí, kính hoặc sự kiện nổ. Nếu đang Pause, Resume để chạy thời gian của xung. Tùy chọn giảm chuyển động vẫn được tôn trọng.

Audit danh mục hiện có 175 atom và 350 preset: 69 ngữ cảnh chương trình, 3 màu ngọn lửa, 2 gợn, 2 khuấy, 12 điều khiển nhiệt, 4 âm thanh, 1 nước–đá, 4 rung camera và 253 preset chỉ xem giới hạn. Các con số này mô tả đường chạy hỗ trợ, không chứng minh toàn bộ 350 renderer/tham số đã được hiệu chuẩn thực nghiệm.

## Kiểm chứng

`tests/rupture_camera.test.ts` kiểm tra Na lớn ở O₂ = 0 và không khí thường vẫn đi theo nhánh vỡ tiếp xúc, chỉ phát một sự kiện phân mảnh, không phát tia lửa và giữ khối lượng nguồn + vũng + khí. Các trường hợp áp suất lạnh, nguyên nhân không rõ, hai atom rung và nút preview không tạo bức xạ/nổ ngoài đường được khai báo.

Các test camera kiểm tra vị trí/quaternion không đổi trong 30 frame, ma trận chiếu và nghịch đảo còn nhất quán, không trôi sau 500 lần áp xung, cập nhật FOV/aspect được giữ, Pause/giảm chuyển động và kết quả tắt dần độc lập với cách chia frame. Chúng kiểm tra cơ chế số học của hiệu ứng, không khẳng định rung là phép đo dao động của camera thật.

`scripts/auditRuptureCamera.mjs` thao tác nút preview Studio thật trong Chrome, chờ chuyển góc nhìn kết thúc rồi kiểm tra ma trận renderer. Kiểm tra Pause, phục hồi chính xác vị trí/quaternion/đích/phép chiếu và `prefers-reduced-motion`. Kịch bản Na lớn qua nút Studio ở O₂ = 0 vỡ bình thật theo mô hình; trong renderer, đèn chớp có intensity 0, không hiển thị và không có instance tia lửa hoạt động. Ảnh/JSON ở `artifacts/rupture-camera/`, không có lỗi JavaScript hoặc shader trong lần đạt.

Audit còn gửi một gói bức xạ **ảo, tường minh** để kiểm tra đèn có thể sáng khi hợp đồng renderer cho phép. Bước đó không phải phản ứng thực hay bằng chứng hóa học cho sự cháy của mẫu Na. Hệ số đổi năng lượng gói sang cường độ quang học là minh họa, chưa phải phép đo quang hoặc cân bằng năng lượng bức xạ đầy đủ.

Kiểm tra cuối vòng: **203 file / 2.471 test đạt** với `npx vitest run --maxWorkers=2`; TypeScript và build đạt. Build còn cảnh báo bundle lớn. Benchmark headless logic/physics nằm trong ngưỡng cũ; không dùng số FPS của Chrome headless trong ảnh để cam kết hiệu năng WebGL trên máy người dùng.

## Nguồn và giới hạn

[Demo của University of Washington](https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water) mô tả chuyển động Na trên mặt nước, bọt H₂ và vai trò chỉ thị. Demo cũng mô tả nguy cơ kim loại bật lên và ảnh hưởng của bề mặt/lớp dầu; không dùng nó để suy ra một khối lượng nổ cố định. [Mason et al., Nature Chemistry (2015)](https://www.nature.com/articles/nchem.2161) nghiên cứu cơ chế ban đầu của phản ứng kim loại kiềm–nước; nhánh phân mảnh minh họa trong ứng dụng không phải nghiệm của nghiên cứu đó và không suy rộng hợp kim Na/K thành một ngưỡng phổ quát cho mọi mẫu Na.

Vòng này không bổ sung mô hình tự mồi cháy của kim loại, cháy ngoài bình, ánh sáng của mọi mảnh kim loại nóng hoặc mô phỏng điện tích/độ bền kính. Nhánh cháy H₂ có ngân sách oxy riêng vẫn là mô hình hiện có. Các giới hạn của [Na sau vỡ bình](spill-sodium-2026-11-06.vi.md), [tiếp xúc](contact-effects.vi.md) và dữ liệu nhiệt phản ứng tiếp tục áp dụng; mục tiêu nâng cấp toàn phòng thí nghiệm còn mở.
