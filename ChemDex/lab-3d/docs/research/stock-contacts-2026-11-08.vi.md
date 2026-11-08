# Tiếp xúc của mẫu rắn và lớp bột — 2026-11-08

## Phạm vi đường chạy

Mảnh hóa chất rắn trong các bình được catalog vật lí hỗ trợ chạy mặc định trong
`stock.worker.ts`, dùng Rapier 0.21.0 đã khóa trong lockfile. Bước tích phân là
1/120 s, thước lõi m–kg–s, gia tốc trọng trường 9.80665 m/s². Renderer chỉ tải
pose; không áp gia tốc hay đẩy mảnh về lưới theo khung hình.
Adapter điều kiện số của Rapier nhân chiều dài, vận tốc, lực và xung lượng
với 100 khi đi vào solver float32 rồi đổi ngược khi đọc ra; khối lượng vẫn kg.
Giao diện công khai, tính lực và bản lưu vẫn SI. lengthUnit của solver được
đặt tương ứng; sai số xuyên cho phép 10 µm và khoảng dự đoán 0.5 mm theo SI.

Mảnh có khối lượng lấy từ kho chất, quán tính theo collider, vận tốc tịnh tiến
và góc. Collider tinh thể là bao lồi của mesh chuẩn hóa thể tích; thành và đáy
bình dùng các collider ghép, giữ khoang rỗng. Vỏ bình theo tư thế cầm/nghiêng
đang hiển thị. Chuyển động vỏ được chia đều qua các bước con của mỗi lệnh,
tránh gom dịch chuyển 1/30 s vào một bước 1/120 s.
Các tư thế trung gian được giữ theo thứ tự khi Worker bận, để thao tác nâng
rồi nghiêng không bị rút thành đường chéo kéo đáy xuyên qua mẫu. Phần thời
gian trước handoff chạy trên các mảnh đã có; liều mới được thêm tại cuối lệnh,
không chịu các bước tích phân xảy ra trước lúc nó tới bình.

Chuyển động thành mỏng còn dùng bước con tiếp xúc: hành trình lớn nhất của
biên được chia thành các đoạn tối đa 1 mm, giới hạn 16 đoạn mỗi tick. Soft CCD
của mảnh dùng khoảng dự đoán 5 mm. Trên 16 mm hành trình biên mỗi tick, giới
hạn tính toán này không bảo đảm hết xuyên; chưa chứng nhận các cú kéo cực nhanh.
Đây là bước con nội bộ của solver; thời gian và snapshot bên ngoài vẫn 120 Hz.
Đáy vát đặc còn có đĩa đỡ giải tích nằm hoàn toàn trong frustum đa giác đã có,
không lấp khoang rỗng hay mở rộng biên ngoài. Mặt đỡ này tránh lỗi manifold
bao lồi quá mỏng. Tần số tiếp xúc 240 Hz giảm độ lún do compliance; fixture
tinh thể kiểm tra đỉnh mesh thấp nhất không xuyên mặt đáy quá 50 µm sau 1 s.

Vỏ bình là biên động học trong bộ giải này: bàn hoặc tay cung cấp phản lực.
Mảnh va nhau có xung lượng đối nhau; tổng xung lượng tác dụng lên biên được
xuất từ cân bằng động lượng, đã trừ trọng lực. Xung lượng đó chưa được dùng
để làm bình tự trượt/lật trong runtime vật thể toàn cảnh. Cờ “Vật lí” toàn cảnh
vẫn là tính năng thử nghiệm riêng, không được coi là đã ghép hai chiều.

Na, K và nước đá tiếp tục dùng mô hình riêng hiện có. Kết tủa, huyền phù, gel,
bọt và mẫu nằm trong giấy lọc không tự chuyển thành tinh thể kho. Các bình
bài học dựng sẵn và dụng cụ chưa có hình học khoang trong catalog không được
tuyên bố đã có cơ học tiếp xúc này.

## Chuyển mẫu hữu hạn

Khi đổ bằng thìa, proxy trên không dùng quỹ đạo SI và seed theo liều. Tại
tiếp xúc, một giao dịch hóa học có thứ tự nhận khối lượng; Worker tiếp nhận
đúng vị trí, quaternion, vận tốc và vận tốc góc của các mảnh. Receipt chưa
hoàn tất sẽ chặn việc tạo thêm mảnh từ chênh lệch khối lượng. Proxy trên không
được ẩn tại handoff; không vẽ lại cùng lượng chất hai lần.

Hòa tan hoặc phản ứng làm giảm khối lượng đồng thời giảm kích thước collider,
giữ pose và vận tốc của phần còn lại. Mảnh vượt khỏi khoang chuyển thành
inventory tràn có ID riêng, trừ đúng khối lượng và số mol khỏi nguồn. Nếu mảnh
chạm bên trong bình nhận mở, cùng ID chuyển sang bình nhận qua pipeline hóa
học hiện có. Dọn tràn xóa đúng vật chất khỏi Worker. Các inventory mảnh tràn
không gộp theo dấu chân chất lỏng để tránh đánh mất pose riêng; tiếp xúc hóa
học giữa mảnh trên bàn với vũng tràn chưa được ghép vào mô hình này.

