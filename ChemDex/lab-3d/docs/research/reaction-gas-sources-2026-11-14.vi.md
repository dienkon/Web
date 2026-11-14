# Vị trí sinh bọt phản ứng

## Cơ sở và lỗi cũ

Bọt khí phản ứng từng dùng cùng nguồn ở đáy bình với bọt hơi sôi. Zn/HCl, Mg/HCl và H₂O₂/MnO₂ vì thế có thể phát bọt ở chỗ không có chất phản ứng. Nhánh tự động còn đưa mL khí/giây vào tham số nhận số ký hiệu bọt/giây, trong khi nhánh thủ công dùng gói hiển thị 0,05 mL: ở miền chưa chạm giới hạn hiển thị, mật độ bọt lệch 20 lần.

[Harvard: Metals in acid](https://sciencedemonstrations.fas.harvard.edu/presentations/metals-acid) mô tả kẽm chìm và sinh bọt, còn magie có thể chuyển động ở bề mặt. [University of Washington: Decomposition of H₂O₂ with MnO₂](https://chem.washington.edu/lecture-demos/decomposition-h2o2-mno2) ghi nhận khí oxy sinh ra khi peroxide tiếp xúc chất xúc tác rắn. [RSC: Hydrogen peroxide decomposition using different catalysts](https://edu.rsc.org/experiments/hydrogen-peroxide-decomposition-using-different-catalysts/831.article) giải thích ảnh hưởng diện tích tiếp xúc của bột xúc tác.

## Thực hiện

- `reactionGasSources` chỉ lấy chất rắn có vai trò chất phản ứng hoặc xúc tác trong chương trình đang sinh khí. Nó lấy mẫu diện tích trên lưới stock dùng chung với renderer, biến đổi theo vị trí hạt và ma trận bình thật, rồi loại mặt khô, ngoài bình hoặc ép vào kính. Chương trình đồng thể dùng vùng tiếp xúc rót còn hiệu lực; hết vùng tiếp xúc thì phân bố nguồn trong thể tích lỏng.
- Bọt đi ra theo pháp tuyến ngoài của mặt rắn. Khi không còn nguồn rắn ướt, mảng nguồn rỗng chặn sinh bọt mới. Receipt chỉ khi có khí vừa sinh giữ bản sao các hàng chất rắn và tư thế hạt trước bước đó; nhờ vậy kể cả liều rất nhỏ bị tiêu thụ hết ngay bước đầu vẫn có nguồn đúng. Bước kế tiếp không sinh khí không giữ bản sao này. Snapshot chỉ để quan sát, không thêm chất rắn vào ledger. Chất rắn dư không tham gia phản ứng không trở thành nguồn thay thế.
- Bọt hơi sôi vẫn dùng vùng đáy được gia nhiệt. Nguồn phản ứng không thêm mol khí hoặc nhiệt vào ledger.
- Tự động và thủ công cùng dùng `gasVisualState().bubbleRate`, gồm nhiệt độ và áp suất môi trường thật của mẫu. Số ký hiệu vẫn bị chặn theo ngân sách, không phải số bọt vật lý đo được.
- Store giữ ID phản ứng vừa thực sự tiến triển để nguồn khí cuối vẫn được nhận diện sau khi bộ điều khiển kinetics kết thúc.

## Giới hạn và kiểm tra

Nguồn này là phép mô tả vị trí sinh bọt, chưa giải phương trình tạo mầm, siêu bão hòa, góc tiếp xúc, tách bọt hay độ ướt bề mặt. 32 mẫu diện tích mỗi lưới và tối đa 128 vùng nguồn trên một bình là phép xấp xỉ hữu hạn; lấy mẫu phân tầng theo tổng diện tích giữ nguyên tổng trọng số. Bột đang chuyển động dùng vỏ của hạt đại diện tiếp xúc; chưa phân giải từng hạt xúc tác hoặc toàn bộ mặt trong lớp bột. Lưới khối lượng chuẩn và bề mặt đống bột được cache có giới hạn.

`reaction_gas_sources.test.ts` kiểm tra vùng rót còn/hết hiệu lực, Zn tĩnh, hạt động và ma trận bình, mặt nghiêng, chất rắn khô, MnO₂, chất rắn không liên quan, nguồn kết thúc và tích hợp manager. `auto_manual_core_parity.test.ts` so sánh tốc độ gói bọt tự động/thủ công. `gas_flux_and_plume.test.ts` kiểm tra ID nguồn còn đúng khi xung khí cuối xuất hiện sau khi kinetics kết thúc.
