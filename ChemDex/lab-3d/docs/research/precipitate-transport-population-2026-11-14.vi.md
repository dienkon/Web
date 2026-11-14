# Quần thể vận chuyển độc lập chất lượng vẽ — 14/11/2026

## Lỗi tái hiện được trước sửa

Trong cốc mô hình 100 mL chứa 10 mL nước và 0,01 g PbI₂ dạng phiến, cùng seed và sau 0,5 s: ngân sách 20 glyph cho 0,0100 g cặn; 140 glyph cho 0,006714 g; 900 glyph chỉ cho 0,001056 g. Ngân sách bằng 0 không bao giờ lắng. Nguyên nhân là reservoir vật chất đợi clock 64/260 glyph mỗi giây, nhưng trọng số mỗi glyph bằng lượng rắn chia ngân sách vẽ. Chất lượng cao khiến phần lớn rắn chưa được vận chuyển.

Hòa tan từng phần cũng chỉ cập nhật bán kính của những glyph đã sinh. BaSO₄ từ 1 g xuống 0,125 g làm bán kính đã xuất hiện giảm 0,5 → 0,25 µm; phần chất rắn cũ còn đợi clock tiếp tục sinh ở 0,5 µm. Lịch cấp hình vẽ vì thế tự quyết định kích thước và tốc độ lắng.

Khi khuấy lớp cặn, tọa độ tái huyền phù còn cộng ba lần bán kính **hiển thị**. Đổi bán kính glyph BaSO₄ từ 0,001 sang 0,05 scene đẩy cùng parcel từ y ≈ 0,1274 lên 0,2743. Offset tiếp xúc nay dùng bán kính vật lý; vùng trộn minh họa vẫn được khai báo riêng và không phụ thuộc phóng đại đồ họa.

## Mô hình vận chuyển sau sửa

`PrecipitationSystem.particles` là quần thể vận chuyển chuẩn với tối đa **128 parcel mỗi chất**, độc lập `maxParticles`. `maxParticles`/`setParticleBudget` chỉ chọn số parcel để vẽ. Renderer thủ công và tự động lấy mẫu cách đều trong quần thể, không thay RNG, khối lượng, vị trí, tuổi, trạng thái kết bông hoặc dòng lắng. Ngân sách vẽ bằng 0 vẫn tiến đầy đủ vật lý.

Lượng rắn chemistry đã cam kết được lấy mẫu tại đầu snapshot nguồn; không có thời gian chờ do tốc độ sinh glyph. Nó chỉ tiến trong khoảng thời gian được chấp nhận của snapshot đó. Backlog giữ nguyên thứ tự nguồn, vị trí tiếp xúc và môi trường. Đây là hợp đồng endpoint của engine hiện hữu, không phải mô hình tạo mầm hoặc thời gian cảm ứng đo thực nghiệm.

Nguồn bổ sung được chia thành parcel theo tỷ lệ khối lượng so với huyền phù hiện có. Nếu vượt 128, bộ lấy mẫu ưu tiên ghép parcel cùng kích thước hạt, sau đó vị trí gần nhau. Khi ghép, giữ khối lượng, động lượng và moment số hạt đặc `M/r³`; co rút khi hòa tan giữ moment số hạt, còn rút aliquot giảm nó theo tỷ lệ. Reservoir đông đặc và lớp cặn cũng giữ moment này để tan bớt rồi tái huyền phù không khôi phục bán kính ban đầu. Kết bông dùng quần thể moment hiện hữu của nó.

Ghép parcel **không phải kết tụ vật lý**. Với các cohort cùng bán kính, phép ghép không thay moment dòng lắng Stokes `Σ M r²`; kiểm thử giữ riêng hạt cũ đã tan nhỏ và hạt lớn vừa sinh. Nếu có hơn 128 cohort kích thước phân biệt, một parcel trung bình vẫn không giữ được toàn bộ phân bố kích thước hoặc mọi moment động lực. Tâm khối lượng sau ghép được đưa lại vào vùng ướt nếu nó nằm ngoài cổ/shoulder lõm hoặc mặt thoáng; việc chiếu chỉ đổi vị trí, không đổi khối lượng hoặc động lượng. Không tuyên bố đây là bộ giải tiếp xúc hoặc CFD.

Chủ động giới hạn số glyph hiển thị ở số parcel chuẩn (128 mỗi chất) trong vòng này. Atlas quang học vẫn dùng toàn bộ khối lượng. Mức chất lượng cao có ít glyph riêng lẻ hơn trước; không nhân glyph bằng offset tùy ý vì có thể tạo lại lỗi hạt nổi ngoài nước. Hình ảnh thực cần được kiểm tra cùng hiệu ứng mây và cặn.

## PbI₂: thời gian và chất mang

`partitionLeadIodide` trước đó dùng `min(dt, 0,5)`. Với 0,2 g rắn ở 95 °C trong nước, 0,8 s cho 0,109762 g còn rắn khi chạy một packet, nhưng 0,076579 g khi chia thành 2/8/80 packet. Nay dùng nghiệm exponential đầy đủ với endpoint giữ cố định. Hệ số 1,2/s và 0,35/s vẫn là nhịp minh họa, không phải hằng số hòa tan/kết tinh đo được.