Pose, vận tốc và ID được lưu cùng kho chất và chất thải. Bridge từ chối kết
quả đang bay về nếu snapshot đã được thay bằng Undo/Redo hoặc khôi phục mẫu.
Tạm dừng ngừng bước tích phân; đổi chất lượng hình ảnh không đổi số hạt vật lí.
Renderer nội suy riêng giữa hai pose nhận được; nội suy không thay kho chất,
tiếp xúc hoặc phép tính thể tích chiếm chỗ.

## Bột và giới hạn tham số

Bột dùng hạt mang khối lượng thô để tính tiếp xúc, không phải từng hạt bụi
micromet. Hạt đang chuyển động được vẽ riêng. Chỉ hạt có tiếp xúc được solver
xác nhận và tốc độ thấp mới nhập vào lớp bột liên tục. Hạt chậm ở đỉnh quỹ đạo
không biến thành lớp bột dưới đáy. Khi nghiêng mạnh, lớp liên tục nhường cho
các carrier chuyển động để mẫu có thể lăn, trượt và tràn ra.

Lớp bột là heightfield đóng, chuẩn hóa thể tích từ khối lượng/mật độ và hệ số
đóng gói 0.55. Góc nghỉ 28°, ma sát mảnh 0.42, ma sát bột 0.55 và hệ số nảy
0.22/0.06 là **ước lượng chưa hiệu chuẩn theo từng hóa chất**. Không có dữ liệu
thử nghiệm độc lập chứng nhận động học tạo đống hoặc chảy của từng loại bột.
Các dạng cuộn/foil không lồi dùng bao lồi để va chạm, chưa mô phỏng biến dạng.

Lực đẩy trong chất lỏng dùng thể tích ngập của quả cầu tương đương; lực cản
ghép Stokes và hạng bậc hai với Cd 0.8. Đây là xấp xỉ cho mảnh thô, chưa có
kiểm chứng thực nghiệm về tương tác mảnh–dòng, thấm ướt hoặc lực mao dẫn.

## Miền đã kiểm tra số

`tests/stock_contact_world.test.ts` kiểm tra:

- Rơi 0.1 s trong không khí, sai lệch độ rơi so với g·t²/2 dưới 1%; cùng 12
  bước và cùng pose ở lịch 20/30/60/120 FPS trong fixture không có lệnh cầm.
- Hai khối bằng nhau va trực diện: đổi chiều vận tốc, bảo toàn động lượng
  ngang và tiêu hao động năng.
- Phản lực đỡ mẫu 1 g đứng yên trên mặt phẳng, sai lệch xung lượng so với
  m·g·Δt dưới 1% trong fixture.
- Cốc kín chứa 5 g tinh thể di chuyển 0.2 m ở 0.5 m/s: không xuyên vỏ và
  trọng tâm mẫu theo cốc. Đây là fixture số, chưa đo bằng dụng cụ thật.
- Nâng cốc mở chứa mẫu đã nghỉ 5 s: mẫu đi theo đáy, không nằm lại trên bàn.
  Mảnh ra qua miệng được chuyển kho kể cả khi còn trên trục bình; bình nhận
  có thể bắt mảnh trên lớp mẫu đã có, không bắt buộc chạm trực tiếp vào kính.
- Tinh thể hydrate 5 g rải trên đáy cốc 100 mL, không rơi xuyên và không còn
  các cột bố trí ở giữa; kiểm tra tổng khối lượng của các mảnh.
- Receipt có thứ tự, chuyển khối lượng/số mol khi tràn đúng một lần, tiếp
  nhận lại cùng ID và vận tốc, khôi phục ID và đóng băng khi pause.
- Mesh lớp bột có thể tích đóng bằng thể tích yêu cầu trong cốc, bình tam giác
  và ống nghiệm. Đây là phép kiểm tra hình học, không phải dữ liệu chảy bột.

`scripts/auditStockContacts.mjs` chạy Chrome với giao diện thật, gồm lớp tinh
thể/bột, đổ liều qua hoạt ảnh, nghiêng bằng PourController, bắt mảnh vào bình
nhận, kiểm tra kho chất, pause và local persistence/reload. Các ảnh và JSON
được ghi tại `artifacts/stock-contacts`. Những kiểm tra này không thay cho đo
hiệu năng trên điện thoại thật hoặc hiệu chuẩn từng cặp vật liệu.

## Nguồn kỹ thuật

- [Rapier: collider, bao lồi, khối lượng và collider ghép](https://rapier.rs/docs/user_guides/javascript/colliders/).
- [Rapier: CCD và giới hạn chống xuyên](https://rapier.rs/docs/user_guides/javascript/rigid_body_ccd/).
- Mật độ và danh tính chất lấy từ catalog hiện có; nguồn/miền của từng hồ sơ
  tiếp tục theo catalog. Các hệ số tiếp xúc ở trên được công khai là ước lượng.
