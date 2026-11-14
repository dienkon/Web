# Rà soát điều kiện và giới hạn mô phỏng

Ngày rà soát: 14-11-2026. Danh sách đầy đủ nằm ở [audit 1.549 bản ghi, 25 nhóm](equations/README.md); JSON có cấu trúc ở [all-equations.json](equations/all-equations.json). Tổng gồm 1.300 mục tra cứu, 149 chương trình, 48 quy tắc native, 34 bài học và 18 nhánh suy diễn. Các nguồn có thể mô tả cùng một phản ứng.

## Điều kiện dùng chung

`reagentAvailability.ts` kiểm tra lượng mol hữu hạn, dương và vị trí chất. Chất ở `filter` hoặc `foam` không được dùng làm chất phản ứng/xúc tác ở khoang `bulk`. Kiểm kê vẫn giữ các chất này. Sản phẩm mới phải tạo/gộp vào hàng bulk, không tự thêm vào lượng đã lọc.

Pha từ `phase`, `state` cũ và nhãn công thức được chuẩn hóa. `solid`, `liquid`, `gas`, `aqueous` tương ứng `s`, `l`, `g`, `aq`; pha ghi rõ phải phù hợp với phản ứng. Bản ghi lịch sử thiếu pha còn dùng suy luận tương thích, nên không coi chúng là chứng cứ pha đã được đo.

Các quy tắc native có miền pha trong `nativeReagentPhases.ts`. Quy tắc dung dịch không được lấy HCl khí thay dung dịch HCl hay tự tạo kết tủa ngay từ hai muối khô. Khi thiếu đường hòa tan riêng, hệ thống giữ nguyên chất thay vì giả định chúng đã hòa tan. Miền này là phạm vi hỗ trợ của bộ giải, không phủ định mọi cơ chế khác ngoài thực nghiệm.

Bộ giải độ tan/cân bằng chỉ nhận kiểm kê bulk đã chuẩn hóa. Chất trên giấy lọc không làm bộ giải từ chối hỗn hợp rồi vô tình chuyển sang tính toàn bộ sản phẩm theo hệ số. Các ngưỡng quá bão hòa vẫn áp dụng cho mẫu rất loãng.

## Các trường hợp cần phân biệt

| Trường hợp | Yêu cầu và hiện tượng | Phạm vi xác nhận |
|---|---|---|
| NH3 + HCl | Pha khí tạo aerosol NH4Cl; hai dung dịch là nhánh axit–bazơ riêng | Kiểm tra pha và vị trí ở cả chương trình và native |
| Kim loại + HCl | Kim loại rắn tiếp xúc axit dung dịch; lượng khí theo chất giới hạn | Có planner tiến độ chung, ảnh hưởng diện tích/nhiệt/khuấy còn minh họa |
| Cu + HNO3 đặc | Đường riêng tạo NO2 nâu đỏ, dung dịch chứa Cu(II) | Nhận diện nhãn axit đặc; chưa hiệu chuẩn đường chuyển sản phẩm theo nồng độ liên tục |
| Cu + HNO3 loãng | Phải tách đường tạo NO với đường NO2; không suy thành H2 như axit không oxi hóa | Nhánh được khai báo riêng; không chứng nhận toàn bộ động học oxi hóa NO ngoài bình |
| Cu(II) + NH3 | Lượng keo và các phức 1–4 NH3 được giải cùng pH, hydrolysis, sulfate và Na/kiềm dư; axit có thể đảo chuyển cân bằng | Đã có [bộ giải thành phần và độ tan](copper-ammonia.vi.md); còn giới hạn hoạt độ, phức hydroxo–ammine hỗn hợp, phối tử khác và động học |
| Thử màu ngọn lửa | Cần nguồn kích thích đang cháy, còn nhiên liệu và tiếp xúc đúng mẫu | Auto kiểm tra liên tục; mất nguồn hủy lượt thử, không phát lại mẫu cũ khi bật lại |
| Mg đã mồi cháy | Sự cháy của mẫu khác với lửa của đèn; có thể tiếp tục khi mẫu còn phản ứng | Không dùng trạng thái bật/tắt đèn để tự dập sự cháy của Mg đã mồi |
| H2SO4 đặc + nước | Axit đặc là chất lỏng; tỏa nhiệt khi pha loãng, không tự đồng nhất với một vụ nổ hóa học | Nhãn nồng độ và pha phải được giữ đúng; nhiệt pha loãng còn mô hình đơn giản |

