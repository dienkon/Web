# Phoi đồng chạm đáy và chi phí va chạm — 15/11/2026

## Ca lỗi

Trong thí nghiệm Cu/AgNO₃ tự động, phoi Cu rơi xuyên đáy trước khi dung dịch tới. Một body riêng khối lượng 0,0052955 g, scale 0,0008392 m, tâm ban đầu y=0,0055146 m vẫn xuyên đáy khi vận tốc ban đầu bằng zero. Vì vậy diện tích ướt bằng zero và phản ứng không tiến triển. Giới hạn tiếp xúc hóa học là đúng; bỏ giới hạn đó chỉ che lỗi cơ học.

Một convex hull bao toàn bộ phoi cong lấp cả khoảng trống bên trong. Đổi tần số tiếp xúc, số vòng solver hoặc chỉ tăng CCD không khắc phục đáng tin cậy các góc rơi. Cần biểu diễn các đoạn dây thật.

## Mô hình sửa

`stockSolidGeometry` giữ 32 đoạn đường tâm và bán kính đã chuẩn hóa cùng lưới phoi. `StockWorld` tạo các capsule liên tiếp trên một rigid body. Có thể gộp tối đa hai đoạn nếu bán kính được tăng đủ để bao cả đường tâm gốc, sai lệch dưới 50 µm và dưới 20% bán kính dây. Mẫu nhỏ dùng 16 capsule; mẫu 0,05 g giữ 32 vì sai lệch dây cung khoảng 55 µm. Mỗi collider nhận tỷ lệ khối lượng theo chiều dài cung gốc; tổng body chỉ có một lần khối lượng lõi cộng lớp bám. Kho hóa học và lực nổi dùng thể tích vật liệu riêng, không cộng thể tích phần giao nhau của các capsule. Lớp kim loại bám tăng bán kính va chạm theo thể tích compact tương đương, chưa giải từng nhánh dendrite.

Các phép thu hạt, tiếp xúc thành và lực đỡ xét tất cả collider của body. Hạt ngủ chỉ được nhận là có tiếp xúc khi còn manifold gần mặt đỡ; không gắn cờ chạm đáy từ lịch sử hoặc ép tọa độ hạt lên một mặt phẳng.

Khi phản ứng thay lượng chất, khối lượng cơ học, thể tích lực nổi và kích thước lõi hiển thị được cập nhật ở mỗi bước. Hình va chạm chỉ được giữ lại khi độ dịch hai đầu capsule cộng thay đổi bán kính không quá 5 µm so với lần dựng hình gần nhất. Mốc so sánh không trượt theo từng bước nhỏ; sai lệch tích lũy vượt ngưỡng phải dựng lại. Cách này giữ các tiếp xúc đang ổn định, không chia lại lượng chất hay làm chậm phản ứng.

Bán kính phủ giải từ thể tích capsule hữu hạn `πr²L + 4πr³/3`, giữ nguyên bán kính dây khi chưa có lớp phủ. Chỉ dùng thể tích trụ `πr²L` sẽ làm bán kính tăng vô hạn khi lõi gần tan hết và L tiến về zero. Hồi quy lõi Cu 10⁻¹¹ g còn 0,003 g Ag kiểm vỏ khoảng 0,41 mm, tiếp xúc đáy và tải trọng đầy đủ; lớp kim loại không biến thành một vật đỡ khổng lồ.

API bên ngoài giữ đơn vị SI. Nội bộ Rapier vẫn đổi mét sang centimét để ổn định hình học f32. `lengthUnit` là kích thước đặc trưng cho bài toán, không phải hệ số đổi đơn vị: đặt bằng 100 khiến broad phase coi vật thể đặc trưng lớn một mét. Đặt bằng 1 tương ứng một centimét trong tọa độ solver. Sai số tuyến tính 0,001 đơn vị solver tương ứng 10 µm; khoảng dự đoán 0,002 tương ứng 20 µm, kết hợp hard CCD cho va chạm lúc rơi. Ngữ nghĩa tham số đối chiếu trực tiếp bản Rapier 0.21.0 cài trong dự án, `dynamics/integration_parameters.d.ts` và `geometry/collider.d.ts`.

## Kiểm chứng

`stock_wire_contacts.test.ts` thả năm trường hợp khối lượng 0,001–0,05 g, nhiều góc và tốc độ tới 1,2 m/s. Kiểm tra đỉnh thấp nhất của lưới hiển thị ở mỗi bước; ngưỡng xuyên cho phép trong hồi quy là 50 µm. Khi dừng phải có tiếp xúc thật, khoảng hở lưới–đáy dưới 50 µm, vận tốc dưới 0,005 m/s và khối lượng giữ nguyên. Mẫu phủ bạc kiểm tải trọng gồm cả lớp phủ và thu lại qua đoạn dây đang chạm bình. Hai trăm bước co rất nhỏ kiểm sai lệch hình học không tích lũy vô hạn, khối lượng/kích thước lõi và tải trọng cuối vẫn đúng.

`metal_auto_contact.test.ts` chạy chuỗi tự động Cu/AgNO₃ từ việc chuyển liều đến sinh bạc; kiểm lớp bạc có nguồn gốc và tổng khối lượng bằng lượng được ledger sinh ra. Audit trình duyệt còn kiểm thể tích lưới lớp bạc cùng diễn tiến tự động. Không mở rộng thời hạn test để che chi phí tăng.

`scripts/auditStockWirePerformance.ts` ghi riêng thời gian CPU, thời gian thực, số frame, thời gian mô phỏng, tiếp xúc và tiến độ. Không dùng một timeout để suy rằng phản ứng bị kẹt hoặc để quy toàn bộ chậm trễ cho CPU. Artifact `artifacts/copper-wire-contact/timing.json` không bao gồm renderer hay FPS toàn ứng dụng.

Lượt audit cuối sau tối ưu cắt thể tích: Cu/Ag đạt tiến độ 0,150095 sau 1.288 frame / 21,4667 s mô phỏng; 12/12 carrier ngập nước, bạc bám 0,0323809067 g. Thời gian thực 9,16 s, CPU 9,687 s. Với 12 phoi khô, số cặp ứng viên đếm theo hai chiều là 672; cả 12 nghỉ trên đáy ở 0,8 s mô phỏng, 0,2 s tiếp theo tốn 2,68 ms. Đây là mẫu đo cụ thể trên máy hiện tại; không suy ra FPS tương tác từ phép chạy không renderer.

Kết quả cuối và hiệu năng tích hợp được ghi trong [kế hoạch nâng cấp](realism-upgrade-plan-2026-11-14.vi.md) sau lượt tổng kiểm tra. Vỏ capsule là xấp xỉ tiếp xúc của dây cứng; chưa mô phỏng biến dạng phoi hoặc hình học nhánh kim loại bám.
