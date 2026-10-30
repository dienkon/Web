# Sương thành bình: khối lượng, vị trí và tiếp xúc với kính

## Lỗi xác nhận và thay đổi

Renderer cũ lấy khối lượng tổng rồi vẽ 48 ellipsoid mỗi phía. Khi giọt chạm đáy, phép modulo đưa nó lên trên, dù không có nước ngưng tụ mới. Tất cả giọt còn bị dời theo phần trăm chiều cao mỗi khi mực chất lỏng đổi. Normal luôn nằm ngang nên không khớp vai bình nón. Engine cho nước thoát theo một hằng số 15 giây độc lập với chuyển động trên hình.

Hiện `WallCondensationState` lưu `innerBeads`/`outerBeads`. Mỗi bead có `mass_g`, `y`, `theta`, `sliding`. Vật lý sở hữu vị trí và lượng nước; renderer chỉ đọc snapshot, kể cả khi pause. Đã bỏ modulo và hằng số thoát nước 15 giây. Hình giọt là chỏm cầu tiếp xúc với mặt phẳng tiếp tuyến cục bộ, không phải một quả cầu xuyên nửa qua kính.

## Hợp đồng hàm

`contourWallArea(points, bottom, top)` tích phân chính xác diện tích mặt bên các đoạn hình nón cụt của mesh lathe, có cắt ở hai cao độ, không cộng mặt đáy/rim nằm ngang. Phần nhận hơi phía trong và phần kính thấp được làm lạnh phía ngoài dùng đường bao riêng. Đã bỏ việc dùng bán kính lớn nhất thay cho toàn bộ thành bình.

`wallSurfaceFrame(points, y, theta)` trả vị trí, bán kính, độ dốc `dr/dy`, metric độ dài, pháp tuyến ngoài và tiếp tuyến kinh tuyến. Renderer đảo pháp tuyến cho giọt phía trong. Vùng vai bình có thành phần pháp tuyến thẳng đứng; đó là hình học đường bao đang vẽ, không phải một cylinder thay thế.

`wallDropCap(mass_g)` quy lượng nước thành bán kính cong, bán kính tiếp xúc và chiều cao chỏm cầu ở góc giả định 70°. Thể tích dùng `V = πh²(R − h/3)` và mật độ nước xấp xỉ 1 g/mL, nhất quán với ledger nước thành hiện tại. Mesh có độ phân giải hữu hạn nên không tuyên bố thể tích tam giác bằng công thức giải tích tuyệt đối. Xấp xỉ mặt tiếp xúc phẳng chỉ phù hợp khi footprint nhỏ so với bán kính cong kính.

`waterSurfaceTension(T)` dùng IAPWS R1-76(2014), `γ = 0.2358 τ^1.256 (1 − 0.625τ)` N/m, `τ=1−T/647.096` với T theo kelvin. Không dùng một sức căng bề mặt cố định cho mọi nhiệt độ. Biên dưới dùng điểm ba thể; chưa giải băng/sublimation.

`wallDropMotion(mass, T, metric)` dùng thành phần trọng lực dọc bề mặt `mg/metric` và lực giữ kiểu Furmidge `2aγ(cosθR−cosθA)`. Góc lùi 40°, góc tiến 80°, hệ số hình học 1, cản hiệu dụng `20 × 6πμR`, trần vận tốc 0.15 m/s đều là **giả định closure chưa được hiệu chuẩn**. Chúng không phải số đo cho kính trong dự án; quan hệ Furmidge không tự chứng minh một ngưỡng khởi trượt chung cho mọi bề mặt. Hình dạng và góc tiếp xúc động chưa được giải.

`transportWallBeads(options)` nhận lượng ngưng tụ/bay hơi hữu hạn trong dt, không tự suy nguồn từ nhiệt độ. Mỗi phía có tối đa 48 vị trí đại diện với phân bố nucleation cố định, không phải một mô phỏng mọi hạt nhân giọt thật. Chia dt thành các substep không quá 1/120 s; nguồn được chia cho từng substep. Cùng nguồn không đổi tại 30/60/120 Hz đã kiểm tra khớp lượng giữ lại/chảy/bay hơi. Chưa có bảo đảm giống tuyệt đối ở mọi partition bất kỳ hoặc tải dt vô hạn.

