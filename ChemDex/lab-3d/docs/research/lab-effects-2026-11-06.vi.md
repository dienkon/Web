# Rà soát hiệu ứng và thao tác phòng thí nghiệm — 06/11/2026

## Lỗi đã xác định và sửa

| Đường thực thi | Trước | Sau |
|---|---|---|
| Bọt O₂ có chất hoạt động bề mặt | Hình bọt dùng chiều cao cố định theo tỷ lệ thể tích; chạy theo đồng hồ render; có thể biến mất khi kinetics được dọn | Kho khí hữu hạn quyết định thể tích; tạo lớp tán xạ và tế bào bọt trong đúng contour bình; giữ bọt đến khi khí thoát; Pause giữ nguyên hình học |
| Áp suất và khoảng trống cho bọt | Tính thể tích O₂ tại 1 atm và bỏ qua chất rắn/màng thành | Dùng áp suất môi trường hiệu lực, nhiệt độ và headspace thực; phần vượt sức chứa được ghi vào khí thoát, không biến thành nước tràn |
| Bình nghiêng và scale | Một số nguồn hạt chỉ cộng offset vào vị trí bình | Bọt dùng frame thân kính và mặt phẳng vuông góc trọng lực; burst/sparks dùng matrix thân kính đang render hoặc phép đổi tọa độ có capacity/yaw/tilt |
| Hạt có nhiều màu/độ mờ | Không tự tạo `instanceColor`; giá trị alpha của hạt không đến shader; màu có thể nhân hai lần | Upload RGB và opacity theo từng hạt; shader basic/standard nhân alpha; giữ material trắng để không nhân tint hai lần |
| Tia lửa sự kiện | Một số sự kiện chỉ bật flash; điểm sáng ở vị trí cố định | Một pool toàn cục nhận sparks, tồn tại độc lập nguồn phản ứng; flash theo vị trí sự kiện; hạt tắt dần và dùng chuyển động đạn đạo theo scale cảnh |
| Pause/tốc độ của giọt bắn/tia lửa | Dùng delta render bị clamp riêng | Dùng đồng hồ mô phỏng; hạt sinh giữa một frame chỉ được tích phân phần thời gian sau khi sinh; không tích phân vị trí hai lần |
| Vệt pha màu/điểm tạo kết tủa | Hết hạn theo thời gian thực dù Pause | Liều rót mới có tuổi theo giây mô phỏng, dùng chung cho shader và điểm vào hệ kết tủa; vẫn đọc được snapshot cũ có expiry |
| Thay mẫu khi Pause | Màu/độ đục có thể giữ từ mẫu cũ do nội suy với dt = 0 | Sample revision đặt màu/độ đục ban đầu ngay; vũng mới cũng có đúng màu trước khi chạy mô phỏng |
| Chất rắn khô trên bàn | Không tiếp xúc với vũng nước ngay cả khi cùng vị trí | Chỉ làm ướt khi footprint chất lỏng thực chạm điểm chất rắn; không cho chất rắn một bán kính hút nước giả |
| Phản ứng ngoài bình | Chỉ chạy một số cặp dung dịch; chất sản phẩm hoặc muối phụ có thể chặn việc nhận diện | Tiếp tục chương trình đã xác thực, đồng thời tìm được chương trình tiếp xúc được hỗ trợ khi có spectator; thêm các chương trình pha rắn–dung dịch có động học đã khai báo |
| Nhãn nguy hại của vũng | Danh sách ngắn hard-code bỏ sót Na/K, chất oxi hóa và muối đồng | Tra danh mục hóa chất; giữ provenance của cảnh báo khi nhập vũng |

## Kiểm chứng

- `tests/lab_effects_regressions.test.ts`: thể tích bọt theo contour của beaker/flask/test tube/cylinder; mặt phẳng trọng lực khi nghiêng; P–V của kho O₂; tổng khí giữ + khí thoát; ướt chất rắn ở cả deposition đơn và batch; CaCO₃/HCl có NaCl; thời gian tiếp xúc khi Pause/4×; RGB/opacity GPU buffer; đạn đạo, hạt sinh giữa frame và tọa độ nguồn render.
- `scripts/auditLabEffects.mjs`: Chrome thật, nút Studio thật, kiểm tra matrix bọt khi Pause, thao tác nghiêng qua PourController, thay mẫu khi Pause, hạt sparks có hai màu và opacity, axit gặp CaCO₃ khô trên bàn. Báo cáo/ảnh tại `artifacts/lab-effects/`. Kiểm tra riêng lỗi JavaScript và lỗi biên dịch shader.
- Studio có thêm **Bọt O₂ · thử Pause** và **Rắn khô · gặp axit**. Các nút thay mẫu có lượng chất cụ thể rồi gọi các thao tác store đang dùng trong phòng thí nghiệm; phần chất rắn chuyển ra bàn được trừ khỏi bình nguồn trước khi rót axit.
- Kết quả trên code cuối vòng: **198 file / 2.387 test đạt**, `npm run lint` và `npm run build` đạt. Chrome xác nhận đủ 5 tình huống, không có lỗi JavaScript hoặc lỗi shader; còn cảnh báo bundle lớn của Vite.

## Giới hạn và phần còn phải rà trong mục tiêu toàn hệ

- Các half-time pha rắn/tiếp xúc được lấy từ chương trình đã khai báo và còn mang tính minh họa, chưa phải tốc độ đo cho từng kích thước hạt/bề mặt. Tìm được chương trình khi có spectator không chứng minh đã giải mọi phản ứng cạnh tranh đồng thời.
- Lớp bọt là thể tích khí phân tán có tán xạ và glyph tế bào, chưa giải drainage từng màng, phân bố kích thước hay sức căng bề mặt thực nghiệm. Không tạo một pha nước mới để có hình bọt.
- Phản ứng trên bàn vẫn giới hạn trong miền pha lỏng được hỗ trợ; chưa có solver nhiệt–bay hơi đầy đủ cho vũng, cháy dung môi trên bàn hoặc tất cả hoạt độ ở nồng độ cao.
- Cần rà tiếp các đường tiếp nhận chất lỏng khi bình quá nóng, điều kiện của thao tác dùng pipette/burette/lọc/đun liên hoàn và các chỗ UI còn hiện giá trị đo mặc định khi mô hình chưa có kết quả. Các kiểm chứng hiệu ứng ở vòng này không thay cho kiểm chứng các đường đó.
- Mục tiêu nâng cấp toàn phòng thí nghiệm tiếp tục **đang thực hiện**; không dùng test xanh của vòng này để khẳng định toàn bộ mô hình đã chuẩn thực nghiệm.
