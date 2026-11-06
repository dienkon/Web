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

## Vòng tiếp theo: tiếp nhận chất lỏng và dụng cụ đo

- Kiểm tra sốc nhiệt tại lúc chất lỏng thực sự chạm kính, trước khi nhiệt độ được hòa trung bình. Rót kho, rót liên tục, mẫu đang bay, màng thành trong, pipette và burette dùng cùng tiêu chí. Liều rót được ghi nhận trước khi vỡ; chất lỏng, chất rắn và giọt đang trên đường đi không bị nhân đôi hoặc mất khỏi sổ lượng chất. Liều bằng không, chất lỏng đã ấm, bình đang ướt và dụng cụ không phải kính không thỏa tiêu chí này.
- Tiêu chí kế thừa (`T kính ≥ 180 °C`, gần khô `≤ 2 mL`, chênh lệch `≥ 130 K`) vẫn **chỉ là mô hình minh họa**. Chưa giải gradient nhiệt/ứng suất hoặc độ bền của từng loại kính; không coi các giá trị này là giới hạn vật liệu thực nghiệm.
- Bình bị nút kín không nhận mẫu qua pipette/burette và không cho đầu đo xuyên nút. Màng lỏng đã vượt miệng trước khi đóng nút vẫn thuộc phía trong bình và được tiếp tục thu nhận.
- Mỗi giọt burette có cả chất tan và dung môi. Nồng độ M do người dùng đặt đi cùng giả thiết mật độ dung dịch `1 g/mL`, không dùng mật độ của một chai kho khác nồng độ. Từ chối nồng độ vô hạn/âm, lượng chất tan vượt tổng khối lượng và thuốc thử kim loại nguyên tố/khí.
- Burette tự động dùng đồng hồ mô phỏng, dừng khi Pause, đo đúng lưu lượng ở 10/30/60/120 FPS và 1×/4×/8× trong test. Có xử lý giọt cuối nhỏ hơn 0,05 mL và không tích lũy lượt nhả bị từ chối thành một đợt bùng sau đó. Giữ quy ước dụng cụ hiện có: mở khóa khi không có bình nhận không nhả vật chất; hình tia nước cũng không hiện trong trường hợp đó.
- Tia pipette/burette dùng tọa độ thế giới, không bị cộng pose của dụng cụ lần hai. Chiều dài jet, màu, lưu lượng và mặt tiếp nhận lấy từ trạng thái hiện tại; chuyển động của hạt/ripple dùng thời gian mô phỏng. Những glyph giọt nhỏ này vẫn là hiệu ứng minh họa, không phải các kho vật chất độc lập.
- HUD, bảng bình và dụng cụ đọc cùng thành phần hiện tại, kể cả khi Pause. Không dùng mặc định pH 7 cho mẫu dầu, khô, quá nông, bị nút hoặc đã vỡ; số không hợp lệ được hiện `---`/`—`. Đầu dò được đặt theo mặt dung dịch và kích thước bình, có kiểm tra ngập cả bóng đo. Cân gồm cả nước ngưng trên hai phía thành kính.
- pH hỗ trợ trong miền cân bằng đã khai báo và nhiệt độ mô hình; không suy ra pH chỉ từ tên chất hoặc ép số vào khoảng 0–14. pH bài học là điều kiện kịch bản riêng. Nhiệt độ trên HUD là trạng thái mẫu, còn LCD 3D có độ trễ theo đồng hồ mô phỏng.
- Đồ thị chuẩn độ cộng thể tích theo từng bình, không nối điểm của hai bình khác nhau. Số đo không hỗ trợ để trống; bỏ nhãn điểm tương đương pH 7 cố định.
- Studio bổ sung nút **Kính nóng · nước lạnh**: chuyển nước mẫu cũ vào kho chất thải, đặt mẫu kính khô nóng, cấp đúng 10 mL nước qua đường rót kho đang sử dụng.

### Bằng chứng của vòng dụng cụ

- `tests/lab_transfer_measurements.test.ts`: 19 trường hợp kiểm tra liên kết giữa giao dịch vật chất, phá hủy, dung môi, đồng hồ và số đo. Sửa fixture rót nóng cũ để có lượng nước nguồn thật thay vì chỉ gán một giá trị thể tích không có contents.
- Toàn bộ suite cuối vòng: **199 file / 2.406 test đạt**; `npm run lint` và `npm run build` đạt, còn cảnh báo bundle lớn của Vite.
- `scripts/auditLabInstruments.mjs`: Chrome xác nhận HUD khi không chọn bình; CuSO₄ vừa thay khi Pause có pH mô hình 4,99; dầu/khô/nút không có số pH; bóng đo ngập thật; nhiệt kế và tia nước dừng theo Pause; burette dời vị trí vẫn nhắm đúng bình, nhả theo 4× và bảo toàn khối lượng kể cả phần nước bay hơi; pipette gây vỡ kính nóng; nút test sốc nhiệt thật của Studio. Không có lỗi JavaScript hoặc shader. Báo cáo/ảnh: `artifacts/lab-instruments/`.
- Chạy lại `auditContactEffects.mjs` và `auditLabEffects.mjs`: Na nhỏ/lớn, màu–tràn, khí ngoài bình, bọt giữ lại khi Pause/nghiêng, thay mẫu và sparks tiếp tục đạt.

### Phần cần tiếp tục

- Các giới hạn khoa học của vòng trước vẫn áp dụng. Đã xử lý các đường rót nóng và giá trị đo mặc định nêu ở trên; chưa coi đây là kiểm chứng mọi dây chuyền lọc/đun hoặc mọi hóa chất trong danh mục.
- Vấn đề phần tràn đi nguyên theo dòng nhập đã được xử lý ở [vòng trao đổi dung dịch trong bình đầy](overflow-mixing-2026-11-06.vi.md). Vòng đó bổ sung kiểm tra phản ứng tiếp tục trên nhánh tràn và tràn thứ cấp do kết tủa mới hình thành. Mô hình trộn đều vẫn không phải solver thủy động lực học.
- Mục tiêu toàn phòng thí nghiệm vẫn đang thực hiện.
