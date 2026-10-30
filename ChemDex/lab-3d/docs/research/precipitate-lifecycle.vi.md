# Cơ chế và vòng đời kết tủa — kiểm tra 22/10/2026

## Phần đã triển khai

`PrecipitationSystem` giữ ba ngăn khối lượng: đang chờ hiển thị trong huyền phù, hạt đang hiển thị, cặn đáy. Khi hóa học thay đổi lượng chất rắn, tổng ba ngăn đi theo lượng đó. Hiệu ứng không tự tạo sản phẩm phản ứng.

- Tan một phần: giảm khối lượng từng hạt theo cùng tỷ lệ với lượng chất rắn còn lại; bán kính glyph giảm theo căn bậc ba tỷ lệ đó. Đây là xấp xỉ hạt có mật độ không đổi, không phải lời giải động học hòa tan từng mặt tinh thể.
- Tan hết: xóa cả hạt, cặn và độ đục.
- Khuấy: chuyển lượng hữu hạn từ cặn đáy về huyền phù. Hạt tái huyền phù xuất phát gần đáy; không xuất hiện lại ở mặt nước. Phần chưa hiển thị vẫn được tính trong tổng khối lượng.
- Cuốn cặn: dùng tỷ lệ `1-exp(-k*dt)`, `k=1.5*max(0,agitation-0.1)` khi còn chất lỏng. Hệ số là tham số minh họa, chưa phải tốc độ xói cặn đo trong phòng thí nghiệm. Bình khô không cuốn cặn vào huyền phù.
- Độ đục dùng tỷ lệ khối lượng còn lơ lửng, gồm cả phần chờ hiển thị. Số lượng glyph ở từng mức đồ họa không quyết định độ đục. Đây vẫn là chỉ số minh họa, chưa phải phép đo NTU hoặc mô hình tán xạ quang học.

## Đối chiếu từng phản ứng và việc còn thiếu

| Sản phẩm / phương trình ion rút gọn | Quan sát cần thể hiện | Trạng thái và bước còn thiếu |
|---|---|---|
| Ba²⁺ + SO₄²⁻ → BaSO₄(s) | Kết tủa trắng; màu dung dịch nền có thể vẫn xanh nếu còn ion đồng | Có profile trắng và vòng đời hữu hạn. Chưa hiệu chuẩn phân bố kích thước, tốc độ tạo mầm và lắng theo nồng độ. |
| Ag⁺ + Cl⁻ → AgCl(s) | Kết tủa trắng | Có profile bông trắng. Cần nối lịch sử chiếu sáng và cân bằng phức amoniac; không tự đổi màu hoặc tự tan chỉ vì thời gian chạy. |
| Pb²⁺ + 2I⁻ → PbI₂(s) | Kết tủa vàng; sau hòa tan nóng và làm nguội có tinh thể dạng phiến phản sáng | Hiện profile vẫn dùng tinh thể cho PbI₂ nói chung. Cần tách kết tủa ban đầu khỏi tái kết tinh và theo dõi lịch sử nhiệt; chưa thể gọi mọi PbI₂ là “mưa vàng”. |
| Cu²⁺ + 2OH⁻ → Cu(OH)₂(s) | Kết tủa xanh; dung dịch nền phải theo các chất còn hòa tan | Có profile xanh dạng bông. Chưa có mô hình mạng gel, kết bông hoặc phức chất đầy đủ cho mọi thuốc thử. |
| Fe³⁺ + 3OH⁻ → Fe(OH)₃(s) | Kết tủa nâu; không dùng màu xanh của Fe(II) | Có profile nâu và vòng đời hữu hạn. Mật độ/đóng gói của kết tủa hydrat thực chưa được hiệu chuẩn. |
| Ca²⁺ + CO₃²⁻ → CaCO₃(s) | Trắng; lượng cặn có thể giảm khi cân bằng carbonate thay đổi | Có mô hình cân bằng calcite riêng trong engine. Cần nối vận chuyển và hòa tan CO₂ khí, không dùng toàn bộ khí sinh ra như CO₂ đã hòa tan. |
| Cu(OH)₂ → CuO + H₂O | Biến đổi chất rắn khi gia nhiệt, cần khác với tạo kết tủa từ hai dung dịch | Có profile CuO đen; vẫn cần rà đường chuyển pha và động học riêng. Không xem đây là phản ứng kết tủa ion thông thường. |

## Nguồn đã tra và phạm vi sử dụng

- [University of Wisconsin — Aqueous Reactions: Copper(II) Sulfate](https://www2.chem.wisc.edu/deptfiles/genchem/lab/ccaold/main/cuso/page1.htm): quan sát BaSO₄ trắng trong dung dịch còn xanh nhạt; phân biệt màu pha rắn và dung dịch.
- [RSC — Testing salts for anions and cations](https://edu.rsc.org/experiments/testing-salts-for-anions-and-cations/464.article): màu kết tủa sulfate với barium và hydroxide của Cu(II), Fe(II), Fe(III).
- [UC San Diego — Precipitation of Lead Iodide Crystals](https://prod.chem.ucsd.edu/undergraduate/teaching-labs/demos/demo35.html): bản trích xuất tìm kiếm mô tả kết tinh khi nguội và tinh thể lớn hơn khi nguội chậm. Lần mở trực tiếp thất bại; chưa dùng các con số của trang để hiệu chỉnh động học.
- [RSC — Golden rain](https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article): tái kết tinh PbI₂ tạo các phiến lục giác vàng; không đồng nhất hiện tượng này với mọi kết tủa vàng.
- [Western University — Mystery Solutions](https://www.uwo.ca/sci/olympics/events/mystery_solutions.html): phân biệt AgCl trắng, AgBr màu kem và AgI vàng. Đây là các chất khác nhau; không nên suy ra công thức chỉ từ màu.

Các nguồn quan sát trên không xác nhận các hệ số lắng, kết bông, cuốn cặn hoặc kích thước hạt đang dùng. Những tham số ấy vẫn phải hiệu chuẩn hoặc gắn nhãn minh họa.

## Kiểm chứng

9 ca vòng đời mới kiểm tra cả bảy profile đang có: giảm bán kính khi tan, xóa hoàn toàn khi tan hết, bảo toàn khối lượng khi khuấy/cuốn cặn và độ đục không phụ thuộc ngân sách glyph. Bộ đầy đủ đạt 75 file / 1.022 ca trước bổ sung điều kiện ngăn cuốn cặn trong bình khô. TypeScript đạt. Kiểm tra GPU vẫn chưa có; không dùng các ca logic này làm bằng chứng hoàn tất hình ảnh từng phản ứng.
