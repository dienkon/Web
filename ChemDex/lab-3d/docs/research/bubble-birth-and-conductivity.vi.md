# Thời điểm phát bọt, vị trí phản ứng và dẫn nhiệt khi ngưng tụ

Ngày kiểm tra: 14/11/2026. Phạm vi này là mô hình bọt trong chất lỏng và sương nước ngoài miệng bình. Kho chất và lượng nước bay hơi vẫn do engine hóa học/nhiệt sở hữu; các hạt hình ảnh không tạo thêm vật chất.

## Sai lệch và thay đổi

Trước đây engine tính đúng thời điểm credit của nguồn vượt một hạt, nhưng sau đó cho hạt mới chuyển động, tăng tuổi và ngưng tụ bằng **toàn bộ** bước 1/120 giây. Hạt sinh đúng cuối bước vì thế vẫn có một bước chuyển động trước khi tồn tại; bọt hơi nhỏ thậm chí có thể bị ngưng tụ ngay. `BoilingSystem` và `EvaporationSystem` nay dùng thời gian còn lại từ thời điểm sinh đến cuối bước cho mọi cập nhật của hạt mới. Hạt cũ vẫn nhận toàn bộ bước. Lịch sử nguồn đã xếp hàng, khoảng dừng và ngân sách số hạt giữ cơ chế cũ.

Với credit c và tốc độ q không đổi trong khoảng h, hạt thứ j vượt ngưỡng tại `(j − c) / q`. Thời gian tồn tại trong bước là `h − clamp((j − c) / q, 0, h)`. Đây là sự kiện lấy mẫu nguồn liên tục, không phải tăng tốc hay làm chậm phản ứng. Khi hai bọt nhập lại, cả hai đã tới cùng mốc cuối bước.

Nguồn hóa học trước đây cũng dùng vùng đáy được gia nhiệt. Engine nay nhận danh sách vị trí phản ứng đã tiếp xúc chất lỏng qua `reactionSources`: chọn theo trọng số, phát quanh điểm nguồn và đẩy tâm bọt ra ngoài bề mặt rắn theo pháp tuyến đã chuẩn hóa. Nguồn không có pháp tuyến được phân bố trong thể tích nhỏ quanh điểm tiếp xúc. Danh sách rỗng nghĩa là chưa có vị trí ướt: không phát bọt hóa học. Khi không có dữ liệu nguồn cụ thể, mô hình dự phòng phân bố trong thể tích chất lỏng. Bọt hơi do sôi giữ nguồn đáy. Mỗi snapshot sao chép tọa độ/pháp tuyến, nên việc di chuyển vật sau đó không sửa lịch sử đã nhận.

Mọi bọt được giới hạn trong lòng bình **trước** khi tính áp suất thủy tĩnh và vận chuyển, kể cả bình thẳng đứng. Bán kính vật lý dùng cho khí/áp suất vẫn tách khỏi việc thu nhỏ glyph để vừa hình học. Tọa độ nguồn dùng đơn vị model của bình; áp suất, dẫn nhiệt và chuyển động đổi sang SI qua `metersPerModelUnit(vesselProfile)`.

## Dữ liệu nhiệt và miền áp dụng

Nguồn chính là [IAPWS SR6-08(2011), tài liệu chính thức](https://iapws.org/technical-guidance/release/LiquidWater), [PDF](https://iapws.org/technical-guidance/release/LiquidWater.download), phương trình (8), bảng 6 và bảng kiểm chứng 8. Hàm mới tính λ theo T thay cho hệ số cố định 0,6 W/(m·K). Hai giá trị độc lập dùng trong test:

| T | λ, W/(m·K) |
| --- | ---: |
| 298,15 K | 0,606502308 |
| 375 K | 0,677913788 |

Hàm chỉ nhận 0–110 °C. Công thức là tham chiếu tại 0,1 MPa, gồm phần lỏng siêu nhiệt; mục 6 cho phép dùng ở áp suất từ bão hòa đến 0,3 MPa. Giá trị ngoài miền không được ngoại suy. Ước lượng bất định 1,5% của tài liệu dành cho vùng ổn định, không phải sai số toàn mô phỏng.

`condenseBubbleVapor` lấy λ tại nhiệt độ màng trung bình `(T_giao_diện + T_lỏng)/2`. Chỉ dùng correlation khi áp suất ngoài bằng 0,1 MPa hoặc nằm trong `[p_sat(T_màng), 0,3 MPa]`, đồng thời nhiệt độ nằm trong miền trên. Ngoài miền đó dùng hệ số tham chiếu 0,6 W/(m·K) đã có; đó là dự phòng minh họa, không phải tính chất nước được IAPWS xác nhận tại trạng thái ấy. Hệ số được truyền tường minh vẫn được tôn trọng để kiểm tra giới hạn giải tích.

Mô hình dẫn nhiệt hiện có là giới hạn cầu dẫn nhiệt tĩnh, Nu = 2: `Q̇ = 4πrλΔT`. Với bọt hơi thuần, không sức căng và áp suất cố định, cân bằng nhiệt ẩn cho `d(r²)/dt = −2λΔT/(ρ_hơi L)`. Test kiểm tra giới hạn này với giá trị λ công bố ở 375 K và kiểm tra tổng hơi còn lại cộng khối lượng ngưng tụ. Với bọt hỗn hợp, áp suất riêng phần quyết định ngưng tụ; phần khí không ngưng giữ nguyên.

## Kiểm chứng và giới hạn

`bubble_birth_and_conductivity.test.ts` kiểm tra giá trị IAPWS; chặn ngoại suy; dự phòng ngoài miền áp suất; sinh bọt/sương đúng cuối hoặc giữa bước; không ngưng tụ trước lúc sinh; pháp tuyến nguồn; snapshot bất biến; giới hạn hình học bình đứng; nguồn rắn khô; nguồn hóa học độc lập với nguồn hơi.

Các hồi quy pha bọt, tốc độ nổi, vòng đời nguồn, vận chuyển hơi và tư thế nghiêng chạy cùng suite. Lệnh kiểm tra:

Kết quả lượt kiểm tra cuối của phạm vi này: **6 file / 84 test đều qua**.

```powershell
npx vitest run tests/bubble_birth_and_conductivity.test.ts tests/bubble_phase_inventory.test.ts tests/bubble_source_lifecycle.test.ts tests/bubble_rise.test.ts tests/evaporation_transport_consistency.test.ts tests/tilted_particle_frame.test.ts --maxWorkers=2
npm run lint
```

Đây vẫn là mô hình giảm bậc. Kích thước/số glyph, dao động đường đi, biến dạng và sự tán sương chưa được hiệu chuẩn theo từng chất. Nu = 2 không giải lớp biên nhiệt quá độ hoặc tăng truyền nhiệt do đối lưu, cũng không giải khuếch tán khí hòa tan. Vị trí nguồn đúng không chứng minh động học tạo mầm, góc tiếp xúc, kích thước tách bọt hay tốc độ phản ứng đã đúng thực nghiệm. Hệ số λ của nước không mô tả mọi dung dịch đậm đặc. Các sửa đổi này loại sai lệch xác định được và bổ sung chuẩn tham chiếu; không xác nhận “chuẩn hoàn toàn” cho mọi hiệu ứng.