Hàm cũng từng tạo 0,090238 g `PbI2(aq)` sau 0,5 s dù chất lỏng chỉ có hexane. Nay yêu cầu kho H₂O lỏng có thật; từ chối dung môi hữu cơ, hỗn hợp có dung môi lỏng khác, nước đá, mẫu khô, vùng nhiệt ngoài 0–100 °C và PbI₂ ở filter/foam. Muối aq đồng tồn tại được giữ, theo **proxy đường độ tan trong nước hiện hữu**; chưa có hiệu chỉnh ion chung, hoạt độ, phức chì–iodide hoặc nhiệt hòa tan.

Kiểm tra chất mang cũng dùng `partitionDryStock` chung: stock PbI₂ chưa chạm nước được giữ nguyên ngoài pool pha đang phản ứng. Dung dịch còn lại vẫn có thể kết tinh, và huyền phù đã khai báo vẫn có thể tan, cạnh một stock khô. Sau khi nhúng rồi nhấc stock lên, `transferSolidPhase` giữ metadata của phần chưa tan để bước kế tiếp không nhầm nó thành huyền phù. Lịch sử tổng PbI₂ bao gồm cả phần khô được bảo vệ; chưa phân chia tiêu hao riêng từng hạt stock khi chỉ một phần của nhóm tiếp xúc nước.

Theo [IUPAC: solubility](https://goldbook.iupac.org/terms/view/S05740), độ tan được định nghĩa cho chất tan và môi trường dung môi được chỉ định; điều này hỗ trợ việc không áp dụng đường nước cho hexane. [RSC: Golden rain](https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article) mô tả hòa tan nóng và kết tinh khi nước nguội. Hai nguồn không xác nhận polynomial hoặc hệ số động học đang dùng. Các fixture cũ chỉ khai báo scalar 100 mL nay bổ sung kho H₂O để thực sự kiểm tra hệ nước.

## Bằng chứng tự động và chi phí

Các regression trong `precipitate_transport_population.test.ts` so sánh **toàn bộ trạng thái** tại ngân sách 0/20/140/900, khi đổi chất lượng giữa chừng, thêm nguồn, hòa tan, đông/rã, cặn/tái huyền phù, hai cohort kích thước và centroid tại vai bình. Kiểm thử cũ về clock glyph được thay bằng tuổi kể từ snapshot vật chất; các kiểm tra mass, contact, lực cản và đồng hồ vật lý vẫn giữ.

Chạy `npx tsx scripts/auditPrecipitateTransportPopulation.ts` tạo `artifacts/precipitate-transport-population/audit.json`, không ghi đè baseline lịch sử. Audit 20 hệ, 4 chất, 4 s mô phỏng, bước 1/60 s, có tăng nguồn, lắng và khuấy. Lượt Node 26.7/Windows trên i5-12450HX cho trung bình **5,58–6,65 ms** và p95 **7,80–10,21 ms** mỗi batch 20 hệ; tối đa 128 parcel/chất, sai số mass tối đa 7,63×10⁻¹⁷ g. Ba ngân sách 0/35/900 cho hash trạng thái vật lý **giống hệt nhau**.

Đây chỉ là CPU của vận chuyển kết tủa sau warmup. Không gồm chemistry, React, dựng atlas, WebGL hoặc FPS. Không suy ra tốc độ thiết bị người dùng từ số này.

## Kiểm tra renderer và fixture

`auditPrecipitateFidelity.mjs` đã chạy renderer thật cho sáu mẫu 0,05 g / 30 mL: mỗi mẫu giữ 128 parcel chuyển động hữu hạn sau 4 s, bảo toàn 0,05 g; pause giữ nguyên trạng thái, khuấy tạo xoáy và loại hết rắn xóa mọi hệ kết tủa. Không có lỗi trang hoặc shader. Ba ảnh `artifacts/precipitate-fidelity/01-six-suspensions.png`, `02-stirred-suspension.png`, `03-dissolved.png` đã được kiểm tra: không thấy glyph thoát khỏi nước ở khung nhìn này, không có màu/hạt còn sót sau loại rắn. Đây là kiểm tra hình ảnh và vòng đời renderer, không phải xác nhận thực nghiệm phân bố hạt hoặc thời gian lắng.

Ellipse sáng ở giữa ảnh cũ là lỗi riêng của fixture: wrapper dịch sáu cốc thành lưới nhưng mọi `vessel.position` trong store vẫn bằng `[0,0,0]`, khiến sáu caustic cộng sáng cùng tâm. Fixture nay khai báo đúng world pose và truyền chính vị trí đó vào Beaker; caustic vẫn bật. Đối chiếu 3 điểm local/world của mỗi cốc với matrix thật sai khác tối đa 4,45×10⁻¹⁶ scene, cả sáu caustic nằm đúng dưới tâm cốc (sai khác < 8,9×10⁻¹⁶).

Hai assertion cũ của Fe(OH)₂/S dùng `p.radius * 2.01`, envelope của glyph trước đây. Renderer hiện dùng `readablePrecipitateRadius`, với mọi vertex của geometry full/reduced nằm trong unit ball. Các test nay kiểm tra riêng sphere vật lý và envelope đang vẽ ở cả hai chế độ phóng đại, đủ đáy/mặt thoáng/thành cốc; không đổi quỹ đạo vật lý để ép bán kính minh họa vừa nước. Trong ca Fe(OH)₂ cũ, đỉnh theo assertion lỗi là 0,500738 nhưng envelope thực cao nhất 0,498591 dưới mặt 0,5. Các kiểm thử độc lập chất lượng và bán kính đồ họa vẫn giữ nguyên.
