# Kết tủa trong vũng tràn — 2026-11-08

## Hành vi và nơi sở hữu

Kết tủa không còn đi qua renderer các mảnh rắn rời. Mỗi loài có phần lơ lửng và phần đã lắng; `contents` vẫn là kho chất duy nhất. `SpillState.suspension` chỉ phân chia lượng rắn đó, không tạo kho thứ hai. Độ đục đọc phần còn lơ lửng; lớp cặn đọc phần đã lắng. Lõi cập nhật qua `stepWorkbenchSpills`, renderer chỉ đọc. Bột kho chưa có pose cơ học dùng đống bột có thể tích hữu hạn; không đổi nhãn Fe bột thành thanh hoặc viên lớn.

Mỗi cohort lưu khối lượng còn lơ lửng và quãng rơi chuẩn hóa bởi chiều cao vũng. Tối đa 24 cohort mỗi loài, độc lập mức đồ họa. Cohort gần tuổi nhất được gộp theo khối lượng khi quá giới hạn; không thay tổng lượng rắn. Phần còn lại của khối lượng loài là cặn. Lượng rất nhỏ dưới 10⁻¹⁴ g được nhập vào cặn, không trừ khỏi inventory.

## Mô hình lắng và miền áp dụng

- Hạt tương đương hình cầu rơi trong vũng đứng yên, hỗn hợp loãng. Vận tốc cuối lấy từ `sphereSettlingSpeed`, cân bằng trọng lực–lực đẩy với cản Schiller–Naumann. Hệ số đối chiếu trong [mã nguồn OpenFOAM](https://cpp.openfoam.org/v12/SchillerNaumann_8C_source.html). Không dùng số glyph làm số hạt vật lí.
- Bán kính, mật độ, màu và loại hình thái kế thừa `SimulationConfig`; độ nén lớp cặn kế thừa `precipitatePacking`. Những bộ tham số này có phần **minh họa/chưa hiệu chuẩn**, không phải dữ liệu cỡ hạt đo cho mẫu vừa phản ứng. Cụm gel/floc đang dùng cầu tương đương với các giới hạn sẵn có, chưa có ứng suất chảy hoặc khối lượng riêng mạng gel được đo. Mẫu cực mịn có thể lắng chậm hơn nhiều so với bộ tham số hiện tại.
- Tính mật độ chất mang từ lượng lỏng/thể tích. Độ nhớt nước theo hàm dùng chung; dung dịch dùng nước làm proxy. Dung môi khác/pha chưa rõ cũng mang giới hạn proxy hiện có. Không tuyên bố có độ nhớt hỗn hợp đã đo.
- Phân bố ban đầu đồng đều theo thể tích. Tính tích phân thể tích dưới độ cao từ profile Young–Laplace dạng đoạn thẳng; diện tích tiết diện là bậc hai theo độ cao, tích phân là bậc ba. Lưu tích phân cộng dồn và tìm đoạn bằng nhị phân; không lượng tử hóa thể tích hoặc tuổi cohort để tiết kiệm CPU.
- Lượng sản phẩm vừa cam kết được sinh ở cuối khoảng cập nhật hóa học; không cho rơi qua khoảng thời gian trước khi nó tồn tại. Kết quả độc lập cách chia bước trong fixture có inventory/hình học/vận tốc không đổi. Phản ứng và thay hình học vẫn theo nhịp hóa học hiện tại; chưa bảo đảm toàn pipeline tái lập độc lập FPS cho mọi phản ứng.
- Khi thể tích đổi, dùng remap độ cao chuẩn hóa cùng phần còn sống có điều kiện. Chưa giải trường vận tốc khi vũng coalescence/khô, Brownian, cản do nồng độ cao, kết bông động hay tái huyền phù do tia rót. Bed cũ không tự bật lại thành cloud chỉ vì thêm nước.
- Ngoại hình hiện vẫn dùng thể tích lỏng để dựng mặt vũng; chưa cộng dịch chuyển do rắn vào nghiệm mặt ngoài. Miền dự kiến: thể tích vật liệu rắn ≤1% thể tích lỏng; `spillSuspensionAppearance.modelLimit` báo `solid-displacement-unresolved` khi vượt miền. Không coi mesh nước trong miền đặc là đã đóng ngân sách thể tích.

## Giao dịch và lưu trữ

Hòa tan giảm cả phần lơ lửng và cặn theo tỉ lệ lượng rắn thực bị tiêu hao. Gộp vũng giữ cặn cũ và cohort cũ; phần kết tủa đi theo aliquot mới được giả định đã trộn khi đáp xuống vũng. Không chuyển lịch sử hạt đầy đủ từ bình/luồng sang vũng. Lau mẫu là bộ thu lý tưởng toàn chiều sâu theo mô hình cũ: tách cùng tỉ lệ các chất, cohort và cặn, không nhân đôi lượng chất còn lại.

Bản lưu cũ không có lịch sử lắng dùng `legacy-settled-estimate`, không hồi sinh một đám huyền phù cũ. Bản lưu mới giữ cohort bất biến và tiếp tục khi đọc lại. Pause dừng nhịp cập nhật và ghi checkpoint đầy đủ. Vũng đang đổi trạng thái được checkpoint tối đa mỗi hai giây thời gian thực, cộng debounce ghi một giây; pause yêu cầu ghi ngay theo debounce. Undo/Redo vẫn chụp toàn bộ vật chất.

## Ngoại hình và giới hạn quang học

Đục là mô hình minh họa cùng thang 1 g/L, cự li 1 cm của quang học hiện có, không phải phép đo NTU/phổ tán xạ. Màu các loài trộn theo đóng góp quang học trong không gian tuyến tính. High thêm thành phần tán xạ có chiếu sáng trong shader truyền sáng. Low dùng lớp alpha được chiếu sáng riêng, giữ phản xạ mặt nước riêng để không cộng màu sau tone mapping đến mức cháy sáng. Không tạo thêm hệ phát hạt liên tục.

Lớp cặn trải theo dấu chân vũng, có thể tích `m/(rho*phi)`, dùng mesh đóng của vũng co theo trục y. Không thay geometry mỗi khi đổi lượng chất. Độ phủ quang học phụ thuộc độ dày thật và cùng hệ số theo khối lượng của phần huyền phù; lượng cực nhỏ không sơn kín cả mặt bàn. Alpha hash minh họa độ phủ vi hạt, không phải vị trí/count hạt được phân giải. Các cụm gel, tinh thể và bột vẫn cần mô hình hình học chi tiết hơn khi quan sát sát.

Cặn khô và bột kho không có pose dùng hình nón hữu hạn, góc nghỉ 28° minh họa và packing 0,55 cho bột kho; cặn giữ packing theo loài hiện có. Không gọi đây là kết quả DEM/va chạm bột hoặc luật co gel khi sấy. Vật rắn đã có `stockMotion` tiếp tục đi theo Worker, không bị renderer legacy này thay thế.

## Bằng chứng

`tests/spill_suspension.test.ts`: CDF cột đều; đối chiếu tích phân theo bán kính độc lập ở 0,001/1/100 mL; chia bước 20/30/60/120 FPS; thời điểm sinh lượng mới; lưu JSON; pha đông/khô; hòa tan; gộp; lau; 300 lần sinh lượng mới giữ ≤24 cohort; thể tích mesh/lớp bột; độ mạnh quang học tích phân không đổi khi cùng lượng chất chuyển xuống cặn. Đây là kiểm chứng số theo fixture, không chứng nhận thời gian lắng mẫu thật.

`scripts/benchmarkSpillSuspension.ts`: 100 vũng ×24 cohort, 120 bước đo sau 10 bước làm nóng. Bản dựng thử tích phân lặp lại tốn trung bình 228,25 ms/bước; bản tra cứu chính xác còn trung bình 1,11 ms, p95 1,88 ms trên máy kiểm tra. Đó là so sánh hai cách thực hiện mô hình mới, không phải so sánh FPS ứng dụng trước/sau. Không có WebGL trong benchmark.

`scripts/auditSpillSuspension.mjs`: bốn phản ứng thật trong vũng (Cu(OH)₂, Fe(OH)₃, AgCl, PbI₂), Fe bột legacy 1 g; ảnh lúc còn huyền phù/sau lắng; pause; checkpoint và đọc lại; 30 lần thay mẫu nóng. Tổng vật chất fixture giữ 41,2631308 g; GPU buffer 366 trước và sau churn. Chrome low/high desktop và low viewport cảm ứng không có lỗi trang/console/mất WebGL. Viewport cảm ứng không thay kiểm tra thiết bị thật. Ảnh/JSON ở `artifacts/spill-suspension`.
