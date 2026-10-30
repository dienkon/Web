# Dòng rót: lượng thực nhận, quỹ đạo và đơn vị

Rà soát/triển khai: 22/10/2026. Tiếp nối tài liệu hình học lòng bình. Phạm vi là rót giữa các bình hữu hạn, đường bay dòng/giọt và các bộ thêm stock/Na dùng chung gia tốc. Chưa phải hiệu chuẩn thao tác phòng thí nghiệm thực.

## Nguồn đã đọc

| Nguồn sơ cấp dùng cho mô hình | Cơ sở | Phạm vi áp dụng |
|---|---|---|
| [OpenStax University Physics §4.3 – Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion) | Chuyển động ngang độc lập với chuyển động thẳng đứng; gia tốc trọng trường khoảng 9,8 m/s² | Phương trình bay và nghiệm giao với mặt phẳng ngang, bỏ sức cản không khí |
| [§14.5 – Fluid Dynamics](https://openstax.org/books/university-physics-volume-1/pages/14-5-fluid-dynamics) | Q = dV/dt = Av, liên hệ lưu lượng với tiết diện và vận tốc | Độ dày dòng theo lượng mL/s thực và tốc độ dọc quỹ đạo |
| [§14.6 – Bernoulli’s Equation](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation) | Bảo toàn năng lượng của dòng lý tưởng, không nén, bỏ ma sát | Vận tốc thoát lý tưởng v = √(2gh), không chứng minh hướng tia hay hệ số lưu lượng thực |

Tỉ lệ 3,5 cm trên một đơn vị cảnh là lựa chọn quy đổi hiển thị trong phần mềm, không phải kích thước lấy từ ba nguồn trên. Dung tích các dụng cụ còn được chuẩn theo thể tích lòng bình của mô hình, chưa có một bộ dụng cụ thật được đo làm chuẩn.

## Lượng chất và thống kê phiên

Trước đây bộ hình học rót chỉ lấy chỗ trống bằng dung tích trừ thể tích chất lỏng. Giao dịch aliquot sau đó còn trừ phần vật rắn chiếm chỗ nên nhận ít hơn, nhưng giao diện vẫn cộng lượng dự kiến. Thêm vào đó, một số bước dự đoán có thay thể tích/khối lượng nhưng giữ nguyên số mol trong contents.

`availableLiquidVolume` hiện tham gia dự đoán sức chứa. Mật độ chất lỏng nguồn được tính từ khối lượng các pha lỏng/aq và thể tích, tách kim loại rắn cùng khí khoang trên; không lấy một metadata density cũ để thay lượng vật chất đã biết. Khi có contents của hai bình, bước vật lý dùng lại kế hoạch `decantLiquid`: phần lỏng và chất hòa tan chuyển đi, chất rắn/khí ở lại. Kho chất bất biến của đầu vào được giữ nguyên.

Giao dịch `transferLiquidContinuous` trả kết quả gồm `moved_ml`, `accepted_ml`, `spilled_ml`. Bình không hợp lệ, đóng nắp hoặc mẫu bài học bị chặn trả cả ba bằng 0. Thống kê phiên cộng các kết quả này; không suy lượng nhận từ thay đổi thể tích sau phản ứng vì bản thân phản ứng cũng có thể thay nước/pha. Nếu giao dịch không dịch chuyển gì, phiên chuyển về dừng rót.

Ví dụ kiểm chứng: bình mô hình 100 mL có 89 mL nước và 89,6 g Cu đặc, với mật độ Cu trong catalog là 8,96 g/mL. Cu chiếm 10 mL, còn khoảng 1 mL chỗ trống. Rót 5 mL dung dịch vào: 1 mL được giữ, 4 mL tràn; nguồn mất đúng 5 mL. Moles và khối lượng kiểm tra riêng, gồm cả chất hòa tan trong phần tràn. Đồng rắn không bị sao chép sang bình nhận.

Tọa độ lưu phần tràn được đưa về mặt bàn. Sự kiện hiệu ứng giữ thành phần của phần chất vừa rời bình, kể cả khi bình nguồn trống sau giọt cuối. Đây vẫn là lưu lượng/va chạm được cập nhật theo bước thời gian, không phải mô hình dòng tràn liên tục trên mép bình.

## Đơn vị và chuyển động

`sceneUnits.ts` quy định một đơn vị cảnh tương ứng 0,035 m cho đường bay. Vì vậy gia tốc là `9,8 / 0,035 = 280` đơn vị cảnh/s². Không thể dùng số 9,8 trực tiếp trong cảnh này như thể mỗi đơn vị là một mét.

Vận tốc từ đầu áp tính theo mét rồi đổi sang đơn vị cảnh/s. Ví dụ đầu áp 2 cm cho vận tốc lý tưởng khoảng 0,626 m/s. Một mét rơi tự do từ nghỉ mất khoảng 0,452 s; một đơn vị cảnh (3,5 cm) mất khoảng 0,0845 s. Các giá trị này đã có ca đối chiếu SI độc lập.

Nghiệm giao mặt ngang giải `y(t) = y0 + vy0 t − gt²/2`. Mặt cao quá quỹ đạo trả không giao, không ép chênh cao tối thiểu rồi gán điểm chạm giả. Trường hợp rơi nhanh trên đoạn ngắn dùng dạng nghiệm tránh trừ hai số gần nhau. Bộ thêm stock, giọt chỉ thị và miếng Na cùng dùng gia tốc này; thời gian tiếp xúc của các đường đó đổi tương ứng.

Bộ hiển thị dòng dùng cùng gia tốc với bộ quyết định quỹ đạo. Giọt cập nhật vị trí bằng nghiệm gia tốc hằng trong mỗi bước rồi mới cập nhật vận tốc, tránh sai lệch Euler phụ thuộc số khung hình. Thời gian gợn/biến dạng của dòng theo thời gian mô phỏng, dừng khi tạm dừng.

## Miệng bình, thành trong và mặt bàn

Dòng từ trên phải đi qua lỗ mở thật tại thời điểm cắt cao độ miệng bình. Bỏ vùng nhận 1,35 lần bán kính miệng và vùng vành 1,75 lần bán kính cũ. Vành ngoài lấy từ hình học kính, phân biệt với tọa độ tâm vòi rót. Va vành không được cộng như toàn bộ dòng đã vào bình.

Nếu đã qua miệng, kiểm tra đường bay với bán kính lòng bình theo cao độ để tìm lần chạm thành trong đầu tiên; vị trí này có thể ở trên mặt nước. Không vẽ gợn chất lỏng tại điểm va thành khô. Bộ kiểm tra va thành dùng lấy mẫu có giới hạn và chia đôi đoạn phát hiện giao; chưa phải chứng minh tìm được mọi giao trong mọi hình dạng cổ rất mỏng.

Đầu rót đã nằm trong khoang khí phía trên mặt nước có thể phát dòng bên trong bình. Đầu ở dưới cao độ vành nhưng nằm ngoài thành không được coi như đã đi xuyên qua kính. Khi trượt lỗ mở, điểm rơi tiếp theo dùng mặt bàn, không dùng mặt phẳng nước của một bình bị trượt.

Chế độ hỗ trợ vẫn có thể thay vận tốc ngang để ngắm qua miệng; đó là hỗ trợ thao tác được chỉ rõ, không phải kết quả Bernoulli. Hướng thoát từ góc bình vẫn là mô hình minh họa. Va thành ngoài, độ dày dòng đối với mép lỗ, màng bám thành và nước bắn chưa được giải đầy đủ.

## Độ dày dòng và giọt

Với tốc độ dọc tia v, diện tích tiết diện lấy từ Q/v sau đổi mL sang cm³ và sang đơn vị cảnh³. Các vòng tạo ống dòng đặt vuông góc tiếp tuyến quỹ đạo. Dòng hẹp dần khi rơi nhanh hơn, thay cho công thức bán kính bị chặn tùy ý và vòng tiết diện luôn nằm ngang.

Ở chế độ giọt lưu lượng nhỏ, hạt hiển thị dùng thể tích quy ước 0,05 mL. Tần suất phát dựa trên lưu lượng chia thể tích đó. Giọt bay theo vận tốc thoát đã dùng trong bộ giải, không tự thêm vận tốc để kéo về tâm bình. Màu được giữ theo phần chất tại lúc phát, kể cả khi có giọt từ phiên cũ đang rơi. Biến dạng kéo dài có giới hạn và giữ thể tích ellipsoid; chưa có mô hình lực căng bề mặt/đứt tia Rayleigh–Plateau. Pool giới hạn có thể bỏ bớt hạt hiển thị khi quá tải; lượng vật chất thuộc giao dịch inventory, không thuộc số hạt GPU.

## Kiểm chứng và giới hạn

Kiểm tra toàn bộ sau thay đổi: 71 tệp, 957/957 tests đạt. TypeScript và build sau cùng đạt. Build vẫn cảnh báo bundle lớn hơn 500 kB; không coi các phép thử số học là kiểm chứng WebGL.

Các ca mới đối chiếu lượng nhận/tràn với inventory, khối lượng/số mol và chất rắn ở lại nguồn; thống kê phiên gần đầy; giao dịch bị từ chối; nắp đóng và dt không hợp lệ; thành phần lần tràn cuối khi nguồn trống; SI rơi tự do và năng lượng Torricelli; Q=Av; thể tích giọt; trượt miệng, chạm vành kính thật, chạm thành trong và đầu rót ở khoang khí. Các fixture trước đây dùng một lỗ miệng tính bằng mét lẫn với tọa độ cảnh đã đổi sang hình học thật của profile. Ma trận 120 lần rót hỗ trợ giữ vòi đã xoay nằm phía trên miệng bình nhận.

Phần quan trọng chưa hoàn tất:

- Cập nhật tiếp: nhánh rót hai bình hữu hạn đã có kho vật chất đang bay và nhận dần theo thời gian tới điểm va chạm; xem [finite-material-flight.vi.md](finite-material-flight.vi.md). Nhánh thêm stock/Na có cơ chế tiếp xúc riêng, chưa hợp nhất. Ca va thành khô vẫn chưa có thời gian chảy xuống mặt dung dịch.
- Đã thêm giai đoạn vật chất trên thành trong và trì hoãn phản ứng tới mặt dung dịch; xem [wall-film-contact-and-rendering.vi.md](wall-film-contact-and-rendering.vi.md). Bề rộng ướt, màng gợn và thời gian chảy thực nghiệm vẫn cần hiệu chuẩn.
- Lớp trên của hỗn hợp không trộn lẫn, cặn bị cuốn, pha loãng/co thể tích và tràn lấy chọn lọc lớp chưa được giải đầy đủ trong rót thông thường.
- Chưa thống nhất hình học SI đo từ dụng cụ thật cho cả cảnh. Gia tốc của mọi hệ hạt cũ ngoài những nhánh rót/stock/Na nêu trên chưa được chuyển hết.
- Hệ số lưu lượng, độ nhớt, glug, độ bám thành và chuyển từ tia sang giọt còn tham số minh họa. Không phải mô hình Navier–Stokes hoặc dự đoán thao tác thật.
- Chưa kiểm tra hình ảnh/GPU. Lần mở Chrome trước đã bị hệ thống tự động phê duyệt chặn (`blocked by policy`); chưa có bằng chứng mới cho phép vượt chặn. Hiệu năng headless không phải FPS WebGL.
