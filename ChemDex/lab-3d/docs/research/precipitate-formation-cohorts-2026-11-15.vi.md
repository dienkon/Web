# Giữ lịch sử bột mịn và tinh thể khi cùng công thức — 15/11/2026

## Sai lệch đã tái hiện

Với 0,2 g PbI₂ mịn trong 100 mL nước, giữ 95 °C trong 1 s theo mô hình pha hiện hữu còn 0,060238842 g rắn. Chuyển xuống 20 °C chỉ 0,001 s sinh thêm 0,000019233 g, nhưng code cũ gán lại toàn bộ hàng rắn thành `CRYSTAL_PLATE`: **99,968% phần rắn cũ bị đổi hình thái mà không có chuyển vật chất tương ứng**. Hạt cũ vẫn giữ bán kính vật lý khoảng 0,698 µm nhưng hình vẽ chuyển thành phiến, đồng thời hệ số đục của toàn bộ huyền phù đổi 0,85 → 0,25.

Sai lệch còn tác động trực tiếp vận chuyển: hai hàng 0,1 g bột + 0,1 g phiến gộp theo công thức, lấy formation của hàng cuối. Chỉ đảo thứ tự inventory tạo quần thể toàn 1 µm hoặc toàn 50 µm. Khối lượng vẫn đúng nhưng tốc độ lắng, độ đục và hình hạt tùy thứ tự dữ liệu.

## Hợp đồng sau sửa

`partitionLeadIodide` giữ formation của phần rắn sống sót. Chỉ phần tăng rắn thực sự từ pha hòa tan nhận route mới. `transferSolidPhase` chỉ gộp tăng trưởng vào hàng tự do có cùng formation; không gộp nó vào bột cũ hoặc kim loại có provenance bám. Hòa tan vẫn chia giảm khối lượng theo mô hình pha hiện hữu; không tự thay đổi tổng Pb/I. Tiêu hao stock dùng phần tiếp xúc đủ điều kiện và phân bổ vào carrier đang ướt, giữ phần khô cùng metadata của nó.

API `precipitateComponents` vẫn trả tổng theo công thức cho chemistry/UI; formation hỗn hợp không còn tùy hàng cuối. `precipitateCohorts` tạo khóa ổn định cho các profile khác nhau được hỗ trợ: mặc định, PbI₂ phiến, PbCl₂ kim. Các nhãn chưa có profile riêng không nhân thêm quần thể. Mỗi cohort giữ tối đa 128 parcel, clock, khối lượng, cặn và moment kích thước riêng; display budget chỉ chia lượt vẽ. Màu/độ đục được cộng từ các cohort hiện hữu. Khóa mặc định vẫn là công thức; khóa dạng đặc biệt có hậu tố `|CRYSTAL_PLATE` hoặc `|CRYSTAL_NEEDLE`.

Renderer thủ công và Auto dùng batch geometry riêng cho từng cohort. Thay nhãn UI, đổi thứ tự hàng, pause hay đổi quality không được thay hình thái/vận chuyển của cohort khác. Khi một cohort hết vật chất, chỉ hệ của cohort đó được xóa.

Dữ liệu lưu cũ có thể chỉ ghi hình thái trên bình. Trước khi phản ứng hoặc nhập mẫu mới thay đổi inventory, cách hiểu cũ được ghi thành metadata của từng hàng kết tủa. PbI₂/PbCl₂ mới tạo ở dạng bột mang nhãn `FINE_POWDER` rõ ràng, để nhãn tinh thể cũ trên bình không đổi hình của vật chất mới, và vật chất mới không xóa hình thái của phần cũ.

Rót/aliquot giữ lượng huyền phù và bộ đếm rút theo cohort, đồng thời giữ tổng công thức để tương thích. Bột đang lơ lửng có thể đi theo nước trong khi phiến đã lắng còn lại. Những lần rút liên tiếp trước frame vật lý kế tiếp trừ lượng đã cam kết. Kim loại bám được trừ đúng trên hàng chứa nó, không dàn phép rút lên hàng bám. Cặn có sai số cộng parcel cỡ 10⁻¹⁶ g không được phát sinh hàng outgoing mới; dùng cùng ngưỡng tồn kho 10⁻¹² g của transport. Aliquot nhập và spill nhập giữ formation/provenance riêng.

## Bằng chứng và giới hạn

`precipitate_formation_cohorts.test.ts` kiểm tra làm nóng một phần rồi tạo rất ít phiến, đảo thứ tự dữ liệu, ba chu kỳ nóng/lạnh, loại riêng cohort, chất lượng hiển thị, rút nhiều aliquot khi phiến đã lắng, tăng trưởng bên cạnh hàng cũ/bám và nhập giọt có hai tốc độ lắng. Các regression về clock, radius độc lập display và vận chuyển aliquot cũ tiếp tục được chạy. `scripts/auditPrecipitateFormation.mjs` dùng fixture renderer thật để kiểm tra hai batch geometry, khối lượng, pause và remount quality; kết quả lưu ở `artifacts/precipitate-formation`.

[St. John Fisher — Golden Rain](https://citadel.sjfc.edu/faculty/aignatchenko/Golden-rain.html) mô tả kết tủa khi trộn, hòa tan nóng và tinh thể xuất hiện khi dung dịch nguội. [MIT Chemistry — Growing Quality Crystals](https://chemistry.mit.edu/facilities-and-centers/x-ray-diffraction-facility/growing-quality-crystals/) phân biệt tạo mầm và tăng trưởng, đồng thời mô tả chu kỳ hòa tan một phần rồi lớn lên. Những nguồn này hỗ trợ yêu cầu giữ lịch sử quần thể; chúng **không** hiệu chuẩn bán kính 1/50 µm, hình glyph hoặc nhịp thư giãn pha đang dùng.

Đây là sửa mất provenance và phân bổ vật chất, chưa phải mô hình nucleation/growth theo quá bão hòa. Tăng rắn hiện được đưa vào cohort có profile minh họa; chưa giải diện tích mặt tinh thể, ripening, kích thước phụ thuộc tốc độ nguội, hoạt độ/ion chung/phức iodide hoặc lắng phiến theo hướng. Hòa tan còn co đều đại diện thay vì luật theo diện tích từng tinh thể. Runtime giữ phân bố parcel; aliquot vẫn chỉ vận chuyển formation và lượng chất, chưa lưu đầy đủ phân bố kích thước của mọi hạt trong vật mang mới.
