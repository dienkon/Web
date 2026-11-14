# Tiếp xúc rắn–lỏng trước khi phản ứng

## Lỗi đã tái hiện

Với cùng 0,1 g Zn và 0,01 mol HCl trong 30 mL dung dịch, đặt hạt Zn ở tọa độ cục bộ y = −0,7 (ướt) hoặc y = +0,6 (khô) trước đây đều tăng tiến độ `0.004434855337256086` sau 0,1 giây. MnO₂/H₂O₂, Fe/CuSO₄ và CaCO₃/HCl cũng tăng tiến độ giống nhau khi đổi vị trí hạt từ dung dịch lên không khí. Hình ảnh đã loại nguồn bọt khô, nhưng ledger vẫn tiêu thụ chất, sinh khí và trao đổi nhiệt. Đây là mâu thuẫn giữa hình học và phản ứng, không phải sai số của hằng số tốc độ minh họa.

## Cơ sở

[University of Washington, Decomposition of H₂O₂ with MnO₂](https://chem.washington.edu/lecture-demos/decomposition-h2o2-mno2) có thí nghiệm treo túi MnO₂ phía trên peroxide, rồi thả túi vào dung dịch để bắt đầu phản ứng xúc tác. [Harvard, Metals in Acid](https://sciencedemonstrations.fas.harvard.edu/presentations/metals-acid) mô tả Zn/Mg sinh bọt sau khi đưa vào HCl. [OpenStax Chemistry 2e, Factors Affecting Reaction Rates](https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates) giải thích phản ứng dị thể xảy ra tại mặt tiếp xúc và phụ thuộc diện tích tiếp xúc. Các nguồn này xác nhận điều kiện tiếp xúc và xu hướng, không cung cấp hằng số tốc độ cho mẫu 3D.

## Thay đổi

- `stockLiquidContactFraction` dùng tư thế hạt vật lý, lưới chất rắn cùng renderer và lấy mẫu diện tích để xác định phần mặt rắn tiếp xúc pha nước. Bình nghiêng dùng mặt thoáng ngang theo trọng lực; khi có hai lớp lỏng, chỉ vùng pha nước cấp tiếp xúc cho phản ứng dung dịch.
- Các mô-đun lưới, bố trí stock và đống bột chuyển về `science`; đường dẫn component cũ chỉ re-export. Tính tiếp xúc không phụ thuộc React hoặc renderer. Mẫu bề mặt được dùng chung cho stock ngoài bàn, stock trong bình và vị trí sinh bọt.
- Chất rắn/catalyst của phản ứng rắn–lỏng và hòa tan phải có mặt ướt trước khi thời gian phản ứng tiến triển. Nếu khô hoàn toàn, tiến độ, khí phản ứng và nhiệt phản ứng không tăng. Tỷ lệ diện tích ướt nhân với thời gian tiếp xúc của luật tốc độ minh họa hiện có. Không nhân thêm vào số mol hoặc nhiệt sau khi ledger đã tính.
- Bộ giải native tức thời được truyền hình học mẫu sau khi nhận chất. Các ứng viên rắn–lỏng khô không được tiêu thụ ngay khi rót/thêm thuốc thử. Khi không có chương trình progressive phù hợp, native vẫn giữ mô hình endpoint khi có tiếp xúc; chưa biến mọi phản ứng tức thời thành luật động học.
- `partitionDryStock` tách stock khô khỏi kết tủa ướt và dung dịch, giữ nguyên metadata mỗi hàng. Native dùng cùng tập thuốc thử đủ tiếp xúc cho lựa chọn, giới hạn lượng và tiêu thụ; Na₂CO₃(aq) không cho phép tiêu thụ Na₂CO₃(s) đang khô. Replay progressive dành trước lượng stock khô còn tồn tại, nên nhấc stock sau một phần phản ứng không làm nó tan tiếp hoặc khôi phục lượng đã tiêu thụ. Các stage nhôm không có program cũng dùng cùng ràng buộc.
- Cân bằng đồng–ammonia tách stock Cu(OH)₂ khô khỏi pool cân bằng nhưng vẫn cho phép phức hóa đồng đã hòa tan. Khi pool tham gia thay đổi do nhấc stock, nhánh này tiến triển từ kiểm kê hiện tại theo bước thời gian, tránh replay endpoint cũ hòa tan hoặc khôi phục stock ngoài dung dịch. Stock còn lại giữ nguồn gốc khi một phần đã hòa tan.
- Phản ứng khí–rắn và nhiệt phân rắn khô vẫn theo điều kiện hoạt hóa hiện có. Sản phẩm nước lỏng của nhiệt phân không bị nhầm thành yêu cầu nước ở đầu vào.
- Thiếu tư thế hạt dùng bố trí stock tĩnh cùng renderer. Kết tủa chưa phân giải từng hạt và chất rắn không có hình học/density đã biết vẫn giữ giả định tiếp xúc bulk hiện có, thay vì đoán tọa độ mới.
- Kiểm tra toàn bộ autoplay phát hiện mẫu K/H₂O chỉ có 0,036 mL nước stoichiometric trong bình 100 mL, trong khi mẫu Na/H₂O đã có 30 mL. Mẫu K dựng sẵn được sửa dùng cùng ngân sách nước 30 mL; lượng K vẫn hữu hạn và giới hạn sản lượng H₂. Mẫu người dùng tự pha với ít nước không bị thêm dung môi.

## Giới hạn

Không giải thấm ướt mao quản, màng chất lỏng còn bám sau khi nhấc hạt, truyền khối khuếch tán hoặc tiếp xúc riêng của tia rót trước khi chất lỏng vào bulk. Lấy mẫu diện tích là xấp xỉ hữu hạn; cạnh giao mặt thoáng thay đổi theo độ phân giải mẫu. Vortex chưa truyền trực tiếp vào điều kiện hóa học: dùng mặt thoáng thủy tĩnh theo tư thế bình. Phân biệt hàng stock khô với hàng kết tủa ướt đã được bảo vệ; vẫn cần bước riêng để phân bổ lượng tiêu thụ giữa từng hạt khô/ướt cùng một hàng stock. Vì vậy tỷ lệ ướt điều chỉnh tốc độ tổng, chưa chứng minh chỉ hạt ướt co lại trong hỗn hợp nhiều hạt. Với replay tổng quát, lượng cân bằng của baseline vẫn là mốc tiến độ cũ; ràng buộc tiếp xúc chặn tiêu thụ stock khô, chưa tính lại mọi cân bằng đa pha theo từng hạt.

## Kiểm tra

`stock_liquid_contact.test.ts` bao phủ Zn/HCl, MnO₂/H₂O₂, Fe/CuSO₄, CaCO₃/HCl và NH₄NO₃ hòa tan; stock khô đứng yên, chạm dung dịch thì tiếp tục; diện tích ướt một phần; bố trí tĩnh; bình nghiêng; lớp hữu cơ; native pouring; parity thủ công/tự động cho lượng H₂O₂, nhiệt độ, tiến độ và khí; miễn điều kiện ngâm cho khí–rắn và nhiệt phân khô. Bộ test spill contact, khí và stock tự động bảo vệ các đường dùng chung sau khi tách hình học.