## Đối chiếu nguồn

- [OpenStax: các yếu tố ảnh hưởng tốc độ](https://openstax.org/books/chemistry-atoms-first-2e/pages/17-2-factors-affecting-reaction-rates): pha, diện tích tiếp xúc, nồng độ, nhiệt độ và xúc tác ảnh hưởng tốc độ. Nguồn này không cung cấp hằng số động học cho từng mẫu của ứng dụng.
- [RSC: cân bằng đồng(II)–ammonia](https://edu.rsc.org/experiments/an-equilibrium-using-copperii-and-ammonia/1711.article): kết tủa rồi tạo phức với NH3 dư là các cân bằng liên quan. Không đủ cơ sở coi tỉ lệ đúng bốn mol NH3/Cu là ngưỡng phổ quát tạo hoàn toàn phức.
- [UW–Madison: nitric acid tác dụng với đồng](https://demolab.chem.wisc.edu/types-of-chemical-reactions-nitric-acid-acts-on-copper/): axit nitric đặc tạo NO2 nâu đỏ và dung dịch xanh. Không dùng bằng chứng này để suy mọi nồng độ HNO3 cho cùng sản phẩm.
- [RSC: các phản ứng của nitrogen dioxide](https://edu.rsc.org/experiments/some-reactions-of-nitrogen-dioxide/533.article): cần phân biệt NO ban đầu và NO2 sau khi gặp không khí.
- [RSC: cách thực hiện thử màu ngọn lửa](https://edu.rsc.org/infographics/how-to-carry-out-flame-tests/4024075.article): màu đến từ các loài phát xạ được kích thích trong ngọn lửa. Hành vi hủy mẫu khi tắt đèn là quy ước trạng thái của ứng dụng, không phải số liệu thời gian phát quang đo được.

## Những phần chưa được xác nhận toàn bộ

Audit cân bằng nguyên tố/điện tích và kiểm thử phần mềm không thay cho hiệu chuẩn thực nghiệm. Chưa thể khẳng định mọi hỗn hợp tùy ý, thời gian phản ứng, nồng độ axit sau pha loãng, cân bằng phức chất, thụ động hóa bề mặt hoặc phản ứng khí ngoài bình đều được mô phỏng định lượng đúng.

Việc dùng chung kiểm tra điều kiện và ledger giúp thủ công/auto tuân cùng quy tắc trong miền hỗ trợ. Nhánh native còn có phản ứng tính ngay điểm cuối trước khi phát hiệu ứng; catalog tra cứu không tự trở thành 1.300 mô hình động học. Các phần này cần tiếp tục rà soát trước khi tuyên bố toàn bộ lab đã tương đương thực nghiệm.

## Xác nhận bản cập nhật

Mốc kiểm tra điều kiện: 3.145 kiểm thử trong 236 tệp đạt; audit hóa học kèm hiệu ứng vật lý đạt 149/149 chương trình, bảo toàn khối lượng và giữ nguyên bàn thủ công. [Báo cáo mốc cơ sở](../../artifacts/reagent-conditions/validation.json) dẫn các phép kiểm tra riêng.

Sau nâng cấp đồng–ammonia: 3.170 kiểm thử trong 237 tệp đạt, gồm toàn bộ danh mục auto. [Audit chuyên biệt](copper-ammonia.vi.md) có 96 tổ hợp thành phần/nhiệt, kiểm tra nguồn, phản ứng trong lúc rót và hiệu ứng vật lý của trường hợp thay đổi. Các số này xác nhận phần mềm trong các tình huống được thử, không xác nhận hiệu chuẩn thực nghiệm toàn bộ phản ứng.
