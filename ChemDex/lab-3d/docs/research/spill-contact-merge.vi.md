# Gộp vũng theo tiếp xúc, không hút chất từ xa

## Bằng chứng ban đầu

Vòng atomic shatter trước thay code và có 13 test mới, phân loại có tiến triển. Kiểm tra `mergeWorkbenchSpill` xác nhận luật cũ chọn record đầu tiên có khoảng cách nhỏ hơn `max(0.35, oldRadius*0.9)`. Nó không xét bán kính lượng chất vừa tới, có thể gom hai giọt nhỏ còn cách nhau, bỏ sót một giọt lớn vừa chạm, và chỉ lấy một neighbour dù lượng chất mới nối hai vũng. Dry powder cũng nhận vùng capture tối thiểu này.

## Hợp đồng tiếp xúc

Mỗi wet footprint dùng bán kính Young–Laplace từ thể tích theo mô hình nước/góc tiếp xúc mặc định hiện có. Record radius legacy không được dùng làm bằng chứng tiếp xúc. Hai footprint chỉ đủ điều kiện gộp khi khoảng cách XZ nhỏ hơn hoặc bằng tổng hai bán kính, với tolerance 1e-10 scene unit chỉ cho làm tròn số. Một khoảng hở đo được không được biến thành chất đã tiếp xúc.

Dry inventory chưa có mô hình footprint rắn định lượng, nên chỉ các điểm khô trùng nhau trong tolerance số mới gộp. Dry/wet giữ thành record riêng kể cả trùng vị trí: không tự xem nước đã hòa tan, cuốn hoặc kéo cả cặn vào mình. Điều này chưa giải wetting/phản ứng/hòa tan chất rắn trên bàn.

Metadata `liquidLayer` và nhận diện H₂O/aq cho phép giữ các family khai báo khác nhau riêng biệt. Một record không rõ family không thể nối xuyên để gộp hai family đã biết khác nhau. Nếu dữ liệu không xác định incompatibility, code vẫn có giả thiết compatibility cũ; đây không phải bảng miscibility cho mọi dung môi. Composite nhiều pha, spreading coefficient và interfacial tension chưa được giải. Việc giữ hai record riêng cũng chưa dựng được hình compound drop đúng tại chỗ hai pha chạm.

## Connected component và lượng chất

Traversal bắt đầu từ footprint vừa tới và đi qua các cạnh tiếp xúc của **hình học ban đầu**. Lấy cả connected component có family tương thích, không dừng ở record đầu tiên. Không dùng bán kính của hình tròn cuối để kéo thêm một record chưa nối tiếp xúc vào receipt này. Gộp do sự lan/relaxation sau đó cần mô hình động lực học riêng.

Record cũ được xét theo key ổn định, nên cùng dữ liệu với thứ tự insertion khác nhau cho kết quả như nhau. Một ID đại diện được giữ, các ID đã nhập bị xóa cùng transaction. Record ngoài nhóm giữ nguyên tham chiếu. Component mass, moles, volume và initial-extensive metadata được cộng đúng một lần; phase/state/layer/provenance khác nhau không bị đè nhau. Hazard flag là OR của nhóm và receipt mới.

Tâm mới dùng khối lượng làm trọng số ở XZ để giữ mass first moment, với giả thiết relaxation không giải horizontal substrate impulse. Nếu tổng khối lượng bằng zero nhưng có thể tích thì dùng thể tích làm fallback. Đó là quy ước cho bước gộp tức thời, không phải một định luật chuyển động của contact line trên mọi bề mặt. Các test invariant dùng input định lượng tổng hợp, không xác nhận một recipe dung dịch thực nghiệm.

Bán kính cuối tính lại từ tổng thể tích. Đây vẫn là hình cân bằng tròn xoay giả định wetting đồng nhất; không mô tả neck growth, oscillation, contact-angle hysteresis hay pinned footprint. Màu giữ từ record đại diện, chưa có optical mixture calibration. Aqueous concentration được suy lại từ moles/tổng thể tích khi không có organic layer; trường concentration không có cơ sở trong composite nhiều pha bị bỏ thay vì giữ số cũ sai.

## Chi phí và cache

Một WeakMap lưu derived radius theo object và thể tích. Vũng không đổi không cần giải Young–Laplace lại mỗi khi receipt mới tới, kể cả cache solver 128 nghiệm đã bị luân chuyển. Đổi volume invalidates derived footprint; đổi radius metadata không làm thay đổi tiếp xúc thực. New/merged/normalized records được seed cache từ nghiệm đã có. Family cũng được tính một lần cho mỗi candidate trong một transaction.

Đây chưa phải benchmark UI. Graph scan có thể có chi phí lớn với nhiều record; initial solve/merge thể tích lớn vẫn đồng bộ. Chưa có spatial index hoặc worker.

## Kiểm chứng

13 test mới trong `tests/spill_contact_merge.test.ts`: giọt nhỏ tách rời; giọt tới lớn; legacy radius sai; volume invalidation; tangent/gap; nối hai neighbour và giữ record ngoài; connected chain; deterministic record order; mass/volume/moles/component metadata; mass first moment cho mật độ khác nhau; dry/wet và dry point; explicit layer incompatibility qua unknown bridge; hazard và finite aqueous dilution.

Test component-state cũ dùng hai receipt **ướt** khi kiểm tra metadata gộp, không còn dựa vào việc hút một dry inventory vào vũng. **136 file, 1552/1552 test đạt; lint/build đạt**, Vite còn cảnh báo chunk lớn. Chưa xác nhận WebGL hoặc benchmark thực nghiệm cho coalescence.

## Nguồn và giới hạn vật lý

[Xu et al., JFM (2023), Coalescence of immiscible sessile droplets on a partial wetting surface](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/coalescence-of-immiscible-sessile-droplets-on-a-partial-wetting-surface/F2C07A5970FF791F6BCC78F20CFA14C0) nghiên cứu sự phát triển cầu lỏng, dao động và hình ghép bao một phần khi hai chất không trộn lẫn gặp nhau. Kết quả này là lý do không coi cộng inventory thành một mẫu đồng nhất là nghiệm vật lý đa pha. Graph contact và tâm khối lượng ở đây là closure của dự án, không phải correlation được lấy hoặc hiệu chuẩn từ bài báo.

Wetting, dissolution/chemistry trên bàn, film drainage trước coalescence, vật cản, transport/relaxation và runoff vẫn mở. Toàn mục tiêu chưa đạt.
