# Kim loại–HCl: tiến triển lượng chất, điều kiện và hiệu ứng

## Nguồn và mức độ chứng minh

1. [NSTA, Lab 21 — Reaction Rates](https://static.nsta.org/extras/adi-chem/Lab21StudentHandout-ReactionRates.pdf): thí nghiệm Mg/HCl thay đổi nhiệt độ và nồng độ, theo dõi Mg còn lại hoặc H2 sinh ra. Tài liệu nêu phương trình Mg + 2HCl → MgCl2 + H2. Nguồn này chứng minh đối tượng quan sát và cách khảo sát; chưa cung cấp bộ thông số động học đã khớp cho ứng dụng.
2. [OpenStax Chemistry 2e, §12.2](https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates): xu hướng tốc độ phụ thuộc trạng thái chia nhỏ, tiếp xúc, nhiệt độ và nồng độ. Hệ số phương trình trong ứng dụng vẫn phải qua kiểm tra cân bằng độc lập; không sao chép máy móc chú thích hình.
3. [OpenStax Chemistry 2e, §9.2 — Ideal Gas Law](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law): dùng PV = nRT để đổi lưu lượng mol H2 thành lưu lượng thể tích ở nhiệt độ và áp suất mẫu. Khí lý tưởng là xấp xỉ của mô hình.
4. [RSC — The rate of reaction of magnesium with hydrochloric acid](https://edu.rsc.org/experiments/the-rate-of-reaction-of-magnesium-with-hydrochloric-acid/1916.article): kết quả tìm kiếm xác nhận có thí nghiệm quan sát khí và sự tự ấm lên. Lần mở toàn trang bị HTTP 405; không sử dụng trang này để khẳng định đã đọc đủ quy trình hoặc lấy hằng số tốc độ.

## Phương trình và kiểm kê

| Hệ | Phương trình phân tử | Ion rút gọn |
|---|---|---|
| Mg/HCl | Mg(s) + 2HCl(aq) → MgCl2(aq) + H2(g) | Mg(s) + 2H+(aq) → Mg2+(aq) + H2(g) |
| Zn/HCl | Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g) | Zn(s) + 2H+(aq) → Zn2+(aq) + H2(g) |
| Fe/HCl | Fe(s) + 2HCl(aq) → FeCl2(aq) + H2(g) | Fe(s) + 2H+(aq) → Fe2+(aq) + H2(g) |

Các phương trình này mô tả axit không oxi hóa. Không tự áp dụng chúng cho HNO3, H2SO4 đặc, hoặc hỗn hợp có chất oxi hóa/kim loại cạnh tranh. Nhánh mới chỉ nhận một kim loại và HCl có pha phù hợp, cùng dung môi, sản phẩm, NaCl/KCl hoặc lượng chỉ thị đã biết. Tổ hợp khác tiếp tục đi qua bộ giải hiện có; động học của chúng chưa được nâng cấp đầy đủ.

Trước khi thời gian chạy, chất phản ứng còn nguyên và chưa có H2 thoát ra hay nhiệt phản ứng được cộng. Với mức tiến triển p, số mol phản ứng là p × min(n_kim_loại, n_HCl/2). Từ đó trừ kim loại, trừ gấp đôi số mol HCl, tạo muối và H2. Phần kim loại dư còn lại khi axit hết. Nhiệt dùng bộ dữ liệu Hess đã đối chiếu và chỉ cộng phần nhiệt mới giữa hai bước.

Khí sinh ra trong bình mở được chuyển sang kho khí thoát hữu hạn; bình kín giữ khí và tính áp suất. Tua lại cùng mức tiến triển không cộng khí hoặc nhiệt lần thứ hai. Rót thêm hoặc chuyển aliquot bắt đầu từ lượng chất hiện có, không khôi phục kim loại đã phản ứng.

## Động học đang áp dụng

Đây là **mô hình tốc độ minh họa, chưa hiệu chuẩn thời gian thực nghiệm**. Thông báo phản ứng có ghi giới hạn này. Thời lượng tham chiếu lấy từ chương trình hiện có ở mốc 25 °C, 1 M HCl và 0,1 g kim loại; chúng chưa phải thời gian đo ngoài đời.

- Tốc độ dùng nồng độ HCl còn lại sau phần đã phản ứng, vì vậy giảm khi axit bị tiêu thụ; hệ số nồng độ tuyến tính là giả định mô hình, không suy ra từ hệ số phương trình.
- Zn/Fe dùng diện tích tương đối của hạt đặc co dần. Dải Mg dùng giả định diện tích mặt rộng gần như giữ nguyên trong quá trình mỏng đi. Hình học và kích thước mẫu thật chưa được đo để hiệu chuẩn.
- Nhiệt độ mẫu được đọc lại mỗi bước, gồm ảnh hưởng của môi trường, gia nhiệt, nhiệt phản ứng và tản nhiệt. Quy tắc Q10 = 2, giới hạn hệ số 0,05–16 là lựa chọn minh họa.
- Nghiền dùng hệ số 5 hiện có; khuấy dùng độ nhạy trong chương trình. Chúng biểu diễn xu hướng, chưa phải dữ liệu định lượng cho từng kích thước hạt hay tốc độ khuấy.
- Tích phân mức tiến triển dùng bước nhỏ; chỉ làm tròn phần cuối dưới 1e-8 của lượng giới hạn. Tạm dừng không tiêu thụ chất.

Chưa mô hình hóa đầy đủ: lớp oxit và giai đoạn cảm ứng, tạp chất/giao tiếp điện hóa, hoạt độ H+ ở nồng độ cao, giới hạn chuyển khối, bọt phủ bề mặt, độ nhám, hình học từng sợi/dải, hoặc thay đổi cơ chế theo nhiệt độ. Chưa áp dụng mô hình mới cho toàn bộ phản ứng dị thể trong danh mục.

## Hiệu ứng và kiểm chứng

Mg/Zn không còn bật sẵn màn khói H2, hơi trắng hoặc lớp bọt xà phòng. Nhiệt độ hiển thị của controller theo nhiệt độ mẫu; đã bỏ đường sin làm nóng giả. Controller nhận mức tiến triển và lưu lượng H2 từ nhánh kiểm kê, không tự kết thúc phản ứng theo đồng hồ riêng. Fe có controller H2 riêng dùng cùng giao diện lượng chất.

Lưu lượng thể tích khí phụ thuộc T và P theo khí lý tưởng. Một hạt nhìn thấy đại diện cho gói khí quy ước 0,05 mL; giới hạn 140/300 hạt mỗi giây phục vụ dựng hình. Kích thước và số hạt hiển thị chưa phải phép đo phân bố kích thước bọt thật. Lượng khí hóa học luôn lấy từ số mol phản ứng, độc lập với giới hạn số hạt vẽ.

Kiểm thử kiểm tra ba kim loại còn nguyên ở thời điểm bắt đầu; mức tiêu thụ 1:2; lượng H2 hữu hạn; kim loại dư; dấu nhiệt; phản ứng qua aliquot; tạm dừng; thay đổi nồng độ/nhiệt độ/khuấy/nghiền; tính nhất quán giữa bước thời gian; chặn tổ hợp oxi hóa/cạnh tranh; loại hiệu ứng hơi/khói/bọt mặc định; và đường thêm stock tới khi phản ứng hoàn tất. Kiểm tra controller đối chiếu lưu lượng với PV = nRT và sự thay đổi áp suất.

Kiểm chứng gần nhất: 66 tệp, 872/872 ca đạt; TypeScript đạt. Kiểm toán 145 chương trình: 0 lỗi cân bằng, 0 lỗi ion và 0 hiệu ứng khai báo sai sản phẩm. Trạng thái đối chiếu nhiệt vẫn là 57 có nguồn, 58 giá trị cũ cần rà soát và 30 mục thiếu. Kiểm tra hình ảnh trong trình duyệt chưa thực hiện thành công do cơ chế tự động đã từ chối mở trình duyệt ở đợt trước.
