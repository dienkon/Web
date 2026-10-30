# Vật chất hữu hạn trong dòng rót giữa hai bình

Đợt cập nhật này sửa nhánh rót bình hữu hạn của `PourController`: chất bị trừ ở nguồn khi phát ra; phần chưa tới nơi nằm trong `inFlightPours`; bình nhận chỉ nhận lượng đã tới điểm va chạm. Đây là bước tiếp sau `pour-flight-and-material-receipts.vi.md`, không phải chứng nhận toàn bộ lab giống thực nghiệm.

## Nguồn và phạm vi suy luận

Đối chiếu ngày 22/10/2026 với tài liệu gốc OpenStax:

| Nguồn | Nguyên lý được dùng | Giới hạn |
| --- | --- | --- |
| [University Physics §4.3 — Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion) | Vận tốc ngang không đổi; gia tốc đứng do trọng lực; giải thời gian và vị trí giao mặt đích | Bỏ cản không khí. Không suy ra độ nhớt, vỡ tia hoặc chuyển động màng bám từ công thức đạn đạo |
| [University Physics §14.5 — Fluid Dynamics](https://openstax.org/books/university-physics-volume-1/pages/14-5-fluid-dynamics) | Lưu lượng thể tích và liên hệ Q = Av; bảo toàn vật chất trong dòng | Không phải số liệu hiệu chuẩn lưu lượng của bộ dụng cụ mô hình |

Hàng đợi aliquot và thuật toán cập nhật bên dưới là thiết kế phần mềm suy ra từ các nguyên lý này. Quy đổi cảnh 0,035 m/đơn vị là quy ước hiện có của lab, không phải dữ liệu đo từ hai nguồn.

## Ba nơi giữ vật chất

Mỗi lần phát giữ mẫu hữu hạn gồm thể tích, khối lượng, nhiệt độ, thành phần/số mol và phần hữu cơ nếu có. Mẫu tách khỏi nguồn bằng cùng phép decant đã kiểm tra, nên chất tan đi cùng dung môi; cặn lắng, kim loại rắn và khí khoang trên ở lại. Không dựng lại nồng độ từ tên chai.

Trước phản ứng hoặc thay đổi pha, tổng lượng chất phải xét cả bình nguồn, phần đang bay, bình nhận và phần đổ ra bàn. Sau phản ứng, kiểm tra nguyên tố và khối lượng thay vì đòi số mol của từng hợp chất giữ nguyên. Phần lau dọn được chuyển vào inventory chất thải và được lưu cùng phiên.

Mỗi khoảng phát Δt giữ vận tốc đầu và quỹ đạo riêng. Với thời gian bay τ, tuổi khoảng phát t và lưu lượng đều trong khoảng đó, phần đã tới điểm va chạm là `clamp((t − τ) / Δt, 0, 1)`. Mỗi bước chỉ lấy phần tăng thêm. Vì vậy một khoảng phát được nhận dần, không bị chuyển toàn bộ ngay lúc rời miệng bình. Bước điều khiển hiện là 1/60 s; thay đổi hướng/lưu lượng bên trong một bước chưa được giải liên tục.

Giao dịch tới nơi cập nhật đồng thời mẫu đang bay, bình nhận, sản phẩm phản ứng và phần tràn trong **một lần cập nhật store**. Thành phần khác của ứng dụng không nhìn thấy một khung trạng thái đếm cùng mẫu hai lần. Thống kê phiên tách `released_ml`, `inFlight_ml`, `transferred_ml`, `spilled_ml`; giới hạn lượng yêu cầu áp dụng cho lượng đã phát, tránh phát dư trong lúc đợi đích nhận.

## Thời điểm phản ứng và sức chứa

Nhánh native phản ứng được gọi khi mẫu đến điểm va chạm. Ca kiểm tra HCl rót vào NaOH chứng minh bình nhận giữ nguyên thành phần/nhiệt độ trước thời gian bay, sau đó tiêu hao đúng phần NaOH được trung hòa và tăng nhiệt theo ledger hiện có. Việc thêm hàng đợi không tự xác nhận mọi phương trình hoặc hằng số của catalog cũ.

Sức chứa được tính lại tại lúc nhận, gồm thể tích vật rắn chiếm chỗ. Chỗ trống không được đặt trước lúc phát: nếu một thao tác khác lấp đầy bình trong thời gian bay, mẫu tới sau trở thành phần tràn với khối lượng và số mol thực. Màu/nhãn cảnh báo phần tràn lấy từ mẫu đã phát, không từ bình nguồn có thể đã trống hoặc bị xóa.

**Cập nhật tiếp xúc thành trong:** đã thêm inventory giai đoạn trên kính và trì hoãn trộn/phản ứng tới lúc xuống mặt dung dịch. Xem [wall-film-contact-and-rendering.vi.md](wall-film-contact-and-rendering.vi.md) để biết mô hình màng, độ nhớt nước, số cân, sức chứa và kiểm chứng hình học. Độ thấm ướt, bề rộng và dòng gợn vẫn chưa được hiệu chuẩn thực nghiệm.

## Dời bình, dừng rót và điều khiển thời gian

Phần đã phát không đổi vận tốc để đuổi theo nguồn hoặc đích. Khi vị trí, hình dạng, trạng thái nắp hoặc trạng thái vỡ của đích đổi, kiểm tra lại đường bay từ vận tốc đầu đã lưu. Đích dời ra khỏi đường đi không nhận mẫu. Nắp đóng có thể tạo va ở cao độ miệng; bình bị xóa/vỡ để mẫu tiếp tục tới mặt bàn. Đích di chuyển tới điểm nằm sau phần đầu dòng đã đi qua không được bắt mẫu ngược thời gian.

Đây là kiểm tra lại hình học ở các bước rời rạc, chưa phải giải va chạm liên tục với vật đang chuyển động. Bình nhận nghiêng không được giả làm bình đứng để nhận mẫu; va thành ngoài và chất chảy trên nắp vẫn cần mô hình riêng. Khi một phần khoảng phát đã qua điểm mới nhưng phần khác còn ở phía trên, quy tắc tránh bắt ngược có thể cho cả phần còn lại đi tiếp xuống bàn.

Hủy hoặc yêu cầu kết thúc sẽ dừng phát thêm; lượng đã ra khỏi nguồn vẫn tiếp tục rơi và phiên chờ lượng đó xử lý xong. Không ép phản ứng sớm để đóng phiên. Khi tạm dừng, tuổi mẫu và lượng nhận không đổi. Tốc độ mô phỏng điều khiển cả tiến trình nhận và tọa độ hiển thị; không dùng đồng hồ thực riêng để kéo giọt tới đích.

Reset, đổi bài học, undo và redo đổi thế hệ phiên để điều khiển cũ không phát tiếp. Lịch sử lưu cả mẫu đang bay, phần tràn và chất thải. Phiên lưu dùng một bản ghi vật lý gồm các bình, đèn và inventory môi trường, tránh ghép bình nguồn đã bị trừ với hàng đợi từ một thời điểm khác. Tải lại có thể tiếp tục phần đã phát, dù thao tác nghiêng bình chưa hoàn thành không tự phát tiếp. Dữ liệu lưu kiểu cũ vẫn có nhánh đọc tương thích.

## Hiển thị dòng và kiểm chứng

Nhánh hữu hạn dùng một mesh ghép từ các khoảng phát thực. Phạm vi vẽ chạy từ đuôi đến đầu phần chất còn bay; không vẽ sẵn cả đường từ vòi tới đích. Mỗi khoảng dùng vị trí/vận tốc đã lưu, màu mẫu và bán kính từ Q/v. Đầu dòng tới sau thời gian bay; đuôi tiếp tục rơi khi ngừng phát. Dung lượng buffer tăng theo số mẫu thay vì bỏ bớt mẫu vì hết pool cố định. Đây vẫn là mesh ống xấp xỉ, chưa phải mô hình vỡ tia do sức căng bề mặt.

16 ca kiểm tra mới gồm nhận từng phần; bảo toàn nguyên tố/khối lượng có cặn và khí; trung hòa trước/sau tiếp xúc; nguồn bị xóa; đầy bình trong thời gian bay; cập nhật overflow nguyên tử; dời/xóa/vỡ/đậy đích; pause/time scale; hủy/commit; reset; undo/redo; lưu/khôi phục và lau dọn; tọa độ đầu/đuôi mesh đối chiếu gia tốc SI độc lập. Các ca rót trước đây được cập nhật để chờ chất tới nơi trước khi so tổng hai bình.

Kiểm chứng cuối đợt: **72 tệp, 973/973 tests đạt**; `npm run lint` (TypeScript), `npm run build` và kiểm tra whitespace diff đều đạt. Build vẫn cảnh báo bundle vượt 500 kB; bundle chính khoảng 3.607 kB trước gzip. Chưa có kiểm chứng WebGL/hình ảnh: lần chạy Chrome trước bị hệ thống tự động phê duyệt chặn (`blocked by policy`). Không suy FPS hoặc chất lượng hình ảnh từ tests headless.

Các phần vẫn phải nghiên cứu tiếp: màng chảy trên kính và thời điểm tiếp xúc thuốc thử; chất tràn từ mép xuống bàn; độ nhớt theo nhiệt độ/nồng độ; trao đổi nhiệt và bay hơi trong thời gian bay; chọn lọc lớp không trộn lẫn; cặn bị cuốn; vật cản khác; hình học SI đo từ dụng cụ thật. Nhánh thêm stock/Na có cơ chế tiếp xúc riêng và chưa được hợp nhất thành cùng inventory vận chuyển này. Các API chuyển trực tiếp vẫn là thao tác inventory tức thời, không tự trở thành hoạt ảnh đạn đạo.