Giọt nhỏ có thể đứng yên; giọt đủ lực trượt xuống theo metric kính, nhập nhau khi footprint tiếp xúc trên khoảng cách bề mặt xấp xỉ. Nhập giọt cộng khối lượng và dùng tâm khối lượng cục bộ, tính góc theo cung ngắn qua seam 0/2π. Giọt đã thoát có mass zero; chỉ nguồn ngưng tụ mới được tạo lại nước tại vị trí trống. Không có vòng tái sinh giọt cũ. Hợp nhất giọt chưa bao gồm nhiệt/dao động do giảm năng lượng bề mặt.

Giọt trong chạm mẫu thì chuyển nước sang `returnedStep_g`; giới hạn theo sức chứa còn lại kể cả phần thể tích bị chất rắn chiếm. Nếu bình đã đầy, giữ phần nước chưa chuyển ở biên thay vì tạo sink vượt sức chứa. Mực tiếp xúc dùng `vesselLiquidSurfaceY`, gồm dịch chỗ do đá/chất rắn. Giọt đã bị ngập được nhập vào mẫu trước khi xét bay hơi vào khoảng khí. Giọt ngoài tới chân kính chuyển sang `drainedStep_g` để store tạo phần chảy ngoài một lần. Tách nước trên kính khỏi nước của mẫu khi kiểm toán/cân.

`stepWallCondensation` vẫn sở hữu thông lượng/ngưng tụ/nhiệt: chỉ chia nguồn hơi nước hữu hạn cho phía trong, phía ngoài nhận ẩm từ biên phòng mở. Lượng bay hơi được ghi theo lượng thực rời đi khi cạnh tranh với drainage, không theo yêu cầu danh nghĩa. Ngưng tụ/bay hơi ngoài đổi latent heat vào mẫu, phần trên trong trao đổi với phòng theo closure hiện có. Bình kín không được xuất nước bay hơi từ thành trong ra plume ngoài.

Khi hạ mực chất lỏng, bead cũ giữ tọa độ trên kính, không bị kéo theo mực mới. Khi mẫu đã khô, footprint giọt ngoài còn lại vẫn được dùng cho bay hơi; không đóng băng inventory chỉ vì phần kính đang ướt theo mực bình đã bằng zero. `effectsEnvironment` riêng từng bình ưu tiên hơn điều kiện mặc định.

## Kiểm chứng và giới hạn

`tests/wall_bead_transport.test.ts` có 23 test: diện tích cylinder/frustum, pháp tuyến beaker/flask/volumetric, thể tích chỏm cầu, sức căng/mobility, bám/trượt/thoát một lần, nguồn mới, nhập qua seam, đổi mực, giới hạn bình nhận, hai sink cạnh tranh, so sánh 30/60/120 Hz, dt không hợp lệ, tổng bead bằng ledger, kín/mở, humidity riêng, mẫu khô, đá làm dâng mực, store isolation và pause.

Test ledger cũ vẫn chạy đủ 10 phút vật lý với substep 1/120 s; khởi tạo một lượng nước ngưng tụ hữu hạn để kiểm tra cả drainage. Không còn buộc một màng rất mỏng phải chảy sau timeout. Timeout test tăng riêng lên 15 s vì test tích phân dài có coalescence; không giảm thời lượng vật lý để làm test đạt.

Mô hình này dành cho bình thẳng đứng. Chưa giải bề mặt chất lỏng trong bình nghiêng/rót, lực tiếp tuyến do hướng trọng lực mới khi lắc/nghiêng, tách rời giọt khỏi mặt dưới, tiếp xúc động, rivulet/màng liên tục, nhám/bẩn/hóa học kính hoặc gradient nhiệt từng vị trí. Các hệ số nhiệt tường 0.35/0.9, drying trong 30 s, truyền khối và Lv=2256 J/g vẫn là xấp xỉ cần nghiên cứu tiếp. Chưa có ảnh WebGL đã xác nhận; không coi cân bằng/test xanh là bằng chứng toàn hệ đã hoàn toàn chân thực.

## Nguồn

- [IAPWS R1-76(2014): Surface Tension of Ordinary Water](https://iapws.org/technical-guidance/release/Surf-H2O): công thức γ(T), không xác nhận góc tiếp xúc hoặc cản trên kính.
- [Furmidge Equation Revisited, Langmuir (2025), DOI 10.1021/acs.langmuir.5c01302](https://pubs.acs.org/doi/10.1021/acs.langmuir.5c01302): lực giữ phụ thuộc hysteresis và hệ số hình học/phân bố góc tiếp xúc; phân biệt sliding steady với diễn giải ngưỡng onset. Không suy ra các góc mặc định của dự án từ bài báo.
